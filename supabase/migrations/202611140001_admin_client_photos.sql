begin;

alter function public.ab_api(text,jsonb) set schema ab_private;
revoke execute on function ab_private.ab_api(text,jsonb) from authenticated;

create function public.ab_api(action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if action='set_photo' then
  if ab_private.staff_role() is distinct from 'admin' then
   raise exception 'Solo el administrador puede cambiar la foto.' using errcode='42501';
  end if;
  if not exists (
   select 1 from storage.objects where bucket_id='client-photos' and name=p->>'path'
  ) then
   raise exception 'La imagen no está disponible.';
  end if;
 end if;
 return ab_private.ab_api(action,p);
end $$;

revoke all on function public.ab_api(text,jsonb) from public,anon;
grant execute on function public.ab_api(text,jsonb) to authenticated;

drop policy if exists ab_photos_insert on storage.objects;
create policy ab_photos_insert on storage.objects for insert to authenticated
 with check(bucket_id='client-photos' and ab_private.staff_role()='admin');

commit;
