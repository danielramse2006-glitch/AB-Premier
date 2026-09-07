# Activar AB Premier en GitHub Pages y Supabase

El portal y el administrativo usan Supabase. No necesitan PHP ni Python en internet.

## 1. Crear las tablas

En tu proyecto AB-Premier de Supabase, abre **SQL Editor → New query**.
Abre `supabase/migrations/202609060001_initial.sql` en GitHub, pulsa **Raw** y copia todo el contenido.
Pégalo en SQL Editor y pulsa **Run**. Debe terminar sin errores. Ejecuta esta instalación una sola vez.
La operación crea las tablas, permisos, funciones de visitas y un espacio privado para las fotografías.
No importa tus bases locales ni elimina sus datos.

## 2. Crear tu acceso

En Supabase abre **Authentication → Users → Add user → Create new user**.
Introduce tu correo y una contraseña segura que guardarás tú. Si aparece **Auto Confirm User**, actívalo para esta cuenta creada por ti.
No compartas esa contraseña en GitHub ni en el chat.

Regresa a **SQL Editor → New query**. Copia `supabase/02_primer_administrador.sql`,
cambia `CAMBIA_ESTO_POR_TU_CORREO` por ese correo, conservando las comillas, y pulsa **Run**.
Esto autoriza tu cuenta como administrador. Registrarse en Supabase Auth por sí solo no otorga permisos.

## 3. Publicar

En GitHub abre **AB-Premier → Settings → Pages**.
En **Build and deployment → Source**, selecciona **GitHub Actions**.
En **Actions → Publish AB Premier** comprueba que la ejecución esté verde.
Si no hay una ejecución reciente, utiliza **Run workflow → main → Run workflow**.

Portal: https://danielramse2006-glitch.github.io/AB-Premier/

Administración: https://danielramse2006-glitch.github.io/AB-Premier/admin.html

Inicia sesión con tu correo y contraseña. El enlace **Portal** vuelve a la atención de socios con la misma sesión.
Para consultar códigos o registrar socios debe haber una sesión del encargado: un código de cuatro números no concede acceso público a datos personales.

## 4. Comprobar

Registra un socio de prueba, selecciona un barbero y un servicio y registra una visita.
La segunda visita del mismo día debe rechazarse. Revisa que aparezca en Administración → Visitas y que el Excel se descargue.
Los puntos vienen del servicio y cada quinta visita genera una cortesía.
Las fotografías se guardan en `client-photos`, privado. Su consulta usa enlaces de dos minutos.

## Otros usuarios

Crea primero la cuenta en Authentication → Users. Luego usa **Usuarios administrativos** en AB Premier para autorizar su correo como recepción, consulta o administrador.
No se usan las contraseñas predeterminadas de la versión local.

## Estado y límites de esta entrega

La creación de tablas y el primer administrador requieren ejecutar los dos SQL en el panel del propietario; una clave publicable no puede hacerlo.
Los clientes, visitas y fotos locales todavía no están importados. La desactivación por 45 días se aplica al abrir el panel; aún no hay tarea diaria programada.
El reporte Excel exporta las visitas filtradas. No reemplaza un respaldo completo de la base.

## Desarrollo

`npm ci`, `npm test`, `npm run build`. GitHub Actions publica únicamente `dist`, sin código PHP, datos locales ni archivos SQL.
