import { observable } from "mobx";

import moment from "moment";
// @ts-ignore
require("moment-countdown");

class JobStatus {
    @observable id: string = "";
    @observable parent?: string = "";
    @observable key: string = "";
    @observable priority?: number = 0;
    @observable cancelled: number = 0;
    @observable deps_succeded: number = 0;
    @observable createdTs: string = "";
    @observable finishedTs?: string = "";
    @observable jobType: string = "";
    @observable succeded: number = 0;
    @observable startedTs?: string = "";
    @observable prevError?: string = "";
    @observable retryIntervalIndex: number = 0;
    @observable nextRunTs?: string = "";
    @observable input: any = undefined;
    @observable prevResult?: any = undefined;
    @observable paused: number = 0;
    @observable timesSaved: number = 0;
    @observable updatedTs?: string = "";
    @observable deleted?: number = 0;
    @observable issueid?: string = "";
    @observable issuekey?: string = "";
    @observable updated?: string = "";
    @observable project?: string = "";
}
