-- Load speed -> 30-39k / day
select
      ts2
    , count(1)*6 items_per_hour
    , count(1)*6*24 items_per_day
from
    (
    select substr(ts,1,15)||'9:59' ts2
    from job_log
    where finished = 1 and type = 'writeIssueToDb' and step = 'Successful'
    ) a
group by ts2
