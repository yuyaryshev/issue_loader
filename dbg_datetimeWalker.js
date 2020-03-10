// THIS IS A AUTO-GENERATED FILE - ALL CHANGES WILL BE LOST. ITS NOT USED IN PRODUCTION LOADING.
module.exports = {
    datetimeWalker: (callback, a) => {
        a.fields.lastViewed = callback(a.fields, "lastViewed");
        a.fields.duedate = callback(a.fields, "duedate");
        a.fields.updated = callback(a.fields, "updated");
        a.fields.created = callback(a.fields, "created");
        a.fields.archiveddate = callback(a.fields, "archiveddate");
        a.fields.resolutiondate = callback(a.fields, "resolutiondate");

        return a;
    },
};
