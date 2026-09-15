-- Deletes only fictional DEMO clients and their related demo history.
-- Real clients and staff/login users are not changed.
begin;

delete from public.courtesies co
using public.clients c
where co.client_id=c.id and c.is_demo;

delete from public.visits v
using public.clients c
where v.client_id=c.id and c.is_demo;

delete from public.audit_log
where entity='client'
  and entity_id in (select id::text from public.clients where is_demo);

delete from public.clients
where is_demo;

commit;

select count(*) as demos_restantes
from public.clients
where is_demo;
