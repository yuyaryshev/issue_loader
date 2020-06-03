import { contextFieldInputs, generateJobFieldsTs, jobFieldInputs, jobResultFieldInputs } from "./JobFieldsGen";

// Regenerate Yjob files = just in case of something
generateJobFieldsTs({
    targetPath: `src/Yjob/JobFieldsServer.ts`,

    client: false,
    libMode: true,
    jobFields: jobFieldInputs,
    jobResultFields: jobResultFieldInputs,
    contextFields: contextFieldInputs,
});
generateJobFieldsTs({
    targetPath: `src/Yjob/JobFieldsClient.ts`,

    client: true,
    libMode: true,
    jobFields: jobFieldInputs,
    jobResultFields: jobResultFieldInputs,
    contextFields: contextFieldInputs,
});
