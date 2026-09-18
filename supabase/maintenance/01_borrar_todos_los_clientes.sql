-- BORRA TODOS LOS CLIENTES.
-- Tambien borra visitas, cortesias y bitacora relacionada.
-- No borra usuarios/admins/barberos/servicios/configuracion.
-- Las fotos del bucket client-photos se borran desde Storage, porque Supabase
-- no permite borrarlas directo desde SQL.
begin;

delete from public.courtesies;
delete from public.visits;

delete from public.audit_log
where entity in ('client','visit','courtesy','visits')
   or action in ('lookup','demo_seed','demo_reset');

delete from public.clients;

commit;

select 'clientes_restantes' as dato, count(*) as total from public.clients
union all
select 'visitas_restantes' as dato, count(*) as total from public.visits
union all
select 'cortesias_restantes' as dato, count(*) as total from public.courtesies;
