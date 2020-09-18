export interface ProjectStatsApiRequest {
    ts?: string;
}

export interface ProjectStatsApiResponse {
    ok: boolean;
    error?: string;
    ts: string;
    contextsInQueue: string;
    stats: IssueLoaderStatItem[];
}

export const emptyProjectStatsApiResponse: ProjectStatsApiResponse = {
    ok: false,
    error: "Loading...",
    ts: "",
    contextsInQueue: "",
    stats: [],
};

export interface IssueLoaderStatItem {
    project: string;
    stage: string;
    state: string;
    hasError: boolean;
    loaded: boolean;
    c: number;
}
