import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import debugjs from "debug";

const debugRender = debugjs("render");

const useStyles = makeStyles({
    stepColumn: {
        width: "200px",
    },
});

export interface MultiProgressBarItem {
    name: string;
    value: number;
    color: any;
}

export type MultiProgressBarItems = MultiProgressBarItem[];

export const MultiProgressBar: React.FC<{ items: MultiProgressBarItems }> = ({ items }) => {
    debugRender("TestProgressBar");

    return useObserver(() => {
        let total = 0;
        for (let item of items) total += item.value;

        const progressBarHeight = 8;
        const progressBarWidth = 300;
        return (
            <div
                style={{
                    height: progressBarHeight + "px",
                    width: progressBarWidth + "px",
                    display: "flex",
                    flexDirection: "row-reverse",
                }}
            >
                {items.map((item, index) => (
                    <div
                        key={index}
                        style={{
                            backgroundColor: item.color.rgb,
                            height: progressBarHeight + "px",
                            width: `${Math.round((progressBarWidth * item.value) / total)}px`,
                        }}
                    ></div>
                ))}
            </div>
        );
    });
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
