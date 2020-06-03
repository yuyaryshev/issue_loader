export type Color = { rgb: string };

export const palette = {
    orange: { rgb: "rgb(241,140,50)" }, // error
    green: { rgb: "rgb(121,194,103)" }, // succed
    yellow: { rgb: "rgb(245,214,61)" }, // running
    pink: { rgb: "rgb(232,104,162)" }, // readyToRun
    salad: { rgb: "rgb(197,214,71)" }, // waitingDeps
    frost: { rgb: "rgb(69,155,168)" }, // waitingTime
    blue: { rgb: "rgb(120,197,214)" }, // paused

    stage1: { rgb: "rgb(120,197,214)" },
    stage2: { rgb: "rgb(121,132,214)" },
    stage3: { rgb: "rgb(102,92,214)" },
};

export const stageColors: { [key: string]: Color } = {
    "01_jira": palette.stage1,
    "02_transform": palette.stage2,
    "03_db": palette.stage3,
    "99_yrunning": palette.yellow,
    "99_succeded": palette.green,
    "99_zerror": palette.orange,
    unknown: palette.pink,
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
