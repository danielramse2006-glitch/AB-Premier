import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('Database authorization, visit rules, courtesies and audit',async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`);
 await db.exec(fs.readFileSync('supabase/migrations/202609060001_initial.sql','utf8'));
 const admin='00000000-0000-0000-0000-000000000001',reader='00000000-0000-0000-0000-000000000002',outsider='00000000-0000-0000-0000-000000000003';
 await db.exec(`insert into auth.users(id,email) values('${admin}','admin@example.test'),('${reader}','reader@example.test'),('${outsider}','outsider@example.test');insert into public.profiles(id,full_name,role) values('${admin}','Admin','admin'),('${reader}','Reader','consulta');`);
 const login=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role);};
 const rpc=async(action,p={})=>(await db.query('select public.ab_api($1,$2::jsonb) result',[action,JSON.stringify(p)])).rows[0].result;
 await login('', 'anon');await assert.rejects(()=>rpc('dashboard'),/permission denied/);
 await login(outsider);await assert.rejects(()=>rpc('dashboard'),/Acceso restringido/);
 await assert.rejects(()=>db.exec("insert into public.profiles values('00000000-0000-0000-0000-000000000003','Hacker','admin',true,now())"),/permission denied/);
 await login(admin);await assert.rejects(()=>db.exec('select * from public.clients'),/permission denied/);
 const c=await rpc('register',{full_name:'Cliente de prueba',birth_date:'1990-01-01'});assert.match(c.code,/^\d{4}$/);
 let visit=await rpc('visit',{code:c.code,barber_id:1,service_id:1,points:999999,courtesy_won:true});
 assert.equal(visit.points_earned,50);assert.equal(visit.courtesy_won,false);
 await assert.rejects(()=>rpc('visit',{code:c.code,barber_id:1,service_id:1}),/ya tiene una visita/);
 assert.equal((await rpc('lookup',{code:c.code})).client.points,50);
 for(let i=2;i<=5;i++){
  await db.exec('reset role');await db.exec("update public.visits set visit_day=visit_day-1,visited_at=visited_at-interval '1 day'");await login(admin);
  visit=await rpc('visit',{code:c.code,barber_id:1,service_id:1});
 }
 assert.equal(visit.visit_number,5);assert.equal(visit.courtesy_won,true);assert.equal(visit.total_points,250);
 const courtesy=(await rpc('courtesies')).courtesies[0];await rpc('redeem',{id:courtesy.id});await assert.rejects(()=>rpc('redeem',{id:courtesy.id}),/ya fue entregada/);
 await login(reader);await assert.rejects(()=>rpc('visit',{code:c.code,barber_id:1,service_id:1}),/solo tiene permiso/);
 await assert.rejects(()=>rpc('save_catalog',{type:'barber',name:'Unauthorized'}),/Solo el administrador/);
 await assert.rejects(()=>rpc('save_admin',{username:'reader@example.test',role:'admin'}),/Solo el administrador/);
 assert.equal((await rpc('dashboard')).clients.length,1);
 await assert.rejects(()=>db.exec("insert into storage.objects(bucket_id,name) values('client-photos','1/x.jpg')"),/row-level security/);
 await login(outsider);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await login(admin);assert.ok((await rpc('audit_log')).entries.length>=8);
 await assert.rejects(()=>rpc('set_admin',{id:admin,active:false}),/propia cuenta/);
 await db.exec('reset role');await db.exec(`update public.profiles set active=false where id='${reader}'`);await login(reader);
 await assert.rejects(()=>rpc('dashboard'),/Acceso restringido/);
 await db.close();
});
