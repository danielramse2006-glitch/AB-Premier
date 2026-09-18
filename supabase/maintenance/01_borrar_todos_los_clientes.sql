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

select
 (select count(*) from public.clients) as clientes_restantes,
 (select count(*) from public.visits) as visitas_restantes,
 (select count(*) from public.courtesies) as cortesias_restantes,
 (select count(*) from storage.objects where bucket_id='client-photos') as fotos_pendientes_en_storage;
