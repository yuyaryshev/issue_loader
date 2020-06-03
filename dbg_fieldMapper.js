// THIS IS A AUTO-GENERATED FILE - ALL CHANGES WILL BE LOST. ITS NOT USED IN PRODUCTION LOADING.
module.exports = {
    fieldMapper: a => ({
        ID: a.id,

        lastViewed: a.fields.lastViewed,
        issuetype: a.fields.issuetype && a.fields.issuetype.name,
        timeestimate: a.fields.timeestimate,
        assignee: a.fields.assignee && a.fields.assignee.key,
        duedate: a.fields.duedate,
        reporter: a.fields.reporter && a.fields.reporter.key,
        updated: a.fields.updated,
        timeoriginalestimate: a.fields.timeoriginalestimate,
        issuekey: a.key,
        created: a.fields.created,
        summary: a.fields.summary,
        status: a.fields.status && a.fields.status.name,
        creator: a.fields.creator && a.fields.creator.key,
        project: a.fields.project && a.fields.project.key,
        resolutiondate: a.fields.resolutiondate,

        // custom fields
    }),
};
