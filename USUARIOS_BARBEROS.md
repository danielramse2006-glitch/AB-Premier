# Usuarios barberos

Ejecuta primero `supabase/migrations/202609100001_barber_role.sql` en Supabase SQL Editor.

Para crear un barbero:

1. En Supabase ve a `Authentication` -> `Users` -> `Add user`.
2. Crea el correo y contraseña del barbero.
3. En el panel AB Premier entra a `Usuarios administrativos`.
4. Escribe el mismo correo y selecciona `Barbero: solo kiosco`.

El rol `barbero` solo puede usar el kiosco para:

- buscar socio por NIP
- registrar visita
- registrar socio nuevo
- subir foto del socio

No puede ver clientes completos, reportes, visitas, cortesias, usuarios, bitacora ni catalogos administrativos.

SQL directo si prefieres autorizarlo desde Supabase:

```sql
insert into public.profiles (id, full_name, role, active)
select id, 'NOMBRE DEL BARBERO', 'barbero', true
from auth.users
where lower(email) = lower('correo-del-barbero@gmail.com')
on conflict (id) do update
set full_name = excluded.full_name,
    role = 'barbero',
    active = true;
```
