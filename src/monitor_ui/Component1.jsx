import React from "react";
import { observer } from "mobx-react"

@observer
export class Component1 extends React.PureComponent {
    constructor(props) {
        super(props);
        // this.state = {};
    }

    render() {
        return <div>
            <p>I'm Component1, and this is my '<b>this.props.children</b>':</p>
            {this.props.children.map((c) => <p key={c.key}>Child: {c}</p>)}
        </div>;
    }
}

if (module.hot) {
    module.hot.accept();
}
