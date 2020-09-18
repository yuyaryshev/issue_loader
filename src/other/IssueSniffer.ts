import { Job } from "Yjob";
import { OracleConnection0 } from "Yoracle";
import { Env } from "other";

/*
  просматривает завершенные задачи и делает разные вещи с жирой
  (автогенерация задач,
   обновление статусов в зависимости от состояния дочерних задач и т.д.)
 */
export class IssueSniffer {
    async processingInheritance(job: Job, transformed: any) {
        // если в FIELDS_INHERITANCE_T есть поля удовлетворяющие собранным данным, то
        // обновляем все дочернии задачи, выставляя им эти поля

        let pthis = this;
        let parent_issuekey = transformed.issues[0].issuekey;
        let parent_issuetype = transformed.issues[0].issuetype;
        let parent_project = transformed.issues[0].project;
        let chieldsArray: [] = transformed.parentAndChields.chieldIssueKeys.slice();
        let env = job.jobStorage.env;
        let transform = transformed.issues[0];

        try {
            await job.jobStorage.env.dbProvider(async function (db: OracleConnection0) {
                let r: any = await db.execute(
                    `select FI.field ora_field, JF.ID jira_field, FI.output_code output_code from FIELDS_INHERITANCE_T  FI
                    join JIRA_FIELD_T JF on JF.target_name=FI.field
                    where FI.project='${parent_project}' and FI.issuetype='${parent_issuetype}'`,
                    []
                );

                if (r.rows && r.rows.length) {
                    let parameters: any = { fields: {} };
                    for (let field of r.rows) {
                        if (field.OUTPUT_CODE[1] == "{") {
                            let resultEval = JSON.parse(await eval(field.OUTPUT_CODE));
                            if (resultEval && resultEval != "null") {
                                parameters.fields[field.JIRA_FIELD] = resultEval;
                            }
                        } else {
                            let resultEval = await eval(field.OUTPUT_CODE);
                            if (resultEval && resultEval != "null") {
                                parameters.fields[field.JIRA_FIELD] = resultEval;
                            }
                        }
                    }
                    for (let issuekey of chieldsArray) {
                        //грубое обновление
                        await pthis.updateIssue(env, parameters, issuekey, []);
                    }
                }
            });
        } catch (e) {}
    }

    async processingPrerequisiteParent(job: Job, transformed: any) {
        // если текущий статус "ожидает пререквезитов" и дочерние "Завершена" - то меняем статус, если не все "Завершена"
        // то добавляем их в таблицу подписок, при их изменении отлавливаем, все ли поменяли  статус на "Завершена", если все,
        // то меняем статус родителя

        let parent_issuekey = transformed.issues[0].issuekey;
        let parent_status = transformed.issues[0].status;
        let chieldsArray: [] = transformed.parentAndChields.chieldIssueKeys.slice();
        let parentOfParent = transformed.parentAndChields.parentIssueKey;
        let foundedChileds: any = [];

        // если задача чем то не угождает, то выходим
        if (transformed.parentAndChields.parentIssueKey === "ERROR_WE_HAVE_TWO_OR_MORE_PARENTS") return;
        if (!transformed.parentAndChields.chieldIssueKeys.length) return;

        // собираем статусы в jobStorage - %пока не реализовано(вероятность ошибки мала?)%

        // собираем статусы в логах
        await job.jobStorage.env.dbProvider(async function (db: OracleConnection0) {
            let r: any = await db.execute(
                `select issuekey, status from 
(select issuekey,status, row_z, max(row_z) OVER (PARTITION BY issuekey) max_row_z from 
(select IL.issuekey, IL.status,IL.ts, max(ts) OVER (PARTITION BY issuekey) max_ts_z, ROW_NUMBER () OVER (ORDER BY issuekey) row_z from ISSUE_T_LOG IL where issuekey in (${chieldsArray
                    .map((a) => "'" + a + "'")
                    .join(",")}))
where ts=max_ts_z) where max_row_z=row_z`,
                []
            );
            if (r.rows && r.rows.length) {
                for (let oraRow of r.rows) {
                    for (let i = 0; i <= chieldsArray.length; i++) {
                        if (chieldsArray[i] == oraRow.ISSUEKEY) {
                            foundedChileds.push({ issuekey: chieldsArray[i], status: oraRow.STATUS });
                            chieldsArray.splice(i, 1);
                            break;
                        }
                    }
                }
            }

            if (chieldsArray.length) {
                // собираем статусы в финальной таблице
                r = await db.execute(
                    `select issuekey, status from ISSUE_T where VTO=3e14 and issuekey in (${chieldsArray
                        .map((a) => "'" + a + "'")
                        .join(",")})`,
                    []
                );
                if (r.rows && r.rows.length) {
                    for (let oraRow of r.rows) {
                        for (let i = 0; i <= chieldsArray.length; i++) {
                            if (chieldsArray[i] == oraRow.ISSUEKEY) {
                                foundedChileds.push({ issuekey: chieldsArray[i], status: oraRow.STATUS });
                                chieldsArray.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }

            // создаем список детей и  их статусов

            // не даем перезаписать то, что уже было
            r = await db.execute(
                `select issuekey from ISSUE_CHILDS_T_LOG where PARENT_ISSUEKEY= '${parent_issuekey}'`,
                []
            );
            let existingChields = [];
            if (r.rows && r.rows.length) {
                for (let oraRow of r.rows) {
                    existingChields.push(oraRow.ISSUEKEY);
                }
            }

            // подготавливаем массив объектов
            let oraChildsArray: any = [];
            outer: for (let i of chieldsArray) {
                for (let chield of existingChields) {
                    if (chield == i) {
                        continue outer;
                    }
                }
                oraChildsArray.push({ ISSUEKEY: i, PARENT_ISSUEKEY: parent_issuekey, STATUS: undefined });
            }

            outer: for (let i of foundedChileds) {
                for (let chield of existingChields) {
                    if (chield == i.issuekey) {
                        continue outer;
                    }
                }
                oraChildsArray.push({ ISSUEKEY: i.issuekey, PARENT_ISSUEKEY: parent_issuekey, STATUS: i.status });
            }

            // записываем статусы в оракл
            let inserting_code = `INTO ISSUE_CHILDS_T_LOG(ISSUEKEY, PARENT_ISSUEKEY, STATUS) VALUES 
            ('${parent_issuekey}',${parentOfParent ? "'" + parentOfParent + "'" : "null"},'${parent_status}')`;
            // @ts-ignore
            inserting_code += oraChildsArray
                .map(
                    // @ts-ignore
                    (a) => `INTO ISSUE_CHILDS_T_LOG(ISSUEKEY, PARENT_ISSUEKEY, STATUS) VALUES ( 
                            '${a.ISSUEKEY}',
                            '${a.PARENT_ISSUEKEY}',
                            ${a.STATUS ? "'" + a.STATUS + "'" : "null"}
                            )`
                )
                .join(" ");

            let parentOfParentCondition = parentOfParent ? " ='" + parentOfParent + "'" : " is null";
            r = await db.execute(
                `delete from ISSUE_CHILDS_T_LOG  where (parent_issuekey = '${parent_issuekey}'
                and issuekey not in (${(transformed.parentAndChields.chieldIssueKeys as [])
                    .map((a) => "'" + a + "'")
                    .join(",")}))
                or (issuekey='${parent_issuekey}' and parent_issuekey ${parentOfParentCondition})`,
                []
            );
            /*
            delete from ISSUE_CHILDS_T_LOG  where parent_issuekey = '${parent_issuekey}'
                and not in (${(transformed.parentAndChields.chieldIssueKeys as []).map((a) => "'" + a + "'").join(",")})
             */

            r = await db.execute(
                `INSERT ALL
             ${inserting_code}
            SELECT * FROM dual`,
                []
            );

            r = await db.commit();
        });

        // обновляем если статус должен изменится
    }

    async processingUpdateStatus(job: Job, transformed: any) {
        // если у ряда задач изменился статус, что создает условия для изменения статуса родителя - то изменить статус родителя онлайн!

        let issuekey = transformed.issues[0].issuekey;
        let status = transformed.issues[0].status;
        let parent_issuekey = transformed.parentAndChields.parentIssueKey;
        let needToSwapStatus = false;
        let env = job.jobStorage.env;
        let pthis = this;

        await job.jobStorage.env.dbProvider(async function (db: OracleConnection0) {
            let r: any = await db.execute(
                `select issuekey, status from ISSUE_CHILDS_T_LOG where issuekey='${issuekey}'`,
                []
            );
            // если не поменялся статус, то выходим
            if (r.rows && r.rows.length) {
                for (let oraRow of r.rows) {
                    if (status != oraRow.STATUS) {
                        //обновляем статус
                        let r0: any = await db.execute(
                            `update ISSUE_CHILDS_T_LOG set status='${status}' where issuekey='${issuekey}'`,
                            []
                        );
                        r0 = await db.commit();
                        needToSwapStatus = true;
                    }
                    // если мы родитель(а нас интересуют только состояние в этих статусах), и нам нужно сменить статус - то меняем
                    if (status == "Ожидание пререквизита" || status == "В очереди") {
                        //проверяем все статусы
                        let r2: any = await db.execute(
                            `select issuekey, status from ISSUE_CHILDS_T_LOG where parent_issuekey='${issuekey}'`,
                            []
                        );
                        if (r2.rows && r2.rows.length) {
                            let need_to_prereq = false;
                            let need_to_inqueue = false;
                            for (let chield of r2.rows) {
                                if (chield.STATUS == "Завершена") need_to_inqueue = true;
                                else need_to_prereq = true;
                            }
                            if (status == "Ожидание пререквизита") {
                                if (need_to_inqueue && !need_to_prereq) {
                                    console.log("МЕНЯЕМ НА 'В очереди'");
                                    pthis.transitionIssue(
                                        env,
                                        { issueKey: issuekey, transition: { id: "161" } },
                                        issuekey
                                    );
                                    let r0: any = await db.execute(
                                        `update ISSUE_CHILDS_T_LOG set status='В очереди' where issuekey='${issuekey}'`,
                                        []
                                    );
                                    r0 = await db.commit();
                                }
                            } else if (status == "В очереди") {
                                if (need_to_prereq) {
                                    console.log("МЕНЯЕМ НА 'Ожидание пререквизита'");
                                    pthis.transitionIssue(
                                        env,
                                        { issueKey: issuekey, transition: { id: "41" } },
                                        issuekey
                                    );
                                    let r0: any = await db.execute(
                                        `update ISSUE_CHILDS_T_LOG set status='Ожидание пререквизита' where issuekey='${issuekey}'`,
                                        []
                                    );
                                    r0 = await db.commit();
                                }
                            }
                        }
                    }
                }
            } else {
                return;
            }

            // если мы дочка, и родителю нужно изменить статус - то меняем
            if (parent_issuekey === "ERROR_WE_HAVE_TWO_OR_MORE_PARENTS" || !parent_issuekey || !needToSwapStatus)
                return;
            r = await db.execute(
                `select ch.issuekey, ch.status, pp.status parent_status from ISSUE_CHILDS_T_LOG ch 
                join ISSUE_CHILDS_T_LOG pp on pp.issuekey='${parent_issuekey}'
                 where ch.parent_issuekey='${parent_issuekey}'`,
                []
            );
            if (r.rows && r.rows.length) {
                let parent_status = r.rows[0].PARENT_STATUS;
                if (!(parent_status == "Ожидание пререквизита" || parent_status == "В очереди")) {
                    return;
                }
                let need_to_prereq = false;
                let need_to_inqueue = false;
                for (let oraRow of r.rows) {
                    if (oraRow.STATUS == "Завершена") need_to_inqueue = true;
                    else need_to_prereq = true;
                }
                if (parent_status == "Ожидание пререквизита") {
                    if (need_to_inqueue && !need_to_prereq) {
                        console.log("МЕНЯЕМ НА 'В очереди'"); //12409
                        pthis.transitionIssue(
                            env,
                            { issueKey: parent_issuekey, transition: { id: "161" } },
                            parent_issuekey
                        );
                        let r0: any = await db.execute(
                            `update ISSUE_CHILDS_T_LOG set status='В очереди' where issuekey='${parent_issuekey}'`,
                            []
                        );
                        r0 = await db.commit();
                    }
                } else if (parent_status == "В очереди") {
                    if (need_to_prereq) {
                        console.log("МЕНЯЕМ НА 'Ожидание пререквизита'");
                        pthis.transitionIssue(
                            env,
                            { issueKey: parent_issuekey, transition: { id: "41" } },
                            parent_issuekey
                        );
                        let r0: any = await db.execute(
                            `update ISSUE_CHILDS_T_LOG set status='Ожидание пререквизита' where issuekey='${parent_issuekey}'`,
                            []
                        );
                        r0 = await db.commit();
                    }
                }
            }
        });
    }

    async processingNewIssue(job: Job, transformed: any) {
        //Обновляем текущую (новую) задачу в Жире и создаем дочерние задачи там же (если тип связан в TASK_TEMPLATE_T)
        let pthis = this;
        let transformedCopy = Object.assign({}, transformed);
        let issue = transformed.issues[0];
        let issueType = issue.issuetype;
        let issueProject = issue.project;
        let issueKey = issue.issuekey;
        let env = job.jobStorage.env;
        let result: any;

        await job.jobStorage.env.dbProvider(async function (db: OracleConnection0) {
            let r: any = await db.execute(
                `select * from TASK_TEMPLATE_T where issuetype='${issueType}' and project='${issueProject}' and GENERATED_FLAG='Y'`,
                []
            );
            if (r.rows && r.rows.length) {
                result = Object.assign({}, r);
            }
        });
        if (result.rows && result.rows.length) {
            // бежим по результатам и сравниваем с текущим полем
            let default_TEMPLATE_ISSUEKEY;
            let TEMPLATE_ISSUEKEY;
            let LAYOUT_ID;
            let default_LAYOUT_ID;
            try {
                for (let currRow of result.rows) {
                    if (!currRow.JIRAFIELD) {
                        default_TEMPLATE_ISSUEKEY = currRow.TEMPLATE_ISSUEKEY;
                        default_LAYOUT_ID = currRow.default_LAYOUT_ID;
                    } else if (eval(`!!issue.${currRow.JIRAFIELD}`)) {
                        if (eval(`issue.${currRow.JIRAFIELD}=='${currRow.VALUEOF_JIRAFIELD}'`)) {
                            if (TEMPLATE_ISSUEKEY) {
                                env.jobStorage.my_console.log(
                                    `CODE00000212`,
                                    `Для задачи ${issueKey} генерация предотвращена, проверте уникальность шаблонов в TASK_TEMPLATE_T`
                                );
                                return;
                            }
                            TEMPLATE_ISSUEKEY = currRow.TEMPLATE_ISSUEKEY;
                            LAYOUT_ID = currRow.LAYOUT_ID;
                        }
                    }
                }
                if (!TEMPLATE_ISSUEKEY) {
                    if (default_TEMPLATE_ISSUEKEY) {
                        TEMPLATE_ISSUEKEY = default_TEMPLATE_ISSUEKEY;
                        LAYOUT_ID = default_LAYOUT_ID;
                    } else {
                        env.jobStorage.my_console.log(
                            `CODE00000297`,
                            `Для задачи ${issueKey} генерация предотвращена, не найдены шаблоны в TASK_TEMPLATE_T`
                        );
                        return;
                    }
                }
            } catch (e) {
                env.jobStorage.my_console.log(
                    `CODE00000264`,
                    `Для задачи ${issueKey} генерация предотвращена, проверте корректность шаблонов в TASK_TEMPLATE_T`
                );
                return;
            }
            let issue_layout = await pthis.getIssueLayout(LAYOUT_ID, env);
            if (!issue_layout) {
                env.jobStorage.my_console.log(
                    `CODE00000373`,
                    `Для задачи ${issueKey} генерация предотвращена, проверте корректность полей в FIELD_CONFIGURATION_T`
                );
                return;
            }
            env.jobStorage.my_console.log(`CODE00000271`, `НАЧИНАЕМ ГЕНЕРАЦИЮ - ${issueKey}`);
            let params = await pthis.getParamsForUpdate(env, transformedCopy, TEMPLATE_ISSUEKEY, LAYOUT_ID);
            pthis.createChields(env, transformedCopy, issue_layout, issueKey, TEMPLATE_ISSUEKEY, params.params, [], []);
        }
    }

    async getIssueLayout(id: any, env: Env) {
        let result: any;
        try {
            await env.dbProvider(async function (db: OracleConnection0) {
                let layout_array_map = new Map();
                let layout_map = new Map();
                //let layout_creating_array =[];
                //let layout_editing_array =[];

                // берем поля в массив
                let r: any = await db.execute(
                    `
                select ilam.ISSUETYPE, ilam.USE_CREATING, fc.FIELD_NAME, fc.OUTPUT_CODE, jf.ID from ISSUE_LAYOUT_MAP_T ilam
                join FIELD_CONFIGURATION_T fc 
                    on ilam.FIELD_ID=fc.FIELD_ID 
                join JIRA_FIELD_T jf
                    on fc.FIELD_NAME=jf.TARGET_NAME and jf.LOAD_FLAG='Y' 
                where ilam.LAYOUT_ID=${id}`,
                    []
                );
                if (r.rows && r.rows.length) {
                    //layout_creating_array.push('"project": {"key":transform.project}');
                    //layout_creating_array.push('"issuetype": {"name":transform.issuetype}');

                    for (let row of r.rows) {
                        let localObj = layout_array_map.get(row.ISSUETYPE);
                        if (!localObj) {
                            localObj = { layout_creating_array: [], layout_editing_array: [] };
                            localObj.layout_creating_array.push('"project": {"key":transform.project}');
                            localObj.layout_creating_array.push('"issuetype": {"name":oraRow.ISSUETYPE}');
                        }

                        let textResult = '"' + row.ID + '": ' + row.OUTPUT_CODE;
                        if (row.USE_CREATING == "Y") {
                            localObj.layout_creating_array.push(textResult);
                        } else if (row.USE_CREATING == "N") {
                            localObj.layout_editing_array.push(textResult);
                        }
                        layout_array_map.set(row.ISSUETYPE, localObj);
                    }

                    for (var [key, value] of layout_array_map.entries()) {
                        let layout_creating_code = "loc_result = {" + value.layout_creating_array.join(",") + "}";
                        let layout_editing_code;
                        if (value.layout_editing_array.length) {
                            layout_editing_code = "loc_result = {" + value.layout_editing_array.join(",") + "}";
                        }
                        layout_map.set(key, {
                            layout_creating_code: layout_creating_code,
                            layout_editing_code: layout_editing_code,
                        });
                    }
                    result = layout_map;
                } else {
                    result = undefined;
                    return;
                }
            });
        } catch (e) {
            return undefined;
        }
        return result;
    }

    async getParamsForUpdate(env: Env, transformedP: any, templateIssueKey: string, layout_id: number) {
        console.log(
            `БЕРЕМ ПАРАМЕТРЫ ВЕРХОВНОЙ ЗАДАЧИ  ${transformedP.issues[0].issuekey} ДЛЯ ЕЕ ОБНОВЛЕНИЯ (ШАБЛОН ${templateIssueKey})`
        );
        let params: any = {};
        let result: any = { linksOnChields: [], linksOnParent: [] };
        try {
            params = { fields: {} };
            await env.dbProvider(async function (db: OracleConnection0) {
                //берем правила заполнения полей
                let transformed = Object.assign({}, transformedP);
                let issue = transformed.issues[0];
                let issuekey = issue.issuekey;
                let issuetype = issue.issuetype;
                let layout_editing_array = [];
                let transform = issue;

                let fields: any = await db.execute(
                    `
            select ilam.ISSUETYPE, ilam.USE_CREATING, fc.FIELD_NAME, fc.OUTPUT_CODE, jf.ID from ISSUE_LAYOUT_MAP_T ilam
                join FIELD_CONFIGURATION_T fc 
                    on ilam.FIELD_ID=fc.FIELD_ID 
                join JIRA_FIELD_T jf
                    on fc.FIELD_NAME=jf.TARGET_NAME and jf.LOAD_FLAG='Y' 
                where ilam.LAYOUT_ID=${layout_id} and ilam.issuetype='${issuetype}' and ilam.USE_CREATING='N'`,
                    []
                );

                if (fields && fields.rows) {
                    let r: any = await db.execute(
                        `
                select * from ISSUE_T where DELETED_FLAG='N' and VTO=3E14 and issuekey='${templateIssueKey}'`,
                        []
                    );
                    if (r && r.rows.length == 1) {
                        let oraRow: any = r.rows[0];
                        for (let field of fields.rows) {
                            if (issue.hasOwnProperty(field.FIELD_NAME) && !issue[field.FIELD_NAME]) {
                                let textResult = '"' + field.ID + '": ' + field.OUTPUT_CODE;
                                layout_editing_array.push(textResult);
                            }
                        }
                    }
                }

                if (layout_editing_array.length) {
                    let r: any = await db.execute(
                        `
                select * from ISSUE_T where DELETED_FLAG='N' and VTO=3E14 and issuekey='${templateIssueKey}'`,
                        []
                    );

                    let oraRow: any;
                    if (r && r.rows.length == 1) {
                        oraRow = r.rows[0];
                    }
                    let loc_result;
                    let layout_editing_code = "loc_result = {" + layout_editing_array.join(",") + "}";
                    eval(layout_editing_code);
                    params.fields = loc_result;
                }

                //берем связи с предками - пока не будем обрабатывать такое событие
                /*
                let links: any = await db.execute(
                    `
                    select * from link_t where issuekey='${templateIssueKey}'
                    and typeid in ('10470', '10370') and DELETED_FLAG='N' and VTO=300000000000000`,
                    []
                );

                //params.fields.issuelinks = {type:{id:10470}, inwardIssue:{key:'DATAMAP-389'}}

                if (links && links.rows && links.rows.length) {
                    for (let i of links.rows) {
                        try {
                            if (i.OUTWARDISSUE) {
                                //добавляем ПОКАЧТО шаблонный issuekey
                                let currLink = {
                                    type: { id: i.TYPEID },
                                    outwardIssue: { key: i.OUTWARDISSUE },
                                };
                                result.linksOnChields.push(currLink);
                            }
                        } catch (e) {
                            console.log(e);
                            env.jobStorage.my_console.log(`CODE00000312`, `ERROR- ${e}`);
                        }
                    }
                }
                */

                result.params = Object.assign({}, params);
            });
        } catch (e) {
            console.log(e);
            env.jobStorage.my_console.log(`CODE00000098`, `ERROR- ${e}`);
        }
        return result;
    }

    async createChields(
        env: Env,
        transformed: any,
        issue_layout: any,
        originalParentIssuekey: string,
        templateParentIssueKey: string,
        parameters: any,
        OKissueLinks: any[],
        TEMPLATEissueLinks: []
    ) {
        // создаем дочерние задачи
        let pthis = this;
        let childs: any = [];
        if (originalParentIssuekey == "") {
            return;
        }
        console.log(`СОЗДАЕМ ДОЧЕРНИЕ ЗАДАЧИ ДЛЯ ${originalParentIssuekey} (ШАБЛОН:${templateParentIssueKey})`);
        await pthis.getChields(env, templateParentIssueKey, childs);
        if (childs.length) {
            for (let i of childs) {
                let params: any = {};
                let newIssueKey = { issuekey: "" };
                console.log(`ШАБЛОННАЯ ДОЧКА ${i.ISSUEKEY}`);
                params = await pthis.getChildParams(
                    env,
                    transformed,
                    issue_layout,
                    i.ISSUEKEY,
                    templateParentIssueKey,
                    originalParentIssuekey
                );
                await pthis.createJiraIssue(env, params.params.create, newIssueKey);
                // получив issuekey дочьки - обновляем наш шаблонный линк и отправляем для обновления задачи
                for (let currTemplateLink of TEMPLATEissueLinks as any) {
                    if (currTemplateLink.outwardIssue.key === i.ISSUEKEY) {
                        let link: any = {
                            type: { id: currTemplateLink.type.id },
                            outwardIssue: { key: newIssueKey.issuekey },
                        };
                        OKissueLinks.push(link);
                    }
                }

                await pthis.createChields(
                    env,
                    transformed,
                    issue_layout,
                    newIssueKey.issuekey,
                    i.ISSUEKEY,
                    params.params.edit,
                    params.linksOnParent,
                    params.linksOnChields
                );
            }
        }
        await pthis.updateIssue(env, parameters, originalParentIssuekey, OKissueLinks);
    }

    async getChildParams(
        env: Env,
        transformedP: any,
        issue_layout: any,
        templateIssueKey: string,
        templateParentIssueKey: string,
        originalParentIssuekey: string
    ) {
        // берем все небходимые параметры из шаблоона
        console.log(`БЕРЕМ ПАРАМЕТРЫ ДЛЯ  ${templateIssueKey}`);
        let params: any = {};
        let result: any = { linksOnChields: [], linksOnParent: [] };
        try {
            params = { create: { fields: {} }, edit: { fields: {} } };
            await env.dbProvider(async function (db: OracleConnection0) {
                //берем правила заполнения полей
                let transformed = Object.assign({}, transformedP);

                let r: any = await db.execute(
                    `
                select * from ISSUE_T where DELETED_FLAG='N' and VTO=3E14 and issuekey='${templateIssueKey}'`,
                    []
                );
                if (r && r.rows.length == 1) {
                    try {
                        let oraRow: any = r.rows[0];
                        let transform = transformed.issues[0];

                        let valueof_issuetype_layout = issue_layout.get(oraRow.ISSUETYPE);
                        let loc_result;
                        eval(valueof_issuetype_layout.layout_creating_code);
                        params.create.fields = loc_result;
                        params.edit.fields = {};
                        if (valueof_issuetype_layout.layout_editing_code) {
                            eval(valueof_issuetype_layout.layout_editing_code);
                            params.edit.fields = loc_result;
                        }
                    } catch (e) {
                        console.log(e);
                        env.jobStorage.my_console.log(
                            `CODE00000365`,
                            `Ошибка сбора параметров для шаблонной дочки  ${templateIssueKey} - ERROR: ${e}`
                        );
                    }
                }

                //берем связи с предками
                let links: any = await db.execute(
                    `
                    select * from link_t where issuekey='${templateIssueKey}'
                    and typeid in ('10470', '10370','task-epic') and DELETED_FLAG='N' and VTO=300000000000000`,
                    []
                );

                //params.fields.issuelinks = {type:{id:10470}, inwardIssue:{key:'DATAMAP-389'}}

                if (links && links.rows && links.rows.length) {
                    for (let i of links.rows) {
                        try {
                            if (i.TYPEID == "task-epic") {
                                if (i.INWARDISSUE) {
                                    params.edit.fields["customfield_10376"] = transformed.issues[0].issuekey;
                                }
                            } else {
                                if (i.INWARDISSUE) {
                                    if (i.INWARDISSUE === templateParentIssueKey) {
                                        let currLink = {
                                            type: { id: i.TYPEID },
                                            inwardIssue: { key: originalParentIssuekey },
                                        };
                                        result.linksOnParent.push(currLink);
                                    }
                                } else {
                                    //добавляем ПОКАЧТО шаблонный issuekey
                                    let currLink = {
                                        type: { id: i.TYPEID },
                                        outwardIssue: { key: i.OUTWARDISSUE },
                                    };
                                    result.linksOnChields.push(currLink);
                                }
                            }
                        } catch (e) {
                            console.log(e);
                            env.jobStorage.my_console.log(`CODE00000368`, `ERROR- ${e}`);
                        }
                    }
                }

                result.params = Object.assign({}, params);
            });
        } catch (e) {
            console.log(e);
            env.jobStorage.my_console.log(`CODE00000179`, `ERROR- ${e}`);
        }
        return result;
        /*
        params = {
            fields: {
                project: { key: "DATAMAP" },
                summary: "TEST_GENERATED2VERSION",
                description: "не забыть удалить",
                issuetype: { name: "Стандартная задача BI с принятием" },
            },
        };
         */
    }

    async getChields(env: Env, parent: string, childs: any) {
        console.log(`ИЩЕМ ДОЧЕК ДЛЯ ${parent}`);
        let pthis = this;
        let r: any;
        await env.dbProvider(async function (db: OracleConnection0) {
            r = await db.execute(
                `select * from ISSUE_T where parent_issuekey='${parent}' and DELETED_FLAG='N' and VTO=300000000000000`,
                []
            );
            if (r && r.rows.length) {
                for (let i of r.rows) {
                    childs.push(i);
                }
            }
        });
    }

    async createJiraIssue(env: Env, params: any, newIssueKey: any) {
        try {
            newIssueKey.issuekey = `"ЖИРА_СГЕНЕРЬ_МНЕ_ЗАДАЧУ"`;
            //env.jira.jiraRequest("issue.createIssue","props",opts, undefined, undefined);

            let answer = await env.jira.jira.issue.createIssue(params);
            newIssueKey.issuekey = answer ? answer.key : newIssueKey.issuekey;
            env.jobStorage.my_console.log(
                `CODE00000374`,
                `Создали задачу- ${answer ? answer.key : newIssueKey.issuekey}`
            );
        } catch (e) {
            console.log(e);
            env.jobStorage.my_console.log(`CODE00000180`, `ERROR- ${e}`);
            newIssueKey.issuekey = ``;
        }
    }

    async transitionIssue(env: Env, parameters: any, issuekey: string) {
        console.log(`ОБНОВЛЯЕМ СТАТУС ЗАДАЧИ ${issuekey}`);
        try {
            if (parameters != {}) {
                let ss = await env.jira.jira.issue.transitionIssue(parameters);
            }
        } catch (e) {
            console.log(e);
            env.jobStorage.my_console.log(`CODE00000370`, `ERROR- ${e}`);
        }
    }

    async updateIssue(env: Env, parameters: any, issuekey: string, parentLinks: any[]) {
        console.log(`ОБНОВЛЯЕМ ЗАДАЧУ ${issuekey}`);
        try {
            if (Object.keys(parameters).length) {
                let answer = await env.jira.jira.issue.editIssue({
                    issueKey: issuekey,
                    //fields:enterParams.fields,
                    issue: parameters,
                });
            }

            // к сожалению жира не может обновлять более одного линка - поэтому выносим
            if (parentLinks.length) {
                let fullLinks: any;
                let linkParameters: any = {};
                for (let i of parentLinks) {
                    fullLinks = [];
                    let localLink = { add: i };
                    fullLinks.push(localLink);
                    linkParameters["update"] = { issuelinks: fullLinks };
                    let answer = await env.jira.jira.issue.editIssue({
                        issueKey: issuekey,
                        //fields:enterParams.fields,
                        issue: linkParameters,
                    });
                }
            }
        } catch (e) {
            console.log(e);
            env.jobStorage.my_console.log(`CODE00000371`, `ERROR- ${e}`);
        }
    }
}
