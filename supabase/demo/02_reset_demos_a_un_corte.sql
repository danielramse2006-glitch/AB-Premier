-- Resets only fictional DEMO clients so each one is one visit away from a reward.
-- Real clients are not deleted or changed.
begin;

do $$
declare
 demo record; demo_code text; client_key bigint; existing public.clients;
 staff uuid; barber bigint; service bigint; i integer; history_day date;
 today date := (now() at time zone 'America/Matamoros')::date;
begin
 select id into staff from public.profiles where active and role='admin' order by created_at limit 1;
 if staff is null then raise exception 'Primero crea un administrador.'; end if;
 select id into barber from public.barbers where active order by id limit 1;
 select id into service from public.services where active order by id limit 1;
 if barber is null or service is null then raise exception 'Se necesita un barbero y un servicio activos.'; end if;

 for demo in select * from (values
  (1,5),(2,10),(3,15),(4,20),(5,25),(6,28),(7,32),(8,35),(9,5),(10,10)
 ) as x(demo_no,target_cut) loop
  demo_code:='90'||lpad(demo.demo_no::text,2,'0');
  select * into existing from public.clients where code=demo_code;
  if found and not existing.is_demo then
   raise exception 'El codigo % pertenece a un cliente real. No se modifico ningun dato.', demo_code;
  end if;
 end loop;

 delete from public.courtesies co using public.clients c where co.client_id=c.id and c.is_demo;
 delete from public.visits v using public.clients c where v.client_id=c.id and c.is_demo;
 delete from public.audit_log where entity='client' and entity_id in (select id::text from public.clients where is_demo);
 delete from public.clients where is_demo;

 perform pg_advisory_xact_lock(20260906);
 for demo in select * from (values
  (1,5),(2,10),(3,15),(4,20),(5,25),(6,28),(7,32),(8,35),(9,5),(10,10)
 ) as x(demo_no,target_cut) loop
  demo_code:='90'||lpad(demo.demo_no::text,2,'0');
  insert into public.clients(code,full_name,birth_date,phone,is_demo,created_at)
   values(demo_code,'Panchito '||demo.demo_no,(today-interval '30 years')::date,'',true,now()-interval '40 days')
   returning id into client_key;

  for i in 1..demo.target_cut-1 loop
   history_day:=today-(demo.target_cut-i);
   insert into public.visits(client_id,barber_id,service_id,visited_at,visit_day,points_earned,visit_number,courtesy_won,created_by)
   values(client_key,barber,service,(history_day+time '12:00') at time zone 'America/Matamoros',history_day,0,i,exists(select 1 from ab_private.rewards where cut=i),staff);

   insert into public.courtesies(client_id,visit_number,prize_name,earned_at,status,redeemed_at,redeemed_by)
    select client_key,i,name,(history_day+time '12:00') at time zone 'America/Matamoros','redeemed',(history_day+time '12:05') at time zone 'America/Matamoros',staff
    from ab_private.rewards where cut=i;
  end loop;

  insert into public.audit_log(user_id,action,entity,entity_id,details)
  values(staff,'demo_reset','client',client_key::text,jsonb_build_object('next_reward_cut',demo.target_cut,'current_cuts',demo.target_cut-1,'fictional',true));
 end loop;
end $$;

commit;

select c.code,c.full_name,count(v.id) as cortes_actuales
from public.clients c
left join public.visits v on v.client_id=c.id
where c.is_demo
group by c.id
order by c.code;
