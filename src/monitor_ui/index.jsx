const useHotReloading = false;

import {hot} from "react-hot-loader/root";
import React from "react";
import {render} from "react-dom";
import {UIRunStatus as UIRunStatus0, MainData} from "./UIRunStatus";
import {runStatus} from "./RunStatus";

let UIRunStatus = ( useHotReloading ? hot(UIRunStatus0) : UIRunStatus0);


(async () => {
    let root = document.querySelector('#root');
    if (!root) {
        root = document.createElement('div');
        root.id = "root";
        document.body.appendChild(root);
    }

    console.log(`Starting...`);

    render(<UIRunStatus runStatus={runStatus} />, root);
})();


if (module.hot) {
    module.hot.accept();
}