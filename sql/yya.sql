select count(1) c from bireport.users;
select * from dual@dwstprod_taf;
--YYARYSHEV

insert into BIREPORT_YYA_STG.LOAD_STREAM_T(id,type,project,condition,enabled,last_updated_ts)
--select id,type,project,condition,enabled,last_updated_ts from BIREPORT_YYA_STG.LOAD_STREAM_T
select id,type,project,condition,enabled,last_updated_ts from BIREPORT_STG.LOAD_STREAM_T where id in ('DATAMAP','DATALAKE', 'DWHCORE','DMREPORT');

update BIREPORT_YYA_STG.LOAD_STREAM_T 
set enabled = case when id in (
    'DATAMAP',
    '-DATALAKE', 
    '-DWHCORE',
    '-DMREPORT'
    ) then 'Y' else 'N' end;
commit;

update BIREPORT_YYA_STG.LOAD_STREAM_T set last_updated_ts = null where enabled = 'Y';
commit;
select * from BIREPORT_YYA_STG.LOAD_STREAM_T;


delete from BIREPORT_YYA_STG.CHANGELOG_T;
delete from BIREPORT_YYA_STG.COMMENT_T;
delete from BIREPORT_YYA_STG.ISSUE_T;
delete from BIREPORT_YYA_STG.JIRA_USER_T;
delete from BIREPORT_YYA_STG.LABEL_T;
delete from BIREPORT_YYA_STG.LINK_T;
delete from BIREPORT_YYA_STG.WORKLOG_T;

select * from BIREPORT_YYA_STG.load_stream_t; 
update BIREPORT_YYA_STG.LOAD_STREAM_T set enabled = case when PROJECT in ('DATAMAP', '-DWHCORE') then 'Y' else 'N' end;
update BIREPORT_YYA_STG.load_stream_t set last_updated_ts = null;
commit; 

select count(1) c from BIREPORT_YYA_STG.ISSUE_T;
select project, count(1) c from BIREPORT_YYA_STG.ISSUE_T group by project;


--------------
select * from BIREPORT_STG.LOAD_STREAM_T;
select id from BIREPORT_DEV_STG.LOAD_STREAM_T where enabled = 'N'; -- UATIS, RBPATNER, ORS, DMTAX
-- PROD !!! update BIREPORT_STG.LOAD_STREAM_T set enabled = case when PROJECT in ('DATAMAP', '-DWHCORE') then 'Y' else 'N' end;
select * from BIREPORT_STG.LOAD_STREAM_T where last_updated_ts is null and enabled = 'Y';
select project, count(1) c from BIREPORT_STG.ISSUE_T group by project;


------  DEV --------

delete from BIREPORT_DEV_STG.CHANGELOG_T;
delete from BIREPORT_DEV_STG.COMMENT_T;
delete from BIREPORT_DEV_STG.ISSUE_T;
delete from BIREPORT_DEV_STG.JIRA_USER_T;
delete from BIREPORT_DEV_STG.LABEL_T;
delete from BIREPORT_DEV_STG.LINK_T;
delete from BIREPORT_DEV_STG.WORKLOG_T;

--insert into BIREPORT_DEV_STG.load_stream_t(id,type,condition, enabled, last_updated_ts,project) select id,type,condition, enabled, last_updated_ts,project from BIREPORT_STG.load_stream_t;
select * from BIREPORT_DEV_STG.load_stream_t where enabled = 'Y';
update BIREPORT_DEV_STG.load_stream_t set last_updated_ts = null;
commit; 


select * from BIREPORT_DEV_STG.LOAD_STREAM_T where enabled = 'Y';
select * from BIREPORT_DEV_STG.LOAD_STREAM_T where last_updated_ts is null and enabled = 'Y';
select project, count(1) c from BIREPORT_DEV_STG.ISSUE_T group by project;


------------- PROD -------------------
delete from BIREPORT_STG.CHANGELOG_T;
delete from BIREPORT_STG.COMMENT_T;
delete from BIREPORT_STG.ISSUE_T;
delete from BIREPORT_STG.JIRA_USER_T;
delete from BIREPORT_STG.LABEL_T;
delete from BIREPORT_STG.LINK_T;
delete from BIREPORT_STG.WORKLOG_T;

update BIREPORT_STG.LOAD_STREAM_T set last_updated_ts = case when enabled='Y' then '2020-03-15' else null end;

update BIREPORT_STG.LOAD_STREAM_T set last_updated_ts = null;
update BIREPORT_STG.LOAD_STREAM_T set enabled = case when PROJECT not in (
'UATIS','RBPATNER','BASELGBC','BIPOSTGR','DMCOLL','CLIENT360','BMBREPORT',
'DWHFR','ROLEMODEL','BISUPPORT','SAPUIAPP','UATISFIN','QWE','ACLUB','SFAREPORT',
'DMPRCIB','PLATFORM','ORS','DMTAX') then 'Y' else 'N' end;
commit; 

select * from BIREPORT_STG.LOAD_STREAM_T;
-----------------------------------------------------
select project, count(1) c from BIREPORT_STG.ISSUE_T group by project;
-----------------------------------------------------
select id from BIREPORT_STG.LOAD_STREAM_T where enabled = 'N'; -- UATIS, RBPATNER, ORS, DMTAX
update BIREPORT_STG.LOAD_STREAM_T set enabled = case when PROJECT in ('DATAMAP', 'DWHCORE') then 'Y' else 'N' end;
commit; 
select * from BIREPORT_STG.LOAD_STREAM_T where enabled = 'Y';
select * from BIREPORT_STG.LOAD_STREAM_T where last_updated_ts is null and enabled = 'Y';
select project, count(1) c from BIREPORT_STG.ISSUE_T where id in ('DATAMAP', 'DWHCORE')  group by project;
select project, count(1) c from BIREPORT_STG.ISSUE_T group by project;
select count(1) c from BIREPORT_STG.ISSUE_T;
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
delete from BIREPORT_YYA_STG.CHANGELOG_T;
delete from BIREPORT_YYA_STG.COMMENT_T;
delete from BIREPORT_YYA_STG.ISSUE_T;
delete from BIREPORT_YYA_STG.JIRA_USER_T;
delete from BIREPORT_YYA_STG.LABEL_T;
delete from BIREPORT_YYA_STG.LINK_T;
delete from BIREPORT_YYA_STG.WORKLOG_T;


update BIREPORT_YYA_STG.LOAD_STREAM_T set last_updated_ts = null;
update BIREPORT_YYA_STG.LOAD_STREAM_T set enabled = case when PROJECT not in (
'UATIS','RBPATNER','BASELGBC','BIPOSTGR','DMCOLL','CLIENT360','BMBREPORT',
'DWHFR','ROLEMODEL','BISUPPORT','SAPUIAPP','UATISFIN','QWE','ACLUB','SFAREPORT',
'DMPRCIB','PLATFORM','ORS','DMTAX') then 'Y' else 'N' end;
--update BIREPORT_YYA_STG.LOAD_STREAM_T set enabled = case when PROJECT in ('DATAMAP') then 'Y' else 'N' end;
commit; 


select * from BIREPORT_YYA_STG.LOAD_STREAM_T where enabled = 'Y';
select * from BIREPORT_YYA_STG.LOAD_STREAM_T where enabled = 'Y' and last_updated_ts is null;
-----------------------------------------------------
select project, count(1) c from BIREPORT_YYA_STG.ISSUE_T group by project;
select count(1) c from BIREPORT_YYA_STG.CHANGELOG_T;
select count(1) c from BIREPORT_YYA_STG.ISSUE_T;


