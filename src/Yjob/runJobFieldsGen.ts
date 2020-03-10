import { generateJobFieldsTs, jobFieldInputs } from "./JobFieldsGen";

generateJobFieldsTs({
    targetPath: `src/Yjob/DefaultJobFieldsServer.ts`,
    typings: true,
    client: false,
    libMode: true,
    jobFields: jobFieldInputs,
});
generateJobFieldsTs({
    targetPath: `src/Yjob/DefaultJobFieldsClient.ts`,
    typings: true,
    client: true,
    libMode: true,
    jobFields: jobFieldInputs,
});
