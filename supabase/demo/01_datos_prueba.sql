-- Run AFTER 202609060002_rewards.sql. Adds 8 clearly marked fictional clients.
-- Running again does NOT reset clients, real data, or earned rewards.
begin;
do $$
declare
 target integer; demo_code text; client_key bigint; existing public.clients;
 staff uuid; barber bigint; service bigint; i integer; history_day date;
 today date := (now() at time zone 'America/Matamoros')::date;
begin
 select id into staff from public.profiles where active and role='admin' order by created_at limit 1;
 if staff is null then raise exception 'Primero crea un administrador.'; end if;
 select id into barber from public.barbers where active order by id limit 1;
 select id into service from public.services where active order by id limit 1;
 if barber is null or service is null then raise exception 'Se necesita un barbero y un servicio activos.'; end if;
 perform pg_advisory_xact_lock(20260906);
 foreach target in array array[5,10,15,20,25,28,32,35] loop
  demo_code:='91'||lpad(target::text,2,'0');
  select * into existing from public.clients where code=demo_code;
  if found then
   if not existing.is_demo then raise exception 'El código % pertenece a un cliente real. No se modificó ningún dato.',demo_code; end if;
   continue;
  end if;
  insert into public.clients(code,full_name,birth_date,phone,is_demo,created_at)
   values(demo_code,'DEMO · Premio corte '||target, (today-interval '30 years')::date,'',true,now()-interval '40 days') returning id into client_key;
  for i in 1..target-1 loop
   history_day:=today-(target-i);
   insert into public.visits(client_id,barber_id,service_id,visited_at,visit_day,points_earned,visit_number,courtesy_won,created_by)
   values(client_key,barber,service,(history_day+time '12:00') at time zone 'America/Matamoros',history_day,0,i,exists(select 1 from ab_private.rewards where cut=i),staff);
   insert into public.courtesies(client_id,visit_number,prize_name,earned_at,status,redeemed_at,redeemed_by)
    select client_key,i,name,(history_day+time '12:00') at time zone 'America/Matamoros','redeemed',(history_day+time '12:05') at time zone 'America/Matamoros',staff from ab_private.rewards where cut=i;
  end loop;
  insert into public.audit_log(user_id,action,entity,entity_id,details)
  values(staff,'demo_seed','client',client_key::text,jsonb_build_object('target_cut',target,'fictional',true));
 end loop;
end $$;
commit;
select c.code,c.full_name,count(v.id) as cortes_actuales from public.clients c
left join public.visits v on v.client_id=c.id where c.is_demo group by c.id order by c.code;
