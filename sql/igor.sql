select * from bireport_test2_stg.LOAD_STREAM_T;
update bireport_test2_stg.LOAD_STREAM_T set enabled = case when id in ('DATALAKE') then 'Y' else 'N' end;
update bireport_test2_stg.LOAD_STREAM_T set last_updated_ts = null where id in ('DATALAKE');
commit;
insert into bireport_test2_stg.LOAD_STREAM_T select * from bireport_test_stg.LOAD_STREAM_T where id in ('DATALAKE');
commit;