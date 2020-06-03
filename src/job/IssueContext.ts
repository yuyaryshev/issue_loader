import { JobContextType } from "Yjob/JobContextType";
import { Env } from "other";

export interface IssueContextInput {
    project: string;
    issueKey: string;
    updated: string;
}

export const issueContext = new JobContextType({
    cpl: "CODE00000002",
    type: "issue",
    extractInputFunc: (
        env: Env,
        input: IssueContextInput & {} //TIn & TContextIn
    ) => {
        const { project, issueKey, updated, ...jobInput } = input;
        return {
            contextInput: {
                issueKey,
            },
            jobInput,
            customFields: {
                project,
                issueKey,
                updated,
            },
        };
    },
});
