-- AB Premier: execute this entire file once in Supabase SQL Editor.
begin;
create schema if not exists ab_private;
revoke all on schema ab_private from public;
grant usage on schema ab_private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id), full_name text not null,
 role text not null check(role in ('admin','recepcion','consulta')),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.clients (
 id bigint generated always as identity primary key,
 code text unique not null check(code ~ '^[0-9]{4}$'),
 full_name text not null check(length(trim(full_name)) between 3 and 160),
 birth_date date, phone text not null default '' check(length(phone)<=30),
 photo_path text not null default '', points integer not null default 0 check(points>=0),
 active boolean not null default true, created_at timestamptz not null default now(), deactivated_at timestamptz
);
create table public.barbers (
 id bigint generated always as identity primary key, name text not null check(length(trim(name)) between 2 and 120),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.services (
 id bigint generated always as identity primary key, name text not null check(length(trim(name)) between 2 and 120),
 description text not null default '', price numeric(10,2) not null default 0 check(price>=0),
 points integer not null default 50 check(points between 0 and 100000), active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.visits (
 id bigint generated always as identity primary key,
 client_id bigint not null references public.clients(id), barber_id bigint not null references public.barbers(id),
 service_id bigint not null references public.services(id), visited_at timestamptz not null default now(),
 visit_day date not null default (now() at time zone 'America/Matamoros')::date,
 points_earned integer not null check(points_earned>=0), visit_number integer not null check(visit_number>0),
 courtesy_won boolean not null, created_by uuid not null references auth.users(id),
 unique(client_id,visit_day), unique(client_id,visit_number)
);
create index visits_time on public.visits(visited_at);
create table public.courtesies (
 id bigint generated always as identity primary key, client_id bigint not null references public.clients(id),
 visit_number integer not null, status text not null default 'pending' check(status in ('pending','redeemed')),
 earned_at timestamptz not null default now(), redeemed_at timestamptz, redeemed_by uuid references auth.users(id),
 unique(client_id,visit_number)
);
create table public.audit_log (
 id bigint generated always as identity primary key, user_id uuid references auth.users(id),
 action text not null, entity text not null, entity_id text,
 details jsonb not null default '{}', created_at timestamptz not null default now()
);
create function ab_private.staff_role() returns text language sql stable security definer set search_path=''
as $$ select role from public.profiles where id=auth.uid() and active $$;
revoke all on function ab_private.staff_role() from public,anon;
grant execute on function ab_private.staff_role() to authenticated;
do $$ declare t text; begin
 foreach t in array array['profiles','clients','barbers','services','visits','courtesies','audit_log'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
-- No direct table API access: all reads and writes use the checked RPC below.
create function ab_private.audit(p_action text,p_entity text,p_id text,p_details jsonb default '{}')
returns void language sql security definer set search_path='' as $$
 insert into public.audit_log(user_id,action,entity,entity_id,details)
 values(auth.uid(),p_action,p_entity,p_id,p_details)
$$;
revoke all on function ab_private.audit(text,text,text,jsonb) from public,anon,authenticated;

create function public.ab_api(action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 r text; c public.clients; svc public.services; n integer; pts integer; ident bigint;
 result jsonb; rows_json jsonb; rows2 jsonb; chosen_code text; before_json jsonb; uid uuid;
 today date := (now() at time zone 'America/Matamoros')::date;
begin
 r:=ab_private.staff_role();
 if r is null then raise exception 'Acceso restringido: inicia sesión con un usuario autorizado.' using errcode='42501'; end if;
 if action in ('register','visit','save_client','set_photo','redeem') and r not in ('admin','recepcion') then
  raise exception 'Tu cuenta solo tiene permiso de consulta.' using errcode='42501';
 end if;
 if action in ('save_catalog','save_admin','set_admin') and r<>'admin' then
  raise exception 'Solo el administrador puede realizar esta acción.' using errcode='42501';
 end if;
 case action
 when 'session' then
  return jsonb_build_object('authenticated',true,'user',jsonb_build_object('username',(select email from auth.users where id=auth.uid()),'role',r));
 when 'catalogs','admin_catalogs' then
  select coalesce(jsonb_agg(to_jsonb(b) order by b.name),'[]') into rows_json from public.barbers b where action='admin_catalogs' or b.active;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.name),'[]') into rows2 from public.services s where action='admin_catalogs' or s.active;
  return jsonb_build_object('barbers',rows_json,'services',rows2);
 when 'register' then
  if length(trim(p->>'full_name'))<3 or p->>'full_name' is null then raise exception 'Escribe el nombre completo.'; end if;
  if nullif(p->>'birth_date','')::date>today then raise exception 'La fecha de nacimiento no puede ser futura.'; end if;
  perform pg_advisory_xact_lock(20260906);
  select lpad(x::text,4,'0') into chosen_code from generate_series(0,9999) x
   where not exists(select 1 from public.clients z where z.code=lpad(x::text,4,'0')) order by random() limit 1;
  if chosen_code is null then raise exception 'Se agotaron los códigos disponibles.'; end if;
  insert into public.clients(code,full_name,birth_date,phone)
   values(chosen_code,trim(p->>'full_name'),nullif(p->>'birth_date','')::date,coalesce(p->>'phone','')) returning * into c;
  perform ab_private.audit('create','client',c.id::text);
  return jsonb_build_object('id',c.id,'code',c.code,'name',c.full_name);
 when 'lookup' then
  select * into c from public.clients where code=p->>'code';
  if not found then raise exception 'Código no encontrado.'; end if;
  select count(*) into n from public.visits where client_id=c.id;
  select coalesce(jsonb_agg(q.pct order by q.day),'[]') into rows_json from (
   select d.day,case when n=0 then 0 else round(100.0*(select count(*) from public.visits v where v.client_id=c.id and extract(dow from v.visit_day)=d.day)/n,1) end pct
   from generate_series(0,6) d(day)) q;
  perform ab_private.audit('lookup','client',c.id::text);
  return jsonb_build_object('client',to_jsonb(c)||jsonb_build_object('visits',n,'last_visit',(select max(visited_at) from public.visits where client_id=c.id),
   'next_courtesy',((n/5)+1)*5,'one_away',(n+1)%5=0,'birthday_month',extract(month from c.birth_date)=extract(month from today),'weekday_percentages',rows_json));
 when 'visit' then
  select * into c from public.clients where code=p->>'code' for update;
  if not found then raise exception 'Cliente no encontrado.'; end if;
  if exists(select 1 from public.visits where client_id=c.id and visit_day=today) then raise exception 'Este cliente ya tiene una visita registrada hoy.'; end if;
  if not exists(select 1 from public.barbers where id=(p->>'barber_id')::bigint and active) then raise exception 'Selecciona un barbero válido.'; end if;
  select * into svc from public.services where id=(p->>'service_id')::bigint and active for share;
  if not found then raise exception 'Selecciona un servicio válido.'; end if;
  select count(*)+1 into n from public.visits where client_id=c.id;
  insert into public.visits(client_id,barber_id,service_id,points_earned,visit_number,courtesy_won,created_by)
   values(c.id,(p->>'barber_id')::bigint,svc.id,svc.points,n,n%5=0,auth.uid()) returning id into ident;
  update public.clients set points=points+svc.points,active=true,deactivated_at=null where id=c.id;
  if n%5=0 then insert into public.courtesies(client_id,visit_number) values(c.id,n); end if;
  perform ab_private.audit('create','visit',ident::text,jsonb_build_object('points',svc.points,'number',n));
  return jsonb_build_object('visit_number',n,'points_earned',svc.points,'total_points',c.points+svc.points,'courtesy_won',n%5=0,'message','Visita registrada correctamente.');
 when 'dashboard' then
  -- Persist inactivity when the dashboard is consulted; the same routine can be scheduled.
  with changed as (
   update public.clients cl set active=false,deactivated_at=now() where cl.active and
    coalesce((select max(v.visited_at) from public.visits v where v.client_id=cl.id),cl.created_at)<now()-interval '45 days'
   returning id)
  insert into public.audit_log(user_id,action,entity,entity_id) select auth.uid(),'deactivate','client',id::text from changed;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.full_name),'[]') into rows_json from (
   select cl.*,count(v.id)::integer visits,max(v.visited_at) last_visit,
    count(v.id) filter(where date_trunc('month',v.visit_day)=date_trunc('month',today))::integer month_visits,
    floor(extract(epoch from(now()-coalesce(max(v.visited_at),cl.created_at)))/86400)::integer days_absent
   from public.clients cl left join public.visits v on v.client_id=cl.id group by cl.id) q;
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows2 from (
   select visit_day as "day",count(*)::integer total from public.visits where visit_day>=least(today-30,date_trunc('month',today)::date) group by visit_day order by visit_day) q;
  return jsonb_build_object('clients',rows_json,'days',rows2,'today',today);
 when 'visits','export' then
  select coalesce(jsonb_agg(to_jsonb(q) order by q.visited_at desc),'[]') into rows_json from (
   select v.*,cl.code,cl.full_name,b.name barber,s.name service from public.visits v
   join public.clients cl on cl.id=v.client_id join public.barbers b on b.id=v.barber_id join public.services s on s.id=v.service_id
   where (nullif(p->>'from','') is null or v.visit_day>= (p->>'from')::date)
    and(nullif(p->>'to','') is null or v.visit_day<=(p->>'to')::date)
    and(nullif(p->>'barber_id','') is null or v.barber_id=(p->>'barber_id')::bigint)
    and(nullif(p->>'service_id','') is null or v.service_id=(p->>'service_id')::bigint)) q;
  if action='export' then perform ab_private.audit('export','visits',null,p); end if;
  return jsonb_build_object('visits',rows_json);
 when 'save_client' then
  select to_jsonb(cl) into before_json from public.clients cl where id=(p->>'id')::bigint;
  if before_json is null then raise exception 'Cliente no encontrado.'; end if;
  if nullif(p->>'birth_date','')::date>today then raise exception 'La fecha de nacimiento no puede ser futura.'; end if;
  update public.clients set full_name=trim(p->>'full_name'),birth_date=nullif(p->>'birth_date','')::date,
   phone=coalesce(p->>'phone',''),active=(p->>'active')::boolean,
   deactivated_at=case when (p->>'active')::boolean then null else now() end where id=(p->>'id')::bigint;
  perform ab_private.audit('update','client',p->>'id',jsonb_build_object('before',before_json-'photo_path','after',p));
 when 'set_photo' then
  if p->>'path' not like (p->>'id')||'/%' then raise exception 'Ruta de foto inválida.'; end if;
  update public.clients set photo_path=p->>'path' where id=(p->>'id')::bigint;
  if not found then raise exception 'Cliente no encontrado.'; end if;
  perform ab_private.audit('photo','client',p->>'id');
 when 'save_catalog' then
  ident:=nullif(p->>'id','')::bigint;
  if p->>'type'='barber' then
   if ident is null then insert into public.barbers(name) values(trim(p->>'name')) returning id into ident;
   else update public.barbers set name=trim(p->>'name'),active=(p->>'active')::boolean where id=ident; end if;
  elsif p->>'type'='service' then
   if ident is null then insert into public.services(name,description,price,points)
    values(trim(p->>'name'),coalesce(p->>'description',''),coalesce(nullif(p->>'price','')::numeric,0),coalesce(nullif(p->>'points','')::integer,50)) returning id into ident;
   else update public.services set name=trim(p->>'name'),description=coalesce(p->>'description',''),price=(p->>'price')::numeric,points=(p->>'points')::integer,active=(p->>'active')::boolean where id=ident; end if;
  else raise exception 'Tipo de catálogo inválido.'; end if;
  perform ab_private.audit('update','catalog',ident::text,p);
 when 'courtesies' then
  select coalesce(jsonb_agg(to_jsonb(q) order by q.earned_at desc),'[]') into rows_json from (
   select co.*,cl.code,cl.full_name from public.courtesies co join public.clients cl on cl.id=co.client_id) q;
  return jsonb_build_object('courtesies',rows_json);
 when 'redeem' then
  update public.courtesies set status='redeemed',redeemed_at=now(),redeemed_by=auth.uid() where id=(p->>'id')::bigint and status='pending';
  if not found then raise exception 'La cortesía ya fue entregada o no existe.'; end if;
  perform ab_private.audit('redeem','courtesy',p->>'id');
 when 'admins' then
  if r<>'admin' then return jsonb_build_object('admins','[]'::jsonb); end if;
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows_json from (
   select pr.*,u.email username,u.last_sign_in_at last_login from public.profiles pr join auth.users u on u.id=pr.id) q;
  return jsonb_build_object('admins',rows_json);
 when 'save_admin' then
  select id into uid from auth.users where lower(email)=lower(trim(p->>'username'));
  if uid is null then raise exception 'Primero crea esta cuenta en Supabase: Authentication → Users → Add user.'; end if;
  if coalesce(p->>'role','recepcion') not in ('admin','recepcion','consulta') then raise exception 'Rol inválido.'; end if;
  if uid=auth.uid() then raise exception 'No puedes cambiar tus propios permisos.'; end if;
  insert into public.profiles(id,full_name,role) values(uid,trim(p->>'full_name'),coalesce(p->>'role','recepcion'))
   on conflict(id) do update set full_name=excluded.full_name,role=excluded.role,active=true;
  perform ab_private.audit('authorize','admin',uid::text,p);
 when 'set_admin' then
  uid:=(p->>'id')::uuid;
  if uid=auth.uid() then raise exception 'No puedes desactivar tu propia cuenta.'; end if;
  update public.profiles set active=(p->>'active')::boolean where id=uid;
  perform ab_private.audit('update','admin',uid::text,p);
 when 'audit_log' then
  if r<>'admin' then return jsonb_build_object('entries','[]'::jsonb); end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.id desc),'[]') into rows_json from (
   select l.*,coalesce(pr.full_name,'Sistema') admin_name from public.audit_log l left join public.profiles pr on pr.id=l.user_id order by l.id desc limit 500) q;
  return jsonb_build_object('entries',rows_json);
 else raise exception 'Acción desconocida.';
 end case;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.ab_api(text,jsonb) from public,anon;
grant execute on function public.ab_api(text,jsonb) to authenticated;

insert into public.barbers(name) values('Barbero principal'),('Barbero 2');
insert into public.services(name,description,price,points) values
 ('Corte clásico','Corte de cabello',0,50),('Corte y barba','Servicio completo',0,75),('Barba','Perfilado de barba',0,40);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('client-photos','client-photos',false,4194304,array['image/jpeg','image/png']);
create policy ab_photos_read on storage.objects for select to authenticated
 using(bucket_id='client-photos' and ab_private.staff_role() is not null);
create policy ab_photos_insert on storage.objects for insert to authenticated
 with check(bucket_id='client-photos' and ab_private.staff_role() in ('admin','recepcion'));
-- Photos use unique names; no overwrites or public listing are authorized.
commit;
