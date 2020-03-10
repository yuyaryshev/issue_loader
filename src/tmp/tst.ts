import { Connection } from "oracledb";
//console.log("13456");
import JiraClient from "jira-connector";
import { writeFileSync } from "fs";
import { startEnv } from "../other/Env";
import moment from "moment";
import { ymutex } from "../Ystd/ymutex";
import { awaitDelay } from "Ystd";
import { makeMomentInterval } from "../Ystd/makeMomentInterval";
import better_sqlite3 from "better-sqlite3";

export const unused345: any = 4;

console.log(moment().format());
console.log(
    moment()
        .add(makeMomentInterval("3h 20m 17s"))
        .format()
);

function tst_better_sqlite3() {
    const db = better_sqlite3("test_yya.db");

    //db.exec('create table tst(a,b)');
    //db.exec("insert into tst(a,b) values(123, 'АБВГ abcd')");
    //db.exec("insert into tst(a,b) values(222, '222 АБВГ abcd')");

    const row = db.prepare("SELECT * FROM tst").get();
    console.log(JSON.stringify(row));
}

function aaa() {
    //10374
    // http://jira.moscow.alfaintra.net/browse/DMREPORT-74

    const testFunc = async () => {
        console.log("Starting Jira test");
        try {
            const env = await startEnv("test", { noJiraTest: false, noDbTest: true });
            const jira = new JiraClient(env.settings.jiradev!);
            // &expand=changelog
            const issue = await jira.issue.getIssue({ issueKey: "DATAMAP-1", expand: ["changelog", "worklog"] });
            let issueStr = JSON.stringify(issue, undefined, "    ");
            writeFileSync("issue_DATAMAP-1.json", issueStr, "utf-8");
            let issueStrNoCf = JSON.parse(issueStr);
            for (let fk of Object.keys(issueStrNoCf.fields))
                if (fk.startsWith("customfield_")) delete issueStrNoCf.fields[fk];

            writeFileSync(
                "issue_DATAMAP-1_no_customfield.json",
                JSON.stringify(issueStrNoCf, undefined, "    "),
                "utf-8"
            );
            console.log("issue.fields.summary = ", issue.fields.summary);
        } catch (e) {
            console.error(e);
        }
    };

    //----------------------------------------------------------------------------------------------------------------------------------------------------------
    const mymutex = ymutex();

    //----------------------------------------------------------------------------------------------------------------------------------------------------------
    let inside = 0;
    let innerFunc = async function() {
        console.log("inside = ", ++inside);
        await awaitDelay(1000);
        --inside;
    };

    // setInterval(async function(){
    //     mymutex.lock(innerFunc);
    //     //innerFunc();
    // }, 100);
    //----------------------------------------------------------------------------------------------------------------------------------------------------------
    async function testDbProvider() {
        console.log("testDbProvider - started");
        const env = await startEnv("test", { noJiraTest: false, noDbTest: true });

        for (let i = 0; i < 100; i++) {
            env.dbProvider(async function(db: Connection) {
                console.log("inside = ", ++inside, ", i = ", i);
                await db.execute(`select * from dual`, []);
                --inside;
            });
        }
        console.log("testDbProvider - ended");
    }
    testDbProvider();
    //----------------------------------------------------------------------------------------------------------------------------------------------------------
    // testFunc();
    console.log("12345678 ==========");

    console.log(moment("2010-01-01").format());
    console.log(moment("2010-01-05").format());
    console.log(moment("2010-01-05").diff(moment("2010-01-01"), "d"));
}
