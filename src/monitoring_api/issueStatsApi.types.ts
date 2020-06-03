export interface IssueStatsApiRequest {
    ts?: string;
}

export interface IssueStatsApiResponse {
    ok: boolean;
    error?: string;
    ts: string;
    stats: IssueLoaderStatItem[];
}

export const emptyIssueStatsApiResponse: IssueStatsApiResponse = { ok: false, error: "Loading...", ts: "", stats: [] };

export interface IssueLoaderStatItem {
    project: string;
    stage: string;
    state: string;
    hasError: boolean;
    loaded: boolean;
    c: number;
}
