/* Formatted on 09.04.2020 14:24:25 (QP5 v5.294) */
-- BIPPM-104 Не привязанные задачи

-- Поиск задач по ключу, имени, проекту или человеку
-- issue_search

  select t.*
    from bireport_stg.issue_t t
         join
         (select v
                ,'%' || replace (v, ' ', '%') || '%' m
            from (select upper (trim ('"&search_issue_query&"')) v from dual) q)
         vv
            on    t.issuekey = vv.v
               or t.assignee like vv.m
               or t.reporter like vv.m
               or upper (t.summary) like vv.m
   where length (v) > 3 and rownum <= 20
order by t.project, t.summary;


--Задачи трех верхних самых верхних уровней, начиная с BIPPM
--issue_top3_levels

    select level lv
          ,t.*
      from bireport_stg.issue_with_parent_t t
     where level <= 3 and project in ('BIPPM')
start with t.parent_issuekey is null and project in ('BIPPM')
connect by prior t.issuekey = t.parent_issuekey;

-- Все дочерние Worklog'и
-- worklog

select w.*
  from (    select b.issuekey
              from bireport_stg.issue_with_parent_t b
        start with b.issuekey = 'DATAMAP-60'
        connect by prior b.issuekey = b.parent_issuekey) all_children
       join bireport_stg.worklog_t w on w.issuekey = all_children.issuekey;



-- Рекурсивный запрос - все родители
-- issue_all_parents

with h (lv, issuekey, parent_issuekey)
     as (select 0 lv
               ,issuekey
               ,parent_issuekey
           from bireport_stg.issue_with_parent_t t
          where t.issuekey = 'DATAMAP-102'
         union all
         select coalesce (h.lv, 0) - 1 lv
               ,a.issuekey
               ,a.parent_issuekey
           from bireport_stg.issue_with_parent_t a
                join h on h.parent_issuekey = a.issuekey)
select lv
      ,i.*
  from h
       left join bireport_stg.issue_with_parent_t i
          on h.issuekey = i.issuekey;



-- Бизнес задача данной задачи
-- issue_business (parametrized, not used)

with selected_issuekey as (select 'DATAMAP-102' v from dual)
    ,h (lv, issuekey, parent_issuekey)
     as (select 0 lv
               ,issuekey
               ,parent_issuekey
           from bireport_stg.issue_with_parent_t t
          where t.issuekey = (select max (v) from selected_issuekey)
         union all
         select coalesce (h.lv, 0) - 1 lv
               ,a.issuekey
               ,a.parent_issuekey
           from bireport_stg.issue_with_parent_t a
                join h on h.parent_issuekey = a.issuekey)
    ,all_parents
     as (select lv
               ,i.*
           from h
                left join bireport_stg.issue_with_parent_t i
                   on h.issuekey = i.issuekey)
select *
  from bireport_stg.issue_with_parent_t
 where issuekey in
          (select coalesce (
                     (                  -- Вначале пробуем найти бизнес задачу
                      select max (issuekey)
                        from all_parents
                       where lv =
                                (select max (lv) lv
                                   from all_parents
                                  where     project = 'BIPPM'
                                        and issuekey <>
                                               (select max (v)
                                                  from selected_issuekey)))
                    , (                    -- А иначе - берем наивысшую задачу
                       select max (issuekey)
                         from all_parents
                        where lv =
                                 (select min (lv) lv
                                    from all_parents
                                   where issuekey <>
                                            (select max (v)
                                               from selected_issuekey))))
             from dual);


-- issues_top_level

select *
  from bireport_stg.issue_with_parent_t
 where project = 'BIPPM' and parent_issuekey is null;

--====================================================================================
--====================================================================================
--====================================================================================

select b.*
  from bireport_stg.issue_with_parent_t b
 where b.issuekey = 'DATAMAP-60';

-- Все дочерние задачи

    select level
          ,connect_by_iscycle
          ,connect_by_isleaf
          ,sys_connect_by_path (issuekey, '/') as keypath
          ,sys_connect_by_path (issuekey || ' ' || replace (summary, '/', ' ')
                               ,'/')
              as namepath
          ,b.*
      from bireport_stg.issue_with_parent_t b
start with b.issuekey = 'DATAMAP-60'
connect by nocycle prior b.issuekey = b.parent_issuekey;

    select level
          ,connect_by_iscycle
          ,connect_by_isleaf
          ,sys_connect_by_path (issuekey, '/') as keypath
          ,sys_connect_by_path (issuekey || ' ' || replace (summary, '/', ' ')
                               ,'/')
              as namepath
          ,b.*
      from bireport_stg.issue_with_parent_t b
start with b.parent_issuekey = 'DATAMAP-102'
connect by nocycle prior b.issuekey = b.parent_issuekey;


-- Все дочерние Worklog'и

select w.*
  from (    select b.issuekey
              from bireport_stg.issue_with_parent_t b
        start with b.issuekey = 'DATAMAP-60'
        connect by prior b.issuekey = b.parent_issuekey) all_children
       join bireport_stg.worklog_t w on w.issuekey = all_children.issuekey;



    select level
          ,connect_by_iscycle
          ,connect_by_isleaf
          ,sys_connect_by_path (issuekey, '/') as keypath
          ,sys_connect_by_path (issuekey || ' ' || replace (summary, '/', ' ')
                               ,'/')
              as namepath
          ,t.*
      from bireport_stg.issue_with_parent_t t
start with t.issuekey = 'DATAMAP-60'
connect by nocycle prior t.issuekey = t.parent_issuekey;

-- Рекурсивный запрос - все дочерние

with h (lv, issuekey, parent_issuekey, summary)
     as (select 0 lv
               ,issuekey
               ,parent_issuekey
               ,summary
           from bireport_stg.issue_with_parent_t t
          where t.issuekey = 'DATAMAP-60'
         union all
         select coalesce (h.lv, 0) + 1 lv
               ,a.issuekey
               ,a.parent_issuekey
               ,a.summary
           from bireport_stg.issue_with_parent_t a
                join h on a.parent_issuekey = h.issuekey)
select *
  from h
-- Рекурсивный запрос - все родители
with h(lv, issuekey, parent_issuekey) As
        (
        SELECT
              0 lv
            , issuekey
            , parent_issuekey
        FROM bireport_stg.issue_with_parent_t t
        where t.issuekey = 'DATAMAP-102'
UNION ALL
        SELECT coalesce(h.lv, 0)-1 lv
            , a.issuekey
            , a.parent_issuekey
        FROM bireport_stg.issue_with_parent_t a
        JOIN h ON h.parent_issuekey = a.issuekey
        )
select lv, i.*
FROM h
left join bireport_stg.issue_with_parent_t i
on h.issuekey = i.issuekey


select * from bireport_stg.biteam_sdim;


-- Рекурсивный запрос - полная иерархия
drop view bireport_stg.deep_issue_hierarchy_t;

create or replace view bireport_stg.deep_issue_hierarchy_t
as
   with ct
        as (select c1.parent_issuekey p
                  ,c1.child_issuekey  c1
                  ,c2.child_issuekey  c2
                  ,c3.child_issuekey  c3
                  ,c4.child_issuekey  c4
                  ,c5.child_issuekey  c5
                  ,c6.child_issuekey  c6
                  ,c7.child_issuekey  c7
              from bireport_stg.parent_child_hierarchy c1
                   left join bireport_stg.parent_child_hierarchy c2
                      on c1.child_issuekey = c2.parent_issuekey
                   left join bireport_stg.parent_child_hierarchy c3
                      on c2.child_issuekey = c3.parent_issuekey
                   left join bireport_stg.parent_child_hierarchy c4
                      on c3.child_issuekey = c4.parent_issuekey
                   left join bireport_stg.parent_child_hierarchy c5
                      on c4.child_issuekey = c5.parent_issuekey
                   left join bireport_stg.parent_child_hierarchy c6
                      on c5.child_issuekey = c6.parent_issuekey
                   left join bireport_stg.parent_child_hierarchy c7
                      on c6.child_issuekey = c7.parent_issuekey
             where c1.parent_issuekey is not null)
     select parent_issuekey
           ,child_issuekey
           ,d
       from (select p parent_issuekey
                   ,c1 child_issuekey
                   ,1 d
               from ct
              where c1 is not null
             union all
             select p parent_issuekey
                   ,c2 child_issuekey
                   ,2 d
               from ct
              where c2 is not null
             union all
             select p parent_issuekey
                   ,c3 child_issuekey
                   ,3 d
               from ct
              where c3 is not null
             union all
             select p parent_issuekey
                   ,c4 child_issuekey
                   ,4 d
               from ct
              where c4 is not null
             union all
             select p parent_issuekey
                   ,c5 child_issuekey
                   ,5 d
               from ct
              where c5 is not null
             union all
             select p parent_issuekey
                   ,c6 child_issuekey
                   ,6 d
               from ct
              where c6 is not null
             union all
             select p parent_issuekey
                   ,c7 child_issuekey
                   ,7 d
               from ct
              where c7 is not null)
   group by parent_issuekey, child_issuekey, d;



drop view bireport_stg.deep_issue_hierarchy_t;

create or replace view bireport_stg.deep_issue_hierarchy_t
as
   select p.issuekey  parent_issuekey
         ,c.issuekey  child_issuekey
         ,c.lv - p.lv d
     from bireport_stg.issue_hierarchy_t p
          join bireport_stg.issue_hierarchy_t c
             on     p.keypath = substr (c.keypath, 1, length (p.keypath))
                and p.lv <= c.lv;

select count (1) c from bireport_stg.issue_hierarchy_t;

select count (1) c from bireport_stg.deep_issue_hierarchy_t;

select count (1) c from bireport_stg.deep_issue_hierarchy_t;

select count (1) c
  from bireport_stg.deep_issue_hierarchy_t
 where d <> md;

select *
  from bireport_stg.deep_issue_hierarchy_t
 where c > 1;

select *
  from bireport_stg.deep_issue_hierarchy_t
 where parent_issuekey = 'DATAMAP-60';


select * from bireport_stg.deep_issue_hierarchy_t;

commit;



  select parent_issuekey
        ,count (1) c
    from bireport_stg.deep_issue_hierarchy_t
   where parent_issuekey like 'BIPPM-%'
group by parent_issuekey
order by 2 desc;

select *
  from bireport_stg.worklog_hist_t
 where mh_remaining_estimate > 0 and issuekey like 'DATAMAP%';


drop view bireport_stg.estimate_itervals_t;

create or replace view bireport_stg.estimate_itervals_t
as
   with ct
        as (  select issuekey
                    ,dt
                    ,max (to_v) / 3600 x                         --mh_estimate
                from (select issuekey
                            ,substr (ts, 1, 10) dt
                            ,to_v
                        from bireport_stg.changelog_t
                       where field = 'timeestimate')
            group by issuekey, dt)
     select a.issuekey
           ,to_date (a.dt, 'YYYY-MM-DD') effective_from
           ,to_date (coalesce (min (b.dt), '5999-12-31'), 'YYYY-MM-DD')
               effective_to
           ,a.x
       from ct a left join ct b on a.issuekey = b.issuekey and a.dt < b.dt
   group by a.issuekey, a.dt, a.x;

select *
  from bireport_stg.changelog_t
 where field = 'timeestimate';



select * from bireport_stg.deep_worklog_t;

select * from bireport_stg.deep_worklog_agg;

select parent_issuekey
      ,started
      ,mh_acc
      ,mh_remaining_estimate
      ,mh_total
  from bireport_stg.deep_worklog_agg;



create or replace view bireport_stg.worklog_for_status
as
   select a.issuekey
         ,a.updateauthor
         ,a.updated
         ,round (a.secondsspent / 3600, 3) as hrs_spent
         , (select round (sum (secondsspent) / 3600, 3)
              from bireport_stg.worklog_t
             where issuekey = a.issuekey and updated <= a.updated)
             as spent_by_this_time
         , (select round (sum (secondsspent) / 3600, 3)
              from bireport_stg.worklog_t
             where     issuekey = a.issuekey
                   and trunc (updated, 'DD') = trunc (a.updated, 'DD'))
             as spent_this_day
         , (select round (sum (secondsspent) / 3600, 3)
              from bireport_stg.worklog_t
             where     issuekey = a.issuekey
                   and trunc (updated, 'DD') <= trunc (a.updated, 'DD'))
             as spent_by_the_end_of_day
         , (select round (sum (secondsspent) / 3600, 3)
              from bireport_stg.worklog_t
             where issuekey = a.issuekey)
             as spent_total
         ,case
             when i.timeestimate is null
             then
                i.timeestimate
             else
                  round (i.timeestimate / 3600, 3)
                + (select round (sum (secondsspent) / 3600, 3)
                     from bireport_stg.worklog_t
                    where issuekey = a.issuekey)
                - (select round (sum (secondsspent) / 3600, 3)
                     from bireport_stg.worklog_t
                    where issuekey = a.issuekey and updated <= a.updated)
          end
             as remaining_estimate
     from bireport_stg.worklog_t a
          left join bireport_stg.issue_t i on i.issuekey = a.issuekey;



drop view bireport_stg.worklog_hist_t;

create or replace view bireport_stg.worklog_hist_t
as
   select issuekey
         ,id
         ,author
         ,updateauthor
         ,text
         ,created
         ,updated
         ,started
         ,secondsspent
         ,secondsspent / 3600 mh_spent
         --         , (select round (sum (b.secondsspent) / 3600, 3)
         --              from bireport_stg.worklog_t b
         --             where b.issuekey = a.issuekey and b.started <= a.started)
         --             mh_acc
         , (select coalesce (round (max (i.x), 3), 0) mh_remaining_estimate
              from bireport_stg.estimate_itervals_t i
             where     a.issuekey = i.issuekey
                   and i.effective_from <= a.started
                   and a.started < i.effective_to)
             mh_remaining_estimate
     from bireport_stg.worklog_t a;



create or replace view bireport_stg.deep_worklog_t
as
   select h.parent_issuekey
         ,w.*
     from bireport_stg.deep_issue_hierarchy_t h
          join bireport_stg.worklog_hist_t w on h.child_issuekey = w.issuekey;


create or replace view bireport_stg.deep_worklog_agg
as
select q.*, sum (mh_acc) + sum (mh_remaining_estimate) mh_total
 from (
     select parent_issuekey
           ,started
           , (select round (sum (b.secondsspent) / 3600, 3)
                from bireport_stg.worklog_t b
               where b.issuekey = a.issuekey and b.started <= a.started)
               mh_acc
           ,sum (mh_remaining_estimate) mh_remaining_estimate
       from bireport_stg.deep_worklog_t
   group by parent_issuekey, started
   ) q;


  select parent_issuekey
        ,started
        ,mh_acc
        ,mh_remaining_estimate
        ,mh_total
    from bireport_stg.deep_worklog_agg
   where parent_issuekey = 'DATAMAP-60'
order by started;