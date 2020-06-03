--CREATE MATERIALIZED VIEW LOG ON bireport.issue_t;

CREATE MATERIALIZED VIEW LOG ON BIREPORT_STG.ISSUE_T WITH PRIMARY KEY INCLUDING NEW VALUES;
CREATE MATERIALIZED VIEW LOG ON BIREPORT_STG.COMMENT_T WITH PRIMARY KEY INCLUDING NEW VALUES;
CREATE MATERIALIZED VIEW LOG ON BIREPORT_STG.LABEL_T WITH PRIMARY KEY INCLUDING NEW VALUES;
CREATE MATERIALIZED VIEW LOG ON BIREPORT_STG.WORKLOG_T WITH PRIMARY KEY INCLUDING NEW VALUES;
CREATE MATERIALIZED VIEW LOG ON BIREPORT_STG.LOAD_STREAM_T WITH PRIMARY KEY INCLUDING NEW VALUES;
CREATE MATERIALIZED VIEW LOG ON BIREPORT_STG.CHANGELOG_T WITH PRIMARY KEY INCLUDING NEW VALUES;
CREATE MATERIALIZED VIEW LOG ON BIREPORT_STG.BITEAM_SDIM WITH PRIMARY KEY INCLUDING NEW VALUES;
CREATE MATERIALIZED VIEW LOG ON BIREPORT_STG.LINK_T WITH PRIMARY KEY INCLUDING NEW VALUES;



CREATE MATERIALIZED VIEW bireport_stg.test_mat_view_t
BUILD IMMEDIATE
REFRESH FAST
ON COMMIT
AS
select * from bireport_stg.issue_t
;
