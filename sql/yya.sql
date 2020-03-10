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



select * from BIREPORT_YYA_STG.load_stream_t; 
update BIREPORT_YYA_STG.load_stream_t set last_updated_ts = null;
commit; 


--------------
select * from BIREPORT_STG.LOAD_STREAM_T;
select project, count(1) c from BIREPORT_STG.ISSUE_T group by project;