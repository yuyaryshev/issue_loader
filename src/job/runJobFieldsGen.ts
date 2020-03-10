import { generateJobFieldsTs, JobField, JobFieldInput, jobFieldInputs } from "Yjob";

const jobFields: JobFieldInput[] = [
    ...jobFieldInputs,
    { fname: "issueid", type: "string", inputField: true, optional: true },
    { fname: "issuekey", type: "string", optional: true },
    { fname: "updated", type: "string", optional: true },
    { fname: "project", type: "string", optional: true },
];

// Regenerate Yjob files = just in case of something
generateJobFieldsTs({
    targetPath: `src/Yjob/JobFieldsServer.ts`,
    typings: true,
    client: false,
    libMode: true,
    jobFields: jobFieldInputs,
});
generateJobFieldsTs({
    targetPath: `src/Yjob/JobFieldsClient.ts`,
    typings: true,
    client: true,
    libMode: true,
    jobFields: jobFieldInputs,
});

// Regenerate issue_loader files
generateJobFieldsTs({
    targetPath: `src/job/JobFieldsServer.ts`,
    typings: true,
    client: false,
    libMode: false,
    jobFields,
});
generateJobFieldsTs({
    targetPath: `src/job/JobFieldsClient.ts`,
    typings: true,
    client: true,
    libMode: false,
    jobFields,
});
