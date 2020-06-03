select count(1) c from bireport_stg.issue_hierarchy_t; -- 61784
select count(1) c from bireport_stg.worklog_t; -- 20575 
select count(1) c from bireport_stg.link_t; -- 46128
select count(1) c from bireport_stg.comment_t; -- 130750 строк - не выгружаю, Excel ляжет
select count(1) c from bireport_stg.changelog_t; -- 842460 строк - не выгружаю, Excel ляжет

select * from bireport_stg.issue_hierarchy_t;
select * from bireport_stg.worklog_t;
select * from bireport_stg.link_t;
