import { useSnackbar } from "notistack";

export function notificationInfo(s: any) {
    const { enqueueSnackbar } = useSnackbar();
    enqueueSnackbar({ variant: "info" });
}

export function notificationSuccess(s: any) {
    const { enqueueSnackbar } = useSnackbar();
    enqueueSnackbar({ variant: "success" });
}

export function notificationWarning(s: any) {
    const { enqueueSnackbar } = useSnackbar();
    enqueueSnackbar({ variant: "warning" });
}

export function notificationError(s: any) {
    const { enqueueSnackbar } = useSnackbar();
    enqueueSnackbar({ variant: "error" });
}

export function notificationResponse(response: any, s: any, ui_success_message: any) {
    const { enqueueSnackbar } = useSnackbar();
    if (response.warn) enqueueSnackbar((ui_success_message || "") + " Warning!", { variant: "error" });
    else if (response.ok) enqueueSnackbar(ui_success_message || "OK!", { variant: "error" });
    else {
        enqueueSnackbar("Error: " + response.error, { variant: "error" });
        console.error(`CODE00000000 Server response`, response);
    }
}

if ((module as any).hot) {
    (module as any).hot.accept();
}
