// THIS IS A AUTO-GENERATED FILE - ALL CHANGES WILL BE LOST. ITS NOT USED IN PRODUCTION LOADING.
module.exports = {fieldMapper: (a) => ({
        ID:a.id,

        lastViewed:a.fields.lastViewed,
        issuetype:a.fields.issuetype && a.fields.issuetype.name,
        reporter:a.fields.reporter && a.fields.reporter.key,
        updated:a.fields.updated,
        created:a.fields.created,
        assignee:a.fields.assignee && a.fields.assignee.key,
        issuekey:a.key,
        status:a.fields.status && a.fields.status.name,
        creator:a.fields.creator && a.fields.creator.key,
        project:a.fields.project && a.fields.project.key,
        summary:a.fields.summary,
        
        // custom fields
})};