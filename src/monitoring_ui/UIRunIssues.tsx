import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox, { CheckboxProps } from "@material-ui/core/Checkbox";
import TextField from "@material-ui/core/TextField";
import debugjs from "debug";
import { globalUIState, GlobalUIState, runStatus } from "./RunStatus";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";

const debugRender = debugjs("render");

const useStyles = makeStyles({
    table: {
        minWidth: 650,
    },
    filterTextField: {
        marginLeft: "16px",
        width: "900px",
        marginBottom: "16px",
    },
    typographyStylesFooter: {
        margin: "16px",
        width: "100%",
    },
    stepColumn: {
        width: "200px",
    },
    leftMargin16px: {
        marginLeft: "16px",
    },
    leftTopMargin16px: {
        marginLeft: "16px",
        marginTop: "16px",
    },
    leftBottomMargin16px: {
        marginLeft: "16px",
        marginBottom: "16px",
    },
});

const allFields = true;

export const UIRunIssues: React.FC<{ runStatus: any; globalUIState: GlobalUIState }> = ({
    runStatus,
    globalUIState,
}) => {
    const classes = useStyles();
    debugRender("UIIssues");
    return useObserver(() => (
        <>
            <Typography variant="subtitle1" className={classes.leftTopMargin16px}>
                Тип запускаемых объектов:
            </Typography>
            <RadioGroup
                defaultValue={runStatus.runIssuesConfig.startIssueType}
                name="customized-radios"
                className={classes.leftMargin16px}
            >
                <FormControlLabel
                    value="issues"
                    control={
                        <Radio
                            onChange={() => {
                                runStatus.runIssuesConfig.startIssueType = "issues";
                            }}
                        />
                    }
                    label="Задачи"
                />
                <FormControlLabel
                    value="projects"
                    control={
                        <Radio
                            onChange={() => {
                                runStatus.runIssuesConfig.startIssueType = "projects";
                            }}
                        />
                    }
                    label="Проекты"
                />
            </RadioGroup>
            <Typography variant="subtitle1" className={classes.leftTopMargin16px}>
                Режим запуска
            </Typography>
            <RadioGroup
                defaultValue={
                    runStatus.runIssuesConfig.startIssueMode == "continue"
                        ? "load_continue"
                        : runStatus.runIssuesConfig.startIssueMode == "from_cache"
                        ? "load_cache"
                        : runStatus.runIssuesConfig.startIssueMode == "reload"
                        ? "load_jira"
                        : "none"
                }
                name="customized-radios"
                className={classes.leftMargin16px}
            >
                <FormControlLabel
                    value="load_continue"
                    control={
                        <Radio
                            onChange={() => {
                                runStatus.runIssuesConfig.startIssueMode = "continue";
                            }}
                        />
                    }
                    label="Догрузить"
                />
                <FormControlLabel
                    value="load_cache"
                    control={
                        <Radio
                            onChange={() => {
                                runStatus.runIssuesConfig.startIssueMode = "from_cache";
                            }}
                        />
                    }
                    label="Перезагрузить из кеша"
                />
                <FormControlLabel
                    value="load_jira"
                    control={
                        <Radio
                            onChange={() => {
                                runStatus.runIssuesConfig.startIssueMode = "reload";
                            }}
                        />
                    }
                    label="Перезагрузить из Jira"
                />
            </RadioGroup>

            {runStatus.runIssuesConfig.startIssueType === "projects" ? (
                <>
                    <FormControlLabel
                        className={classes.leftTopMargin16px}
                        control={
                            <Checkbox
                                checked={runStatus.runIssuesConfig.allProjects}
                                onChange={() => {
                                    runStatus.runIssuesConfig.allProjects = !runStatus.runIssuesConfig.allProjects;
                                }}
                                name="allProjects"
                                color="primary"
                            />
                        }
                        label="Все проекты"
                    />
                    <br />
                </>
            ) : undefined}

            <TextField
                className={classes.filterTextField}
                label="Добавьте объекты через пробелы"
                defaultValue={globalUIState.issuesForStart}
                onChange={globalUIState.setIssuesForStart}
                multiline
                rows="3"
                rowsMax="10"
                variant="outlined"
                disabled={
                    runStatus.runIssuesConfig.allProjects && runStatus.runIssuesConfig.startIssueType == "projects"
                }
            />
            <IconButton color={"primary"} onClick={globalUIState.sendAlertForProjects} disabled={!runStatus.admitted}>
                <PlayArrowIcon />
            </IconButton>

            <Dialog
                open={runStatus.runIssuesConfig.startIssueProjectAlert}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Внимание"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Запуск проектов может занять продолжительное время, вы действительно хотите продолжить?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={globalUIState.closeIssueProjectAlert} color="primary">
                        Отмена
                    </Button>
                    <Button onClick={globalUIState.closeAndStartIssueProjectAlert} color="primary" autoFocus>
                        Продолжить
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    ));
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
