import { contextFieldInputs, generateJobFieldsTs, JobFieldInput, jobFieldInputs, jobResultFieldInputs } from "Yjob";

const jobFields: JobFieldInput[] = [...jobFieldInputs];

const jobResultFields: JobFieldInput[] = [...jobResultFieldInputs];

const contextFields: JobFieldInput[] = [
    ...contextFieldInputs,
    { fname: "project", type: "string", optional: true, mem: true },
    { fname: "issueKey", type: "string", inputField: true, optional: true, mem: true },
    { fname: "updated", type: "string", optional: true, mem: true },
];

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

// Regenerate issue_loader files
generateJobFieldsTs({
    targetPath: `src/job/JobFieldsServer.ts`,

    client: false,
    libMode: false,
    jobFields,
    jobResultFields,
    contextFields,
});
generateJobFieldsTs({
    targetPath: `src/job/JobFieldsClient.ts`,

    client: true,
    libMode: false,
    jobFields,
    jobResultFields,
    contextFields,
});
