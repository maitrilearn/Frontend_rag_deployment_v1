-- Run this in Supabase SQL Editor

-- Visit tracking table
create table if not exists page_visits (
  id         bigserial primary key,
  page       text not null,
  topic      text,
  referrer   text,
  country    text,
  device     text,
  created_at timestamp default now()
);

-- Index for fast queries
create index on page_visits (page);
create index on page_visits (created_at);

-- Daily stats view
create or replace view daily_stats as
select
  date_trunc('day', created_at) as date,
  page,
  count(*) as visits
from page_visits
group by 1, 2
order by 1 desc, 3 desc;

-- Topic popularity view
create or replace view topic_popularity as
select
  topic,
  count(*) as times_searched
from page_visits
where topic is not null
group by topic
order by times_searched desc;
