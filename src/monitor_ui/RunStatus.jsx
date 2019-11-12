import { observable, computed } from "mobx";
import request from "request-promise";
import moment from "moment";
moment.locale('ru');

export const reformatDate = (t,prop)=> {
    t[prop] = (t[prop] ? moment(t[prop]).format("HH:mm:ss - DD.MM.YYYY (dddd)") : "");
    return t[prop];
}

const copyFields = (target, source) => {
    for (let k in source) target[k] = source[k];
};

export class RunStatus {
    @observable connected = false;
    @observable lastRun = "";
    @observable jiraTime = "";
    @observable streams = [];
    @observable knownErrors = [];

    // @computed
    // get computedExample() {
    //     return `This is a computed value: this.selectedItem.id = ${(this.selectedItem || {}).id}, this.title=${this.title}`;
    // }
}

export class RunStreamStatus {
    @observable id = "";
    @observable lastRun = "";
    @observable lastRunOk = undefined;
    @observable lastCount = 0;
    @observable lastTotal = 0;
    @observable countToday = 0;
    @observable count10min = 0;
    @observable errors = [];
    @observable status = "";
    @observable partStatuses = [];
    
    // @computed
    // get computedExample() {
    //     return `This is a computed value: this.selectedItem.id = ${(this.selectedItem || {}).id}, this.title=${this.title}`;
    // }
}

export const runStatus = new RunStatus();

async function reloadData() {
    console.log(`Started reloadData`);
    runStatus.lastRefresh = moment().format("hh:mm:ss");
    try {
        const dataStr = await request.get("http://127.0.0.1:29354/api/runStatus");
        const data = JSON.parse(dataStr);

        for (let k in data)
            if(k !== "streams")
                runStatus[k]=data[k];

        runStatus.connected = true;
        reformatDate(runStatus, "lastRun");
        reformatDate(runStatus, "jiraTime");
        runStatus.streams = [];
        for (let k2 in data.streams) {
            const s = data.streams[k2];
            const t = new RunStreamStatus();
            copyFields(t, s);
            reformatDate(t, "lastRun");
            runStatus.streams.push(t);
        }        

        console.log(`Finished reloadData - OK`);
    } catch (e) {
        runStatus.connected = false;
        runStatus.streams = [];
        runStatus.jiraTime = undefined;
        console.error(`Finished reloadData - ERROR`, e);
    }
    setTimeout(reloadData, 300);
}
reloadData();

if (module.hot) {
    module.hot.accept();
}
