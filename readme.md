# Назначение и верхнеуровневая архитектура

Данная программа предназначена для репликации данных о инцидентах и TimeSheet из Jira в Oracle. Она написана на Typescript и для работы требует Node.js

Она подключается к Jira по REST API и запрашивает оттуда данные, затем к Oracle - через Oracle Client и сохраняет туда загруженные данные.

Загрузка производится каждые 10 секунд. Поддерживается инкрементальная загрузка в которой загружаются только измененные инциденты.

# Термины

issue - "людская" задача - хранящаяся в Jira
job - "программная" задача, - набор действий которые должна осуществить программа Issue loader

## Загружаемые данные

-   Задачи (issue, Инциденты), - все поля включая custom
-   История изменения задач
-   Связи задач
-   Поля (метаданные о полях)
-   Комментарии
-   Пользователи
-   Затраченное время (Worklog)

Данные о задачах загружаются в виде таблицы, в которой каждая колонка соответствует полю Jira.
Имя поля определяется настроечной таблицей, хранимой в Oracle.

## Архитектура

Загрузка данных из Jira состоит из нескольких циклических подпроцессов описанных ниже.
Все эти процессы стартуют при запуске сервиса issue_loader.
Такой подход позволяет сделать сервис устойчевым к сборям, поскольку сервис может быть перезапущен в любой момент без существенного ущерба не только для данных, но и для производительности.

1. Создание списка загружаемых issue. Этот процесс бывает двух видов

    - Опрос изменений - это циклический процесс, который регулярно отправляет в Jira JQL "project = ? and updated > LAST_POLL".
    - Инициализирующая загрузка - однократно отправляет в JQL "project = ?"
    - В обоих случаях:
        - Загружаются только id задач.
        - Может потребоваться несколько запросов, в случае если ответ не вмещается в один Page (в терминах Jira)
        - Для каждого id порожденного таким образом создаются задачи на загрузку разного вида данных:
            - Job: Загрузить из Jira issue с данным id
            - Job: Загрузить из Jira историю изменений по issue с данным id
            - Job: Загрузить из Jira комментарии по issue с данным id
            - Job: Загрузить из Jira связи по issue с данным id
            - и т.п. - по всем видам задач "Job: Загрузить из Jira"
        - Все эти Job сохраняются в техническую таблицу jira_job

2. Обработка "Job: Загрузить из Jira \*"

    - Циклический процесс регулярно просматривает таблицу jira_job и забирает из нее первые N задач
        - Этот процесс запускается при появлении хотя бы одного "Job: Загрузить из Jira \*"
        - При отсутствии "Job: Загрузить из Jira \*" - процесс ставится на паузу
    - Задачи выполняются - отправляется один или несколько запросов в Jira
    - В случае если задача выполнена успешно, она удаляется из jira_job, а полученные данные - сохраняются в кеш json данных.
    - В момент сохранения неструктурированных данных они сравниваются с предыдущей версией данных.
    - В случае отличия данных от старой версии - создается "Job: Записать в БД \*" (таблица db_job)

3. Обработка "Job: Записать в БД \*"
    - Циклический процесс регулярно просматривает таблицу db_job и забирает из нее первые N задач
        - Этот процесс запускается при появлении более чем 1000 (параметр) однотипных задач "Job: Записать в БД _", ИЛИ в случае если есть нет ни одной задачи "Job: Загрузить из Jira _" но есть хотя бы одна задача "Job: Записать в БД \*"
        - Процесс ставиться на паузу в противном случае
    - Задача выполняется на БД
    - В случае успешного выполнения задачи - она удаляется из списка задач

Дополнительные требования:

-   Количество одновременно исполняемых задач Jira должно быть ограничено параметром
-   Процесс выполнения всех Job и изменения их статусов - логируется
-   Процесс загрузки любого Job должен быть запускаем автономно от всех остальных задач, - необходимо для эффективного дебага механизмов загрузки
-   issue_loader запущенный с ключем "rebuild" пересоздает целевую таблицу загрузки issue и перезагружает в нее данные из кеша неструктурированных данных. Формат целевой таблицы определяется настроечной таблицей, в которой описывается как именно следует назвать колонку с тем или иным полем из Jira. Данный механизм загрузки полезен
    -   Для дозагрузки тех полей, которые ранее не загружались
    -   Для исправления программных ошибок
    -   Данный процесс реализуется путем создания "Job: Записать в БД \*". Job'ы сортируются по приоритету, больший приоритет получают Job'ы с большим issue.updated.
    -   Создаваемые таким образом задачи имеют меньший приоритет исполнения чем задачи создаваемые при инкрементальной загрузке, таким образом этим задачи не оказывают влияния на производительность инкремента и не вызывают его отставания.

---

# Руководство администратора

## Основные правила использования

-   Никогда не редактируйте и не изменяйте таблиц `dont_touch__*` - см. [Зачем нужны dont_touch таблицы](#Зачем-нужны-dont_touch-таблицы)

## Настройка кастомных полей

Для добавления(удаления) кастомных полей к таблице ISSUE_T необходимо:

-   update JIRA_FIELD_T set CUSTOM_ID=xxx, TARGET_NAME=ID, LOAD_FLAG=xy where ID='customfield_xxxxx'
    , где
    xxx - какой то номер, например 99(???)
    Если для поля придумано более подобающее имя, то ID аменить на 'подходящее\*имя'
    customfield_xxxxx - необходимое поле (из jira)
    xy - 'N' или 'Y'
-   запустить deploy
    Если необходимы поля во все задачи:
-   перезапустить все проекты из кеша (для более новых из jira)

## Установка

-   Для установки требуются права администратора
-   Установите **Node.js** - с внутреннего портала Альфа-банка или из интернета
-   Настройте локальный репозиторий пакетов Альфа-банка для **Node.js**:

          npm config set registry http://mvn/artifactory/api/npm/npmjs

-   В папке программы запустите **`npm i`** для автоматического развертывания папки **_node_modules_**

## Настройка pm2 - постоянного мониторинга

-   Документация по pm2: https://pm2.keymetrics.io/
-   Документация по pm2-logrotate: https://www.npmjs.com/package/pm2-logrotate

*   Для постоянной работы установить глобально и рекомендуется использовать пакет **pm2**, он настраивается так:

    -   Выполните `npm i pm2 -g`

    -   Установите модуль ротации логов и настройте его командами.

        pm2 install pm2-logrotate
        pm2 set pm2-logrotate:max_size 100K
        pm2 set pm2-logrotate:compress true
        pm2 set pm2-logrotate:retain 30
        pm2 set pm2-logrotate:rotateInterval '0 0 \* \* \*'

    -   Установить авторестарт после reboot'а
        pm2 startup
        pm2 logrotate

    -   Для Windows дополнительно нужно сделать следующее:

        -   Откройте переменные среды (**`Win+Pause-break / Дополнительные параметры системы/ Переменные среды`**)
        -   Удостоверьтесь в **`PATH`** есть **`C:\Users\::Имя_Пользователя::\AppData\Roaming\npm`**
        -   Добавьте **`PM2_HOME`** равной **`c:\etc\.pm2`**

                  mkdir c:\etc
                  mkdir c:\etc\.pm2
                  pm2-service-install -n PM2

    -   И для Windows и для Linux требуется добавить issue_loader в список мониторинга pm2

              pm2 start ecosystem.config.js
              pm2 save

-   Все настройки необходимо ввести в файле **`settings.json`**. Пример настроек - см в **`settings_example.json`**

## Запуск, остановка, перезапуск

-   Если используется **pm2** (см), то запуск осуществляется автоматически при старте системы
    -   Запуск **`pm2 start issue_loader`**
    -   Остановка **`pm2 stop issue_loader`**
    -   Перезапуск **`pm2 restart issue_loader`**
    -   Более детально - см документацию pm2 на официальном сайте
-   Для запуска без pm2 выполните в коммандной строке **`npm start`**

## Мониторинг и управление

В случае если в файле **`settings.json`** задан **`monitorEndpointPort`**, то консоль мониторинга и управления доступна через браузер по данному порту. Данные в консоли обновляются автоматически. Если данные мониторинга требуются для машинной обработки - они доступны в формате JSON по адресу **`/api/runStatus`**. Счетчики загрузок расчитываются с момента запуска сервера и в кратные интервалы времени - каждые 10 минут и раз в сутки в 00:00.

## Удаленная отладка

Node.js дает возможность отлаживать приложения удаленно. То есть при необходимости можно подключить debugger прямо на среду теста или продуктива и воспользоваться всеми возможностями отладчика и IDE.
Для того чтобы начать удаленную отладку нужно выполнить в консоли:

Запуск в режиме отладки **без остановки перед стартом** самого приложения
В этом режиме приложение сразу стартует, но вы не сможете отладить ошибку которая возникает в момент старта приложения.

    node --inspect=host:port ./ts_out/src/start.js

Запуск в режиме отладки **с остановкой перед стартом** самого приложения.
Этот режим наиболее удобен чтобы понять почему программа не запускается или работает некорректно сразу после запуска.
Соответственно чтобы программа выполнялась, в дебагере нужно снять ее с паузы.

    node --inspect-brk=host:port ./ts_out/src/start.js

В качестве host нужно задать публичный ip адрес системы (тот что **ifconfig**).
Допустим только ip адрес, с именем хоста работать не будет.
Порт по умолчанию - 9229, если меняете его, то не забудьте изменить его и в IDE.

В результате запуска вы увидите строку вида:

    Debugger listening on ws://127.0.0.1:9229/ef05d860-7ff6-4370-8f16-4acda8e1b1aa

Этот адрес нужно вписать в ваш IDE.

==============================================================================================================================

# Все что ниже - очень сырое. Читать нет большого смысла

==============================================================================================================================

# Руководство разработчика

В качестве средства редактирования исходников рекомендуется использовать бесплатный **`Visual Studio Code`** или платный **`WebStorm`**

## Структура исходников

    -   dbDomains - описание доменов хранимых в Oracle
    -   entry_scripts - входные скрипты - то что вызывается из main.ts
    -   job - описание job'ов данного приложения
    -   monitor_ui - папка с UI мониторинга
    -   other - прочие скрипты - то, что я пока не знаю куда положить.
    -   tmp - всякие временные скрипты. Не учатсвуют в основной работе прилоежния, но используются для дебага

    На "Y" начинаются библиотеки. В них общие функции для какой-то цели, реализации логики загрузки в них быть не должно.
    -   Yjira - библиотека для работы с Jira
    -   Yjob - библиотека для работы с Job'ами
    -   Yoracle - библиотека для доступа в Oracle
    -   YpermanentVault - библиотека для хранения key-value в sqlite [Не используется на данный момент]
    -   YsqlLog - библиотека для логирования в sqlite
    -   Ystd - библиотека со всякими мелкими функциями
    -   main.ts - точка входа

// TODO TBD Структура исходников

### **`TBD Структура исходников - JSON api`**

// TODO deploySchema.ts - функции генерации схемы БД
// TODO Migration.ts - позволяет изменять состав загружаемых полей.
Как использовать: - Измените поля
// TODO loadJiraFields.ts - загрузка данных о полях из Jira, - обновление в БД Oracle jira_fields

// TODO loadJiraIssues.ts - загрузка данных о инцидентах из Jira, - обновление в БД Oracle jira_issue и jira_worklog
В процессе загрузки для трансляций используется информация о полях - из current_jira_issue оттуда берется тип и название поля в таблице current_jira_issue), поэтому
в начале загрузки

cycle_http_call.ts - тестовый скрипт, в загрузке не используется. Содержит скрипт который циклически дергает заданный http адрес.
deploy_schema.ts

## Зачем нужны dont_touch таблицы

-   Эти таблицы содержат копии метаданных необходимые для корректной загрузки.
-   Их удаление или изменение сделают невозможным повторный запуск сервера загрузки.
-   Если вам зачем-то потребовались текущие метаданные от загрузки - читать их можно и нужно из таблиц dont_touch\_\_\*
-   Данные таблицы изменяются при выполнении migrate

# Задачи

-   Порядок вызовов
    -   run
        -   Запись в ISSUE_LOADER_STREAMS
        -   Записать в JIRA_ISSUE_JSON
        -   Записать в JIRA_ISSUE
    -   prepareLoadJiraIssues - создает функции загрузки
    -   prepareLoadJiraIssues.worker - записывает данные в oracle

# Процесс обработки изменений Issue Jira

    - Когда поступает новое изменение
        - Записываем в issueCache
        - Сразу трансформируем его и записываем в JIRA_ISSUE
    - При необходимости перезагрузки уже загруженных
        - Без кеша
            - Просто сбрасываем все счетчики и грузим с самого начала
        - По кешу
            - Считаем что в issueCache уже все есть
            - Не используем никакие очереди, вместо это тупо Runtime - ЦИКЛОМ обходим ВСЕ записи в issueCache
                - И тут же пишем в JIRA_ISSUE

# Полезные ссылки

# Таблицы в базах Sqlite

## База stg

В этой базе хранится текущее состояние job и текущее состояние загруженных issue
jobContexts - контексты задач (1 контекст на 1 issue)
jobs - задачи, которые выполняют некие задачи (загрузка, трансформация, выгрузка)
для наполнения Oracle базы задачами из Jira
jobResult - результаты Джобов

/_ DEPRICATED
db_job - job'ы записи в Oracle
jira_job - job'ы чтения из Jira
issue_current - текущее состояние загруженных issue - то есть последний ответ Jira на запрос issue
transformed_issue_current - текущее состояние загруженных и трансформированных в формат Oracle issue - то есть последний ответ Jira на запрос issue, который прошел трансформацию
load_streams - пока не используется
worklog - текущее состояние загруженных worklog - то есть последний ответ Jira на запрос worklog
_/

## База log

В этой базе хранятся логи
generic_log - журнал событий приложения вцелом. job'ы сюда не логируются
job_log - журнал событий в связанных с исполнением job'ов

## База history

История изменений данных jira

issue_history - история изменений issue jira, - то есть все ответы которая давала jira на запрос issue

# Jira REST API

Версия Jira Альфа-банка:
https://docs.atlassian.com/software/jira/docs/api/REST/7.12.3/
https://docs.atlassian.com/software/jira/docs/api/REST/8.5.3/

Облачная версия:
https://developer.atlassian.com/cloud/jira/platform/rest/v3/
оставил ссылку в качестве истории, не стоит ее использовать в разработке, но быть готовым архитектурно, что API в будущем вероятно станет вот таким

# Доработка PermaTasks

## Названия таблиц:

    - LINK_T - связи задач Jira
    - LINK_TYPE_SDIM - типы link'ов
    - BITEAM_MANUAL - ручной справочник внештатных сотрудников BI
    - FIELD_OPTIONS_SDIM - спра
    - LABEL_T - ассоциатор меток

## Скрипты полезные в разработке:

        update bireport_test_stg.load_stream_t set enabled = 'Y', last_updated_ts = null where id in ('DATAMAP');
        commit;
        select * from bireport_test_stg.load_stream_t

        -- create table job_backup as select * from job;
        -- create table job_backup2 as select * from job;

        delete from job where 1= 1;
        insert into job select * from job_backup;
        select * from job where '081f1761-f0d2-41bb-88a3-fe677704c715' in (id, parent);

## Job'ы v3

Проблемы Job:

    - Нет правил удаления Job, поэтому singletonJob да и вообще Job копятся бесконечно
    - Большой key из-за input у transform Job - Мы копируем ВСЕ данные из jiraIssue.result в transformJob.input
    - Зависимости Job'ов не сохраняются
    - Все Job'ы всегда в оперативке. Если их будет слишком много - будет беда.
    - refreshJob создается снова и снова, а нужно сделать чтобы его key = {type : "refreshJob, input: void}

====================================
Использовать сериализатор и декораторы
https://www.npmjs.com/package/serializr - Для сохранения в БД - Для отправки на клиент - Для получения на клиенте

Job - задачи - ПРИ СТАРТЕ JOB

        - Job.run вызов других childJob из данной Job
            - Должен проходить через JobContext. Результат вызова должен сохраняться в нем.
            - Если childJob в состоянии done, то реального вызова не должно быть - нужно просто взять результат прямо из контекста.

        - При запуске Job проверять limit по макс maxRunningTasks - по типу и по JobStorage

        - // TODO создание job с parent'ом - нужно поместить его в deps
            deps[sourceJob] = sourceJob.ready
            sourceJob.observers += job

            !job[jobId].ready, то
                - или ждем в await
                - или, если одновременно ожидающих задач слишком много, то throw DependencyError();
                    DependencyError - не является ошибкой, это просто способ выгрузить задачу из памяти
                - При уходе в ожидание - ведем счетчик ожидающих задач в jobStorage

        - job.deps пересоздаются при перезапуске job, они определяются списоком sourceJob, которые он вызывает в процессе исполнения
        - При добавлении Job запускать его после проверки условий условию
            // TODO JobType.run При добавлении Job запускать его после проверки условий условию

    - ПРИ ВЫЗОВЕ ДОЧЕРНЕГО JOB
        await childJob.result()
        НЕ ДОЛЖЕН падать когда-либо.
        Вместо этого вечно перезапускается дочерний Job.

    - ПРИ ЗАВЕРШЕНИИ JOB
        + Job.run должен возвращать Promise<Result>
        - После завершения job обойти все observers и сделать
            if(job.result !== job.prevResult)
                observerJob.ready = false;           //
            observerJob.deps[job] = true;        // то есть true
        - Если не осталось observerJob.deps с false, то
            observerJob - выполнить
        - Когда у job меняется ready, то проходим по observers и обновляем JobContext этих Job ов - удаляем из него sourceJob

    - ПРИ СТАРТЕ JobStorage
        - При старте JobStorage c autoStartExistingJobs=true сканировать имеющиеся Job'ы
            // TODO JobStorage.startExistingJobs При старте JobStorage c autoStartExistingJobs=true сканировать имеющиеся Job'ы и запускать их по условию

    - РЕГУЛЯРНО В JobStorage
        - scheduledTs - дата и время следующего запуска job, - по сути это способ сбросить ready флаг по времени
        - Декларативный подход. Запускаются все Job, которые
                !ready && среди deps нет false      // Выполнение если еще не выполнено
            ||  error && now() <= nextRetryTs       // Повтор Job при ошибке
            ||  now() <= scheduledTs                // Повтор Job по времени
            То есть Job.run - выполняется автоматом со стороны JobStorage.

    - ВНУТРИ КОНКРЕТНЫХ ТИПОВ JOB'ОВ
        - Убрать из Job.transform большой input, оставить только ключ task'а
        - Задачи загрузки из Jira будут вызывать из задач transform

    - [КОГДА БУДУТ ЯСНЫ ДЕЙСТВИЯ С Job] Добавить в сериализацию Job'ов.
        ? Сделать их отдельными таблицами?
        this.deps = {};
        this.observers = [];

Job
id - суррогатный ключ
key - уникальный ключ job'а

        ready: boolean          // Это !stale
        deps: {[key:Job]: boolean}
        observers: Job[]

    1. Декларативный подход. Запускаются все Job, которые

            !ready && среди deps нет false      // Выполнение если еще не выполнено
        ||  error && now() <= nextRetryTs       // Повтор Job при ошибке
        ||  now() <= scheduledTs                // Повтор Job по времени

        То есть Job.run - выполняется автоматом со стороны JobStorage.

    +2. Если в процессе выполнения job вызывает другие sourceJob, то
        deps[sourceJob] = sourceJob.ready
        sourceJob.observers += job

        !job[jobId].ready, то
            - или ждем в await
            - или, если одновременно ожидающих задач слишком много, то throw DependencyError();
                DependencyError - не является ошибкой, это просто способ выгрузить задачу из памяти
            - При уходе в ожидание - ведем счетчик ожидающих задач в jobStorage

    +3. После завершения job обойти все observers и сделать
        observerJob.deps[job] = job.ready // то есть true

    +4. Если не осталось observerJob.deps с false, то
        observerJob - выполнить

    +5. Не нужно хранить больщие input в ключе, вместо этого там будет только {type:transform, issueid:123456}
        Можно и нужно уметь брать result других задач - просто вызывая их.

        +Таким образом задачи загрузки из Jira будут вызываться из transform

    +6. Вызов других sourceJob из данного job должны проходить через JobContext и сохраняться в нем
    +7. Когда у job меняется ready, то проходим по observers и обновляем JobContext этих Job ов - удаляем из него sourceJob
    +8. job.deps пересоздаются при перезапуске job, они определяются списоком sourceJob, которые он вызывает в процессе исполнения
    +9. scheduledTs - дата и время следующего запуска job, - по сути это способ сбросить ready флаг по времени

---

ВОПРОСЫ

    - Garbage-collection - как удаляются Job'ы которые никто более не вызвает?
        - Можно их не удалять, а просто делать Stale
        - Можно удалять те, у которых нет observers
        - ? Обдумать это еще раз и убрать этот пункт

----------------------- Задачи в рамках issue_loader -----------------------

10. Нужен список всех Job'ов по issue и общий статус по ним

---

Задачи появившиеся в процессе реализации текущей задачи
src\Yjob\todo.txt

## Иерархичный статус Job и Context

Статус как-бы иерархический: stage \ state \ currentJob.waitingType \ currentJob.currentStep

-   stage - это
    -   01_jira
    -   02_transform
    -   03_db
    -   99_succeded
-   state - внутри stage он может быть разный, он определяется Job'ом который выполняется или следующим, который будет выполняться
    -   running
    -   waitingTime
    -   waitingDeps
    -   paused и т.п
-   Внутри state === running могуть быть разные jobStep
-   Каждому jobStep может соответствовать свой waitingType

# Links родители и дочьки

Нужно просто помнить, что в LINK_T поля имеют значения
OUTWARDISSUE - ребенок
INWARDISSUE - родитель

Соответсвенно, LINK_T имеет такого типа строки:
ISSUEKEY(ребенок) OUTWARDISSUE(null) INWARDISSUE(родитель)
ISSUEKEY(родитель) OUTWARDISSUE(ребенок) INWARDISSUE(null)

## Автогенерация задач

Создавая задачи с типом (ISSUETYPE), пренадлежащим TASK_TEMPLATE_T, и имеющие поле (JIRAFIELD)
и соответсвующее значение (VALUEOF_JIRAFIELD) - будут сгенерированы задачи,
входящие в шаблон (TEMPLATE_ISSUEKEY), имеющий включенный флаг (GENERATED_FLAG). Поля будут наследоватся от
связки ISSUE_LAYOUT_MAP_T и FIELD_CONFIGURATION_T.

Далее реализована такая логика:
1)Берутся поля с шаблона, и если в созданной задаче некоторых не хвататет - то
берутся шаблоннные поля.
2)Дочерние задачи (если такие есть у шаблона), создаются с помощью кода OUTPUT*CODE взятого с
таблицы FIELD_CONFIGURATION_T.
*Оболочка кода\_:
Собирается код по кусочкам из FIELD_CONFIGURATION_T, где в OUTPUT_CODE:

-   oraRow (задача шаблона(или подзадачи шаблона) взятого с ISSUE_T)
    , для доступа к любому полю введи 'oraRow.ANY_FIELD' (поля всегда в верхнем регистре)
-   transform (обработанная информация созданной вручную задачи)
    , для доступа к полям issue введи 'transformed.any_field' (регистр совпадает с регистром JIRA_FIELD_T)

Пример строки OUTPUT_CODE для ID='project'':
'{ "key": \${oraRow.PROJECT} }'

ЧТО НУЖНО ДЛЯ ГЕНЕРАЦИИ ЗАДАЧ ПО НОВОМУ ШАБЛОНУ:
1)Необходимо добавить строчку в TASK_TEMPLATE_T, где:
-PROJECT (проект на котором будут генерироватся новые задачи)
-ISSUETYPE (тип issue на котором будут генерироватся новые задачи)
-LAYOUT_ID (id макета, про него будет написано дальше)
-JIRAFIELD (поле-метка, по которому можно также выбрать отдельный шаблон
(т.е. более 1 шаблона на связку проект/тип issue), JIRAFIELD может принимать null значение для дефолтного шаблона)
-VALUEOF_JIRAFIELD (значение поля-метки, по которому можно также выбрать отдельный шаблон
(если выбрано JIRAFIELD, то должно осуществлятся полное соответсвие значения созданной задачей с этим полем))
-TEMPLATE_ISSUEKEY (issuekey - номер задачи в jira, который является шаблоном)
-GENERATED_FLAG (флаг, определяющий генерацию, если Y - то данный шаблон может взятся для генерации)
2)Необходимо добавить строчки ISSUE_LAYOUT_MAP_T, на каждое наследуемое поле, где:
-LAYOUT_ID (id макета, связан с TASK_TEMPLATE_T)
-ISSUETYPE (тип задачи, поля привязываются к ISSUETYPE)
-FIELD_ID (id поля, у одного поля могут быть разные реализации наследования, поэтому идентифицируется по id)
-USE_CREATING (флаг, определяющий необходимые поля для созданных задач,
если Y - то поле используется при создании задачи, если N - то при редактировании задачи)
P.S. не нужно добавлять project и issuetype - они добавляются программой и соответсвуют шаблону.
3)Необходимо для каждой строчки из предыдущего пункта (ISSUE_LAYOUT_MAP_T) иметь по одному полю в
таблице FIELD_CONFIGURATION_T, где:
-FIELD_ID (id поля, номер его конкретной реализации)
-FIELD_NAME (имя поля, берется его "аккуратное" имя - TARGET_NAME из JIRA_FIELD_T)
-OUTPUT_CODE (код, описывающий реализацию наследования, правила вставки кода описаны выше)

## Автоперевод статуса "Ожидание пререквизитов" -> "В очереди" (и наоборот)

Если у задачи статус "Ожидание пререквизитов", то ведется поиск по ее дочерним задачам,
все дочерние задачи помещаются в таблицу(дочерних задач).
если все дочерние со статусом "Завершена" (или не найдено дочерних задач),
то меняем статус родителя на "В очереди",
если часть (или все) дочерних задач не имеют статус "Завершена", то ничего не делаем.

Каждый раз проверяем у задачи статус и сверяем его с таблицой(дочерних задач),
если задача меняет статус на "Завершена"

## Автоматическое наследование полей

Есть таблица FIELDS_INHERITANCE_T, в которой лежат:

-   проекты
-   типы issue
-   названия полей
-   код, который ведет изменение в жире (писать в форме `{"name":"${transform.reporter}"}`,
    где transform-объект из полей задачи-родителя)
    По данным этой таблице программа распознает какие родительские поля и с помощью какого кода,
    должны быть переданы значения полей всем дочерним задачам

## GIT guide

http://confluence.moscow.alfaintra.net/pages/viewpage.action?pageId=363735602
--look at .bat

## При пересборке node_modules

    1)copy_sqlite_package.bat    -- дописать
    2)имеется файл \jira-connector\index.js   --на тот момент 507 строчка
     заменить body.join('') на Buffer.concat(body).toString(), без этого исправления
     в редких случаях ломается кодировка.

## Функции и возможности UI

В UI есть несколько вкладок:
-Issues
-Jobs
-Logs
-Project Stats
-JobStats
-Run Issues
-SQL

Описание вкладок:
Issues) 'Устарело' - показывало состояние контекстов задач
Jobs) 'Устарело' - показывало состояние джобов
Logs) показывает логи задач
показывает список логов из 100 записей.
По умолчанию выбран простой режим (последние 100 записей в логах)
Можно выбрать расширенный режим, он будет обращатся к базе по указанному фильтру.
Если необходимо обновить содержание логов до актуального - необходимо нажать на кнопочку обновления
Project Stats) показывает состояние загрузки по проектам
так же имеется 3 вспомогательных графика:
-скорость загрузок данного типа задач в сутки / текущее время
-(пока не работает) ресурсы / текущее время
-(пока не работает) чтото / текущее время
JobStats) 'Устарело' - показывало состояние загрузки по проектам
Run Issues) Запускает задачи и проекты
Можно выбрать тип запускаемых объектов и режим запуска.
При "догрузке" - аккуратный режим, который не трогает уже запущенные issue, а запускает не активные
При "запуске с кеша" - жира не запрашивается - данные берутся из локальной базы,
этот режим используется для перезапука задач/проектов для пополнения полями
(в конечной оракловой таблице лежат не все поля, иногда эта таблица будет расширятся,
что может потребовать актуализации)
При "запуске с жиры" - идет полная перезагрузка issue
SQL) Осуществляет доступ к локальной базе SQLite
Можно выполнять любые dml запросы, ddl - не стоит выполнять
