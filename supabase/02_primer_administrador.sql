-- First create your account in Authentication > Users > Add user > Create new user.
-- Replace only the email below with YOUR exact email. Run this in SQL Editor.
do $$
declare account_id uuid; account_email text := 'CAMBIA_ESTO_POR_TU_CORREO';
begin
 select id into account_id from auth.users where lower(email)=lower(account_email);
 if account_id is null then raise exception 'No existe ese correo en Authentication → Users. Crea la cuenta primero.'; end if;
 insert into public.profiles(id,full_name,role,active) values(account_id,'Administrador AB Premier','admin',true)
 on conflict(id) do update set role='admin',active=true;
end $$;
