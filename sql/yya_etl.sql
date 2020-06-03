--drop table BIREPORT_STG.yya_issue_t;
create table BIREPORT_STG.yya_issue_t as
select h.master parentkey, issue.* 
from BIREPORT_STG.issue_t issue
left join BIREPORT_STG.hierarchy_master_slave h
on issue.issuekey = h.slave where project = 'DATAMAP';


select * from BIREPORT_STG.link_t;