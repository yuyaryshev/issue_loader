import { awaitDelay, yconsole } from "Ystd";
import { issuesToJobs } from "../entry_scripts/run_scanForChangedIssueKeys";
import { GenericTestEnv, makeTestEnv, loadTestContext } from "./global_tests_env.test";
import { throwUnload } from "Yjob/JobType";
import { Job_transformIssue } from "job";
import { expect } from "chai";

describe(`global_tests`, function() {
    xit(`DATAMAP_5_issues - 01 CODE00000096`, async function() {
        try {
            // Jest doesn't know  this.timeout
            this.timeout(2000000000);
        } catch (e) {}
        let env: GenericTestEnv = undefined as any;

        try {
            const jql = `project = DATAMAP and issuekey < DATAMAP-6`;
            env = await makeTestEnv({ testName: "DATAMAP_5_issues" });

            const issueContextInputs = await env.jira.jqlGetIssueKeys(jql);
            await issuesToJobs(env as any, issueContextInputs);

            await awaitDelay(300);
            while (env.jobStorage.nonSuccededJobsCount()) await awaitDelay(10);
            await awaitDelay(100);
            while (env.jobStorage.nonSuccededJobsCount()) await awaitDelay(10);
            await awaitDelay(100);
            while (env.jobStorage.nonSuccededJobsCount()) await awaitDelay(10);

            yconsole.log("CODE00000221", `${env.testName}- TEST FINISHED!`);
            // TODO добавить проверку того что в итоге загрузилось.
        } finally {
            if (env) env.terminate();
        }
        // OK if no exceptions thrown
    });

    xit(`DATAMAP_full - 01 CODE00000106`, async function() {
        try {
            // Jest doesn't know this.timeout
            this.timeout(2000000000);
        } catch (e) {}

        let env: GenericTestEnv = undefined as any;

        try {
            const jql = `project = DATAMAP`;
            env = await makeTestEnv({ testName: "DATAMAP_full" });

            const issueContextInputs = await env.jira.jqlGetIssueKeys(jql);
            await issuesToJobs(env as any, issueContextInputs);

            await awaitDelay(300);
            while (env.jobStorage.nonSuccededJobsCount()) await awaitDelay(10);
            await awaitDelay(100);
            while (env.jobStorage.nonSuccededJobsCount()) await awaitDelay(10);
            await awaitDelay(100);
            while (env.jobStorage.nonSuccededJobsCount()) await awaitDelay(10);

            yconsole.log("CODE00000107", `${env.testName}- TEST FINISHED!`);
            // TODO добавить проверку того что в итоге загрузилось.
        } finally {
            if (env) env.terminate();
        }
        // OK if no exceptions thrown
    });

    xit(`DATAMAP_1 debuging`, async function() {
        try {
            // Jest doesn't know  this.timeout
            this.timeout(2000000000);
        } catch (e) {}
        let env: GenericTestEnv = undefined as any;

        try {
            const jql = `project = DATAMAP and issuekey = DATAMAP-1`;
            env = await makeTestEnv({ testName: "DATAMAP_1_issues" });

            const issueContextInputs = await env.jira.jqlGetIssueKeys(jql);
            await issuesToJobs(env as any, issueContextInputs);

            await awaitDelay(300);
            while (env.jobStorage.nonSuccededJobsCount()) await awaitDelay(10);
            await awaitDelay(100);
            while (env.jobStorage.nonSuccededJobsCount()) await awaitDelay(10);
            await awaitDelay(100);
            while (env.jobStorage.nonSuccededJobsCount()) await awaitDelay(10);

            yconsole.log("CODE00000222", `${env.testName}- TEST FINISHED!`);
            // TODO добавить проверку того что в итоге загрузилось.
        } finally {
            if (env) env.terminate();
        }
        // OK if no exceptions thrown
    });

    xit(`TRANSFORM - checking`, async function() {
        try {
            // Jest doesn't know  this.timeout
            this.timeout(2000000000);
        } catch (e) {}
        let env: GenericTestEnv = undefined as any;

        try {
            env = await makeTestEnv({ testName: "TRANSFORM" });
            let JSON_jobsById = {
                "815eef61-9387-4c3f-af07-011b60d1fbc1": {
                    jobType: "jiraIssue",
                    id: "815eef61-9387-4c3f-af07-011b60d1fbc1",
                    key: "jiraIssue",
                    cancelled: 0,
                    predecessorsDone: 1,
                    succeded: 1,
                    retryIntervalIndex: 0,
                    input: "{}",
                    prevResult:
                        '{"expand":"renderedFields,names,schema,operations,editmeta,changelog,versionedRepresentations","id":"918271","self":"http://jira.moscow.alfaintra.net/rest/api/2/issue/918271","key":"DATAMAP-145","fields":{"customfield_13580":null,"customfield_22176":null,"customfield_22175":null,"customfield_28280":null,"resolution":null,"customfield_28281":null,"customfield_25573":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/125208","value":"нет","id":"125208"},"customfield_25213":"S","customfield_27877":null,"customfield_27878":null,"customfield_20783":0,"lastViewed":null,"customfield_14781":null,"customfield_19670":null,"customfield_11272":null,"customfield_19672":null,"customfield_14784":null,"customfield_12484":null,"customfield_12483":0,"customfield_14785":null,"customfield_14782":0,"customfield_15878":null,"labels":["Разработка_Typescript"],"aggregatetimeoriginalestimate":28800,"customfield_27882":null,"customfield_27881":null,"customfield_25221":0,"customfield_29700":null,"customfield_29701":null,"issuelinks":[{"id":"773659","self":"http://jira.moscow.alfaintra.net/rest/api/2/issueLink/773659","type":{"id":"10470","name":"Включение","inward":"Включена в","outward":"Включает в себя","self":"http://jira.moscow.alfaintra.net/rest/api/2/issueLinkType/10470"},"inwardIssue":{"id":"904768","key":"DATAMAP-102","self":"http://jira.moscow.alfaintra.net/rest/api/2/issue/904768","fields":{"summary":"Отч BI / Issue_loader / DevOps","status":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/status/10106","description":"","iconUrl":"http://jira.moscow.alfaintra.net/images/icons/statuses/open.png","name":"TO DO","id":"10106","statusCategory":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/statuscategory/2","id":2,"key":"new","colorName":"blue-gray","name":"To Do"}},"priority":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/priority/3","iconUrl":"http://jira.moscow.alfaintra.net/images/icons/priorities/medium.svg","name":"Medium","id":"3"},"issuetype":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/issuetype/3","id":"3","description":"A task that needs to be done.","iconUrl":"http://jira.moscow.alfaintra.net/secure/viewavatar?size=xsmall&avatarId=13068&avatarType=issuetype","name":"Task","subtask":false,"avatarId":13068}}}}],"assignee":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/user?username=U_M11Y7","name":"U_M11Y7","key":"u_m11y7","emailAddress":"IAPonomarev@alfabank.ru","avatarUrls":{"48x48":"http://jira.moscow.alfaintra.net/secure/useravatar?avatarId=10172","24x24":"http://jira.moscow.alfaintra.net/secure/useravatar?size=small&avatarId=10172","16x16":"http://jira.moscow.alfaintra.net/secure/useravatar?size=xsmall&avatarId=10172","32x32":"http://jira.moscow.alfaintra.net/secure/useravatar?size=medium&avatarId=10172"},"displayName":"Пономарев Игорь Александрович","active":true,"timeZone":"Europe/Moscow"},"customfield_29704":null,"customfield_29705":null,"customfield_29702":null,"customfield_29703":null,"customfield_29708":null,"customfield_29709":null,"components":[],"customfield_29706":null,"customfield_29707":null,"customfield_18579":null,"customfield_25470":null,"customfield_25473":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/110661","value":"Не готов","id":"110661"},"customfield_29711":null,"customfield_29712":null,"customfield_29710":null,"customfield_25478":null,"customfield_25479":[],"customfield_29713":null,"customfield_29714":null,"customfield_17472":null,"customfield_21178":null,"customfield_21177":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/52159","value":"3","id":"52159"},"customfield_21176":null,"customfield_15177":null,"subtasks":[],"customfield_11371":null,"customfield_11370":null,"reporter":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/user?username=U_M12YK","name":"U_M12YK","key":"u_m12yk","emailAddress":"YYaryshev@alfabank.ru","avatarUrls":{"48x48":"http://jira.moscow.alfaintra.net/secure/useravatar?ownerId=u_m12yk&avatarId=32054","24x24":"http://jira.moscow.alfaintra.net/secure/useravatar?size=small&ownerId=u_m12yk&avatarId=32054","16x16":"http://jira.moscow.alfaintra.net/secure/useravatar?size=xsmall&ownerId=u_m12yk&avatarId=32054","32x32":"http://jira.moscow.alfaintra.net/secure/useravatar?size=medium&ownerId=u_m12yk&avatarId=32054"},"displayName":"Ярышев Юрий Александрович","active":true,"timeZone":"Europe/Moscow"},"customfield_13797":null,"customfield_24270":null,"customfield_25480":null,"customfield_28871":null,"customfield_24271":null,"customfield_25481":null,"customfield_25482":null,"customfield_24272":"","customfield_25483":null,"customfield_26573":"44.0","customfield_28870":null,"customfield_26575":"51.0","customfield_26574":"47.0","progress":{"progress":0,"total":28800,"percent":0},"votes":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/issue/DATAMAP-145/votes","votes":0,"hasVoted":false},"worklog":{"startAt":0,"maxResults":20,"total":0,"worklogs":[]},"issuetype":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/issuetype/3","id":"3","description":"A task that needs to be done.","iconUrl":"http://jira.moscow.alfaintra.net/secure/viewavatar?size=xsmall&avatarId=13068&avatarType=issuetype","name":"Task","subtask":false,"avatarId":13068},"customfield_22373":null,"customfield_18671":null,"customfield_14872":null,"project":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/project/27280","id":"27280","key":"DATAMAP","name":"Карта данных","projectTypeKey":"software","avatarUrls":{"48x48":"http://jira.moscow.alfaintra.net/secure/projectavatar?pid=27280&avatarId=13080","24x24":"http://jira.moscow.alfaintra.net/secure/projectavatar?size=small&pid=27280&avatarId=13080","16x16":"http://jira.moscow.alfaintra.net/secure/projectavatar?size=xsmall&pid=27280&avatarId=13080","32x32":"http://jira.moscow.alfaintra.net/secure/projectavatar?size=medium&pid=27280&avatarId=13080"}},"customfield_14871":null,"customfield_12576":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/12650","value":"Рубль","id":"12650"},"customfield_12578":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/12652","value":"Штат","id":"12652"},"resolutiondate":null,"customfield_25375":null,"customfield_25376":null,"customfield_25377":null,"customfield_25378":null,"customfield_25379":null,"customfield_17571":null,"customfield_15271":null,"customfield_19872":null,"customfield_17570":null,"watches":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/issue/DATAMAP-145/watchers","watchCount":1,"isWatching":false},"customfield_15270":null,"customfield_21275":null,"customfield_17575":null,"customfield_10261":null,"customfield_13771":null,"customfield_13770":null,"customfield_17577":null,"customfield_17576":null,"customfield_25380":null,"customfield_24170":"0","updated":"2020-03-19T11:14:51.000+0300","customfield_18771":null,"customfield_25704":null,"customfield_14170":[{"self":"http://jira.moscow.alfaintra.net/rest/api/2/user?username=U_M12YK","name":"U_M12YK","key":"u_m12yk","emailAddress":"YYaryshev@alfabank.ru","avatarUrls":{"48x48":"http://jira.moscow.alfaintra.net/secure/useravatar?ownerId=u_m12yk&avatarId=32054","24x24":"http://jira.moscow.alfaintra.net/secure/useravatar?size=small&ownerId=u_m12yk&avatarId=32054","16x16":"http://jira.moscow.alfaintra.net/secure/useravatar?size=xsmall&ownerId=u_m12yk&avatarId=32054","32x32":"http://jira.moscow.alfaintra.net/secure/useravatar?size=medium&ownerId=u_m12yk&avatarId=32054"},"displayName":"Ярышев Юрий Александрович","active":true,"timeZone":"Europe/Moscow"}],"customfield_25705":null,"customfield_25706":null,"customfield_25707":null,"customfield_25708":null,"customfield_25709":null,"timeoriginalestimate":28800,"customfield_10371":null,"customfield_11582":"2|i0964f:","customfield_14971":null,"customfield_10372":null,"customfield_21380":null,"description":"Настроить eslint на проекте и встроить его в процесс.","customfield_10374":"9223372036854775807","customfield_10375":null,"customfield_10376":null,"customfield_10135":null,"customfield_29070":null,"timetracking":{"originalEstimate":"1d","remainingEstimate":"1d","originalEstimateSeconds":28800,"remainingEstimateSeconds":28800},"customfield_24980":"[{\\"description\\":\\"Написан код\\",\\"checked\\":false},{\\"description\\":\\"Пройдено code review\\",\\"checked\\":false},{\\"description\\":\\"Написаны Unit-тесты\\",\\"checked\\":false},{\\"description\\":\\"Написаны интеграционные тесты\\",\\"checked\\":false},{\\"description\\":\\"Протестировано разработчиком\\",\\"checked\\":false},{\\"description\\":\\"Раскатана нужная ветка\\",\\"checked\\":false},{\\"description\\":\\"Собрана версия из мастера\\",\\"checked\\":false},{\\"description\\":\\"Нет блокирующих и critical дефектов\\",\\"checked\\":false},{\\"description\\":\\"Смёржено в мастер\\",\\"checked\\":false},{\\"description\\":\\"Собрана сборка из мастера\\",\\"checked\\":false},{\\"description\\":\\"Успешно протестировано по готовой тестовой модели\\",\\"checked\\":false},{\\"description\\":\\"Техническое тестирование пройдено\\",\\"checked\\":false},{\\"description\\":\\"Выполнены все пререквизиты\\",\\"checked\\":false}]","customfield_23770":null,"customfield_25710":null,"customfield_25711":null,"customfield_25712":null,"customfield_21378":null,"summary":"Настроить eslint ","customfield_17670":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/17546","value":"Разное","id":"17546"},"customfield_25713":null,"customfield_21377":null,"customfield_25714":null,"customfield_21376":null,"customfield_25715":null,"customfield_21375":null,"customfield_25717":null,"customfield_21374":null,"customfield_25718":null,"customfield_21373":null,"customfield_25719":null,"customfield_21372":null,"customfield_11573":null,"customfield_11572":null,"customfield_10000":null,"customfield_13873":null,"customfield_11689":null,"customfield_11688":null,"environment":null,"duedate":null,"customfield_24076":null,"comment":{"comments":[],"maxResults":0,"total":0,"startAt":0},"customfield_25720":null,"customfield_25721":null,"customfield_25722":null,"customfield_25723":null,"customfield_14270":null,"customfield_18870":null,"customfield_16570":null,"customfield_18871":null,"customfield_18872":null,"customfield_18873":null,"customfield_16572":null,"customfield_16571":null,"customfield_13980":null,"customfield_13982":null,"customfield_10472":null,"fixVersions":[],"customfield_11682":null,"customfield_10473":null,"customfield_18874":null,"customfield_18875":null,"customfield_11687":null,"customfield_11686":null,"customfield_29770":null,"customfield_25171":"[{\\"description\\":\\"Ответ на вопрос, зачем мы делаем эту задачу\\",\\"checked\\":false},{\\"description\\":\\"Контакты заказчиков и лиц с экспертизой\\",\\"checked\\":false},{\\"description\\":\\"Бизнес-требования\\",\\"checked\\":false},{\\"description\\":\\"Сроки\\",\\"checked\\":false}]","customfield_25172":"[{\\"description\\":\\"Макет и текстовки готовы в разных разрешениях\\",\\"checked\\":false},{\\"description\\":\\"В макете дизайн только изменяемой фичи\\",\\"checked\\":false},{\\"description\\":\\"Добавлены экспортируемые картинки\\",\\"checked\\":false},{\\"description\\":\\"Прописан контракт в user-story\\",\\"checked\\":false},{\\"description\\":\\"Зафиксированы бизнес-требования\\",\\"checked\\":false}]","customfield_25173":"[{\\"description\\":\\"Написан код\\",\\"checked\\":false},{\\"description\\":\\"Пройдено code review\\",\\"checked\\":false},{\\"description\\":\\"Написаны Unit-тесты\\",\\"checked\\":false},{\\"description\\":\\"Написаны интеграционные тесты\\",\\"checked\\":false},{\\"description\\":\\"Протестировано разработчиком\\",\\"checked\\":false},{\\"description\\":\\"Раскатана нужная ветка\\",\\"checked\\":false},{\\"description\\":\\"Собрана версия из мастера\\",\\"checked\\":false},{\\"description\\":\\"Нет блокирующих и critical дефектов\\",\\"checked\\":false},{\\"description\\":\\"Смёржено в мастер\\",\\"checked\\":false},{\\"description\\":\\"Собрана сборка из мастера\\",\\"checked\\":false},{\\"description\\":\\"Успешно протестировано по готовой тестовой модели\\",\\"checked\\":false},{\\"description\\":\\"Техническое тестирование пройдено\\",\\"checked\\":false},{\\"description\\":\\"Выполнены все пререквизиты\\",\\"checked\\":false}]","customfield_29771":null,"customfield_27476":[{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/183748","value":"Large","id":"183748"}],"customfield_24882":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/88408","value":"Нет","id":"88408"},"customfield_25179":null,"customfield_21471":null,"customfield_21470":null,"customfield_19276":null,"customfield_15472":null,"customfield_11670":null,"customfield_11672":null,"customfield_11671":null,"customfield_13973":null,"priority":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/priority/3","iconUrl":"http://jira.moscow.alfaintra.net/images/icons/priorities/medium.svg","name":"Medium","id":"3"},"customfield_26272":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/150666","value":"JS","id":"150666"},"customfield_26271":null,"timeestimate":28800,"versions":[],"customfield_19270":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/19248","value":"9","id":"19248"},"status":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/status/10106","description":"","iconUrl":"http://jira.moscow.alfaintra.net/images/icons/statuses/open.png","name":"TO DO","id":"10106","statusCategory":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/statuscategory/2","id":2,"key":"new","colorName":"blue-gray","name":"To Do"}},"customfield_18970":null,"customfield_12071":null,"customfield_12070":null,"customfield_12073":null,"customfield_12072":null,"customfield_12074":null,"customfield_10570":null,"customfield_12870":null,"customfield_10212":null,"customfield_25071":0,"customfield_29674":null,"aggregatetimeestimate":28800,"customfield_29675":null,"customfield_29672":null,"customfield_23570":null,"customfield_29673":null,"customfield_29678":null,"customfield_29679":null,"customfield_29676":null,"customfield_29677":null,"customfield_21577":null,"customfield_17076":null,"customfield_21575":null,"customfield_21574":null,"creator":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/user?username=U_M12YK","name":"U_M12YK","key":"u_m12yk","emailAddress":"YYaryshev@alfabank.ru","avatarUrls":{"48x48":"http://jira.moscow.alfaintra.net/secure/useravatar?ownerId=u_m12yk&avatarId=32054","24x24":"http://jira.moscow.alfaintra.net/secure/useravatar?size=small&ownerId=u_m12yk&avatarId=32054","16x16":"http://jira.moscow.alfaintra.net/secure/useravatar?size=xsmall&ownerId=u_m12yk&avatarId=32054","32x32":"http://jira.moscow.alfaintra.net/secure/useravatar?size=medium&ownerId=u_m12yk&avatarId=32054"},"displayName":"Ярышев Юрий Александрович","active":true,"timeZone":"Europe/Moscow"},"customfield_17077":null,"customfield_16780":null,"customfield_17990":null,"customfield_11771":null,"customfield_11770":null,"aggregateprogress":{"progress":0,"total":28800,"percent":0},"customfield_13710":null,"customfield_10797":null,"customfield_11887":null,"customfield_29681":null,"customfield_11888":null,"customfield_29680":null,"customfield_29685":null,"customfield_29686":null,"customfield_24670":null,"customfield_29684":null,"customfield_29689":null,"customfield_29687":null,"customfield_24674":null,"customfield_29688":null,"customfield_18278":null,"customfield_20471":null,"timespent":null,"customfield_10790":null,"customfield_11881":null,"customfield_10791":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/10959","value":"Отображать","id":"10959"},"customfield_12970":null,"customfield_11880":null,"aggregatetimespent":null,"customfield_17989":null,"customfield_10795":null,"customfield_13820":null,"customfield_29692":null,"customfield_29571":null,"customfield_27270":null,"customfield_29693":null,"customfield_29690":null,"customfield_29691":null,"customfield_29696":null,"customfield_29697":null,"customfield_29694":null,"customfield_29695":null,"workratio":0,"customfield_29698":null,"customfield_29699":null,"customfield_21675":null,"customfield_15671":null,"created":"2020-03-19T11:14:51.000+0300","customfield_23171":null,"customfield_13376":null,"customfield_11993":null,"customfield_11986":0,"customfield_10775":"2020-03-19","customfield_11985":null,"customfield_24571":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/78043","value":"Не определено","id":"78043"},"customfield_24572":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/78046","value":"Не определено","id":"78046"},"customfield_24573":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/78047","value":"Нет","id":"78047"},"customfield_11980":null,"customfield_10770":null,"customfield_16872":null,"customfield_11982":null,"customfield_11981":null,"customfield_11976":null,"customfield_11979":null,"attachment":[],"customfield_19575":null,"customfield_13470":["Не_нарушен"],"customfield_19572":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/customFieldOption/19547","value":"N/A","id":"19547"},"customfield_10883":"участвует","customfield_24470":null,"customfield_24473":null,"customfield_24474":null,"customfield_24475":null,"customfield_24476":null,"customfield_25205":null},"changelog":{"startAt":0,"maxResults":1,"total":1,"histories":[{"id":"8059815","author":{"self":"http://jira.moscow.alfaintra.net/rest/api/2/user?username=U_M12YK","name":"U_M12YK","key":"u_m12yk","emailAddress":"YYaryshev@alfabank.ru","avatarUrls":{"48x48":"http://jira.moscow.alfaintra.net/secure/useravatar?ownerId=u_m12yk&avatarId=32054","24x24":"http://jira.moscow.alfaintra.net/secure/useravatar?size=small&ownerId=u_m12yk&avatarId=32054","16x16":"http://jira.moscow.alfaintra.net/secure/useravatar?size=xsmall&ownerId=u_m12yk&avatarId=32054","32x32":"http://jira.moscow.alfaintra.net/secure/useravatar?size=medium&ownerId=u_m12yk&avatarId=32054"},"displayName":"Ярышев Юрий Александрович","active":true,"timeZone":"Europe/Moscow"},"created":"2020-03-19T11:14:51.000+0300","items":[{"field":"Link","fieldtype":"jira","from":null,"fromString":null,"to":"DATAMAP-102","toString":"This issue Включена в DATAMAP-102"}]}]},"ts":"2020-04-02T11:09:09+03:00","type":"issue"}',
                    paused: 0,
                    state: "succeded",
                },
                "2a0db7ce-2a39-4ace-b5e3-2018325b756e": {
                    jobType: "jiraComments",
                    id: "2a0db7ce-2a39-4ace-b5e3-2018325b756e",
                    key: "jiraComments",
                    cancelled: 0,
                    predecessorsDone: 1,
                    succeded: 1,
                    retryIntervalIndex: 0,
                    input: "{}",
                    prevResult: '{"type":"JiraComments","comments":[]}',
                    paused: 0,
                    state: "succeded",
                },
                "7fbeb70d-46c4-4223-8ee1-8ebec06f0c50": {
                    jobType: "jiraWorklog",
                    id: "7fbeb70d-46c4-4223-8ee1-8ebec06f0c50",
                    key: "jiraWorklog",
                    cancelled: 0,
                    predecessorsDone: 1,
                    succeded: 1,
                    retryIntervalIndex: 0,
                    input: "{}",
                    prevResult: '{"type":"JiraWorklog","worklogs":[]}',
                    paused: 0,
                    state: "succeded",
                },
            };

            loadTestContext(env, JSON_jobsById);
            const r = await throwUnload(
                Job_transformIssue.runWait(
                    env.jobStorage,
                    undefined,
                    {
                        project: "DATAMAP",
                        issueKey: "DATAMAP-145",
                        updated: "2020-03-19T11:14:51.000+0300",
                    },
                    false,
                    {}
                )
            );

            expect(r).to.deep.equal({
                issues: [
                    {
                        ID: "918271",
                        assignee: "u_m11y7",
                        created: "2020-03-19T11:14:51.000+0300",
                        creator: "u_m12yk",
                        duedate: null,
                        issuekey: "DATAMAP-145",
                        issuetype: "Task",
                        lastViewed: null,
                        project: "DATAMAP",
                        reporter: "u_m12yk",
                        resolutiondate: null,
                        status: "TO DO",
                        summary: "Настроить eslint ",
                        timeestimate: 28800,
                        timeoriginalestimate: 28800,
                        updated: "2020-03-19T11:14:51.000+0300",
                    },
                ],
                changelogs: [
                    {
                        AUTHOR: "u_m12yk",
                        FIELD: "Link",
                        FIELDTYPE: "jira",
                        FROM_STRING: null,
                        FROM_V: null,
                        ID: "8059815",
                        ISSUEKEY: "DATAMAP-145",
                        TO_STRING: "This issue Включена в DATAMAP-102",
                        TO_V: "DATAMAP-102",
                        TS: "2020-03-19T11:14:51.000+0300",
                    },
                ],
                links: [
                    {
                        ID: "773659",
                        INWARDISSUE: "DATAMAP-102",
                        ISSUEKEY: "DATAMAP-145",
                        OUTWARDISSUE: undefined,
                        TYPEID: "10470",
                    },
                ],
                comments: [],
                labels: [],
                users: [],
                worklogs: [],
            });
        } finally {
            if (env) env.terminate();
        }
        // OK if no exceptions thrown
    });

    xit(`ts test`, async function() {
        /*use it for ts checking and never commit*/

        let obrect = { self: "ya", id: 1 };
        //console.log(" _ " + obrect + obrect.self + (obrect.aa ? 1 : 2));
    });
});
