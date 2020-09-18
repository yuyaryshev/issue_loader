import { observable } from "mobx";

import moment from "moment";
// @ts-ignore
require("moment-countdown");
import { JobState } from "Yjob/JobState";

export class JobStatus {
    @observable id: number = 0;
    @observable jobContextId: number = 0;
    @observable key: string = "" as any;
    @observable priority: number | undefined = 0;
    @observable cancelled: number = 0;
    @observable predecessorsDone: number = 0;
    @observable jobType: string = "";
    @observable succeded: number = 0;
    @observable prevError: string | undefined = "" as any;
    @observable retryIntervalIndex: number = 0;
    @observable nextRunTs: string | undefined = "";
    @observable input: any = undefined;
    @observable result: any | undefined = undefined;
    @observable paused: number = 0;
    @observable state: JobState = "" as any;
    @observable parent: number | undefined = 0;
}

export class JobContextStatus {
    @observable id: number = 0;
    @observable key: string = "" as any;
    @observable jobsById: any = {};
    @observable priority: number | undefined = 0;
    @observable predecessorsDone: number = 0;
    @observable jobContextType: string = "";
    @observable succeded: number = 0;
    @observable prevError: string | undefined = "" as any;
    @observable retryIntervalIndex: number = 0;
    @observable nextRunTs: string | undefined = "";
    @observable input: any = undefined;
    @observable paused: number = 0;
    @observable timesSaved: number = 0;
    @observable updatedTs: string = "";
    @observable deleted: number | undefined = 0;
    @observable state: JobState = "" as any;
    @observable stage: string = "" as any;
    @observable newIssue: number = 0;
}
