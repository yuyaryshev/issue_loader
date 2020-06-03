/*  
create materialized view bireport_stg.parent_child_hierarchy_m
   build immediate
   refresh
      fast
      on commit              --
;
*/

CREATE OR REPLACE VIEW bireport_stg.parent_child_hierarchy
as
     select max (parent_issuekey)                       parent_issuekey
           ,min (parent_issuekey)                       other_parent_issuekey
           ,child_issuekey                              child_issuekey
           ,case when count (1) > 1 then 'Y' else 'N' end as error_flag
       from (select distinct parent_issuekey
                            ,child_issuekey
               from (select l.inwardissue parent_issuekey
                           ,l.issuekey  child_issuekey
                       from bireport_stg.link_t l
                      where     l.outwardissue is null
                            and l.typeid in ('10470', '10370')
                     union all
                     select l.issuekey   parent_issuekey
                           ,l.outwardissue child_issuekey
                       from bireport_stg.link_t l
                      where     l.inwardissue is null
                            and l.typeid in ('10470', '10370')
                     union all
                     select l.outwardissue parent_issuekey
                           ,l.issuekey   child_issuekey
                       from bireport_stg.link_t l
                      where     l.inwardissue is null
                            and upper (l.typeid) = 'TASK-EPIC') a) a
   group by child_issuekey;

drop view bireport_stg.issue_with_parent_t;

create view bireport_stg.issue_with_parent_t
as
   select case
             when h.parent_issuekey is not null then h.parent_issuekey
             when i.project = 'BIPPM' then null
             else 'BIPPM-104' -- Техническая задача "Задачи без PPM "  
          end
             parent_issuekey
         ,a.name assignee_name
         ,i.*
     from bireport_stg.issue_t i
          left join bireport_stg.parent_child_hierarchy h
             on i.issuekey = h.child_issuekey
          left join bireport_stg.biteam_sdim a on a.login = i.assignee;

select * from bireport_stg.issue_hierarchy_t;

drop view bireport_stg.issue_hierarchy_t;

create view bireport_stg.issue_hierarchy_t
as
       select level          lv
             ,connect_by_iscycle iscycle
             ,connect_by_isleaf isleaf
             ,trim (substr (sys_connect_by_path (issuekey, ' / '), 3, 1000))
                 as keypath
             ,t.*
         from bireport_stg.issue_with_parent_t t
   start with t.parent_issuekey is null and t.project = 'BIPPM'
   connect by nocycle prior t.issuekey = t.parent_issuekey;


drop materialized view bireport_stg.parent_child_hierarchy;

create materialized view bireport_stg.parent_child_hierarchy
   build immediate
   refresh
      fast
      on commit
as
   select l.inwardissue parent_issuekey
         ,l.issuekey    child_issuekey
         ,l.id
     from bireport_stg.link_t l
    where l.outwardissue is null and l.typeid in ('10470', '10370');

select *
  from bireport_stg.issue_with_parent_t
 where parent_issuekey is not null;

  select project
        ,count (*) c
    from bireport_stg.issue_t
group by project;

select * from bireport_stg.load_stream_t;


/*
CREATE MATERIALIZED VIEW bireport_stg.issue_with_parent_t
BUILD IMMEDIATE
REFRESH FAST
ON COMMIT
*/
;
drop view bireport_stg.parent_child_hierarchy;

create view bireport_stg.parent_child_hierarchy
as
     select max (parent_issuekey)                       parent_issuekey
           ,child_issuekey                              child_issuekey
           ,case when count (1) > 1 then 'Y' else 'N' end as error_flag
       from (select distinct parent_issuekey
                            ,child_issuekey
               from (select l.inwardissue parent_issuekey
                           ,l.issuekey  child_issuekey
                       from bireport_stg.link_t l
                      where     l.outwardissue is null
                            and l.typeid in ('10470', '10370')
                     union all
                     select l.issuekey   parent_issuekey
                           ,l.outwardissue child_issuekey
                       from bireport_stg.link_t l
                      where     l.inwardissue is null
                            and l.typeid in ('10470', '10370')
                     union all
                     select l.outwardissue parent_issuekey
                           ,l.issuekey   child_issuekey
                       from bireport_stg.link_t l
                      where     l.inwardissue is null
                            and upper (l.typeid) = 'TASK-EPIC') a) a
   group by child_issuekey;


create materialized view bireport_stg.test_mat_view_t
   build immediate
   refresh
      fast
      on commit
as
   select * from bireport_stg.issue_t;