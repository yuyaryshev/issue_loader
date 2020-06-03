drop table t;
create table t(k varchar2(100), dt varchar2(100), x number);
insert into t(k,dt,x) values ('k',10,   10);
insert into t(k,dt,x) values ('k',20,  200);
insert into t(k,dt,x) values ('k',30, 3000);
insert into t(k,dt,x) values ('k2',12,   40000);
insert into t(k,dt,x) values ('k2',27,  500000);
insert into t(k,dt,x) values ('k2',30, 6000000);

commit;

------------------

select * from t;

-- accumulate events to interval stats
-- table(k, dt, x) -> table(k, effective_from, effective_to, x)
            
--drop table tt;
create table tt as 
    select 
        'k' k
        ,a.k k2    
        ,b.dt effective_from
        ,( select 
            coalesce(min(c.dt), '5999-12-31') 
            from t c
        where b.dt < c.dt
        and a.k = c.k 
        ) effective_to         
        , sum(a.x) x
    from t a
    join t b
        on a.dt <= b.dt
        and a.k = b.k 
    group by a.k, b.dt
    order by 1,2,3,4
    ;

--TEST1 EXPECTED_RESULT
create table te(k, effective_from, effective_to, x);
insert into te(k,effective_from, effective_to,x) values ('k', 10, 2, 10);
insert into te(k,effective_from, effective_to,x) values ('k', 20, 3, 210);
insert into te(k,effective_from, effective_to,x) values ('k', 30, '5999-12-31', 3210);
insert into te(k,effective_from, effective_to,x) values ('k2', 12, 2, 10000);
insert into te(k,effective_from, effective_to,x) values ('k2', 27, 3, 210000);
insert into te(k,effective_from, effective_to,x) values ('k2', 30, '5999-12-31', 3210000);


-- aggregate interval stats
--table(k, k2, effective_from, effective_to, x) -> table(k, effective_from, effective_to, x)

select * from tt order by 1,2,3;

;
with ct as (
    select distinct a.k, a.effective_from from tt a
    )
    select 
        a.k
        ,a.effective_from
        ,(select coalesce(min(c.effective_from), '5999-12-31') 
            from ct c 
            where a.effective_from < c.effective_from and a.k = c.k
            ) effective_to
      , sum(b.x) x
    from ct a
    join tt b
        on  b.effective_from <= a.effective_from and a.effective_from < b.effective_to
        and a.k = b.k
    group by
        a.k,
        a.effective_from
order by 1,2,3;
;


-- join interval stats
--table A(k, effective_from, effective_to, x) + table B(k, effective_from, effective_to, y) -> table(k, effective_from, effective_to, x, y)
with ct as (
    select a.k, a.effective_from from A a
    union
    select b.k, b.effective_from from B b
    )
select 
     a.k
    ,a.effective_from
    ,(select coalesce(min(c.effective_from), '5999-12-31') 
        from ct c 
        where a.effective_from < c.effective_from and a.k = c.k
        ) effective_to
  , a.x
  , b.y
from ct d
join A a
    on  a.effective_from <= d.effective_from and d.effective_from < a.effective_to
    and d.k = a.k
join B b
    on  b.effective_from <= d.effective_from and d.effective_from < b.effective_to
    and d.k = b.k




