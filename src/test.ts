export const unused345: any = 4;
//console.log("13456");
import {privateSettings} from "./settings";
import JiraClient from 'jira-connector';
import {writeFileSync} from 'fs';
import {jiraGetAllFieldMetas} from "./jiraGetAllFieldMetas";

const jiraConnectionSettings = privateSettings.jiradev;
const jira = new JiraClient(jiraConnectionSettings);
//10374


// http://jira.moscow.alfaintra.net/browse/DMREPORT-74

const testFunc = async ()=> {
    console.log("Starting Jira test");
    try {
        const allFields = await jiraGetAllFieldMetas(jira);
        console.log(allFields);

        const issue = await jira.issue.getIssue({ issueKey: 'DATAMAP-1' });
        let issueStr = JSON.stringify(issue,undefined, "    ");
        writeFileSync("issue_DATAMAP-1.json",issueStr, "utf-8");
        let issueStrNoCf = JSON.parse(issueStr);
        for(let fk of Object.keys(issueStrNoCf.fields))
            if(fk.startsWith("customfield_"))
                delete issueStrNoCf.fields[fk];

        writeFileSync("issue_DATAMAP-1_no_customfield.json", JSON.stringify(issueStrNoCf,undefined, "    "), "utf-8");
        console.log("issue.fields.summary = ", issue.fields.summary);
    } catch(e) {
        console.error(e);
    }
};


testFunc();