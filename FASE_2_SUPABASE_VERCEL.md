# AB Premiere — Plan de Fase 2

## Objetivo

Crear una segunda versión web de AB Premiere preparada para funcionar completamente en internet, utilizando una interfaz en HTML, CSS y JavaScript, una base de datos PostgreSQL y autenticación mediante tokens.

La aplicación actual en PHP y SQLite se conservará como Fase 1. La Fase 2 se desarrollará como un proyecto separado para evitar afectar la versión que ya funciona.

## Arquitectura propuesta

```text
GitHub
└── Código fuente y control de versiones
        ↓
Vercel
└── Publicación automática del sitio web
        ↓
Supabase
├── PostgreSQL
├── Supabase Auth y tokens JWT
├── Storage para fotografías
├── Políticas Row Level Security (RLS)
├── Funciones SQL protegidas
└── Edge Functions para operaciones sensibles
```

## Tecnologías

- HTML5 para la estructura.
- CSS para conservar el diseño visual de AB Premiere.
- JavaScript para formularios, gráficas, filtros y comunicación con Supabase.
- Supabase JS para conectarse desde el navegador.
- PostgreSQL como base de datos.
- Supabase Auth para administradores y sesiones con JWT.
- Supabase Storage para fotografías de clientes.
- GitHub para almacenar y versionar el proyecto.
- Vercel para publicar automáticamente cada actualización.

No se utilizarán PHP, SQLite, SQL Server, Power Apps ni Google Drive para el funcionamiento principal de la Fase 2.

## Organización sugerida

```text
ab-premiere-fase-2/
├── index.html
├── admin.html
├── package.json
├── vite.config.js
├── .env.example
├── .gitignore
├── css/
│   └── estilos.css
├── js/
│   ├── supabase-client.js
│   ├── clientes.js
│   ├── visitas.js
│   ├── administracion.js
│   ├── reportes.js
│   └── utilidades.js
├── assets/
│   ├── logo-ab-premiere.png
│   └── sonidos/
└── supabase/
    ├── migrations/
    ├── functions/
    └── seed.sql
```

## Variables de entorno

Archivo local `.env.local`:

```env
VITE_SUPABASE_URL=https://PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

Estas dos variables se utilizan en el navegador. La `publishable key` identifica el proyecto, pero no otorga acceso administrativo por sí sola. La protección real depende de las políticas RLS y del token del usuario.

Las claves secretas solo pueden utilizarse en Vercel Functions o Supabase Edge Functions:

```env
SUPABASE_SECRET_KEY=sb_secret_xxxxx
```

La clave secreta nunca debe utilizarse en archivos HTML, JavaScript del navegador, aplicaciones instalables ni repositorios de GitHub.

El archivo `.gitignore` debe contener:

```gitignore
.env
.env.local
.env.production
node_modules/
dist/
```

Solo debe subirse una plantilla sin valores reales:

```env
# .env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Funcionamiento de los tokens

1. El administrador inicia sesión con Supabase Auth.
2. Supabase entrega un token JWT y un token de renovación.
3. Supabase JS conserva la sesión y renueva el token automáticamente.
4. Cada consulta envía el JWT del usuario conectado.
5. PostgreSQL identifica al usuario y aplica las políticas RLS.
6. Si el usuario no tiene permiso, la operación se rechaza desde la base de datos, aunque alguien modifique el JavaScript.

El código numérico de cuatro dígitos de un cliente no sustituye un token de seguridad. Servirá únicamente para iniciar el flujo de atención. La información privada deberá devolverse mediante una función protegida que limite los datos visibles, registre intentos y evite consultas masivas de códigos.

## Seguridad obligatoria

- Habilitar RLS en todas las tablas expuestas.
- Bloquear el acceso directo anónimo a clientes, teléfonos y fotografías.
- Permitir que solo administradores autenticados consulten información completa.
- Ejecutar el registro de visitas mediante una función SQL o Edge Function.
- Calcular puntos y cortesías en el servidor, no en JavaScript.
- Evitar que el navegador pueda modificar puntos, número de visita o cortesías.
- Mantener fotografías en un bucket privado.
- Entregar fotografías mediante enlaces temporales firmados.
- Validar tipo y tamaño de las imágenes.
- Agregar límites de solicitudes al ingreso de códigos.
- Registrar altas, ediciones, accesos, visitas, cortesías y exportaciones en la bitácora.
- Nunca guardar contraseñas directamente; Supabase Auth se encarga de almacenarlas de forma segura.

## Tablas principales

### `profiles`

Información adicional de usuarios administrativos.

- `id`
- `full_name`
- `role`
- `active`
- `created_at`

### `clients`

- `id`
- `code`
- `full_name`
- `birth_date`
- `phone`
- `photo_path`
- `points`
- `active`
- `created_at`
- `deactivated_at`

### `barbers`

- `id`
- `name`
- `active`
- `created_at`

### `services`

- `id`
- `name`
- `description`
- `price`
- `points`
- `active`
- `created_at`

### `visits`

- `id`
- `client_id`
- `barber_id`
- `service_id`
- `visited_at`
- `points_earned`
- `visit_number`
- `courtesy_won`
- `notes`
- `created_by`

### `courtesies`

- `id`
- `client_id`
- `visit_number`
- `status`
- `earned_at`
- `redeemed_at`
- `redeemed_by`

### `audit_log`

- `id`
- `user_id`
- `action`
- `entity`
- `entity_id`
- `details_before`
- `details_after`
- `created_at`

## Lógica que puede permanecer en JavaScript

- Cambio entre pestañas.
- Formularios y mensajes visuales.
- Validaciones básicas para ayudar al usuario.
- Gráficas y porcentajes.
- Filtros y búsquedas sobre resultados autorizados.
- Celebración y sonido de cortesía.
- Captura y compresión previa de fotografía.
- Manejo de sesión mediante Supabase JS.

## Lógica que debe ejecutarse en Supabase

- Validación real de permisos.
- Registro definitivo de una visita.
- Prevención de dos visitas el mismo día.
- Cálculo y asignación de puntos.
- Creación de cortesías en las visitas 5, 10, 15 y siguientes.
- Reactivación de clientes que regresan.
- Desactivación después de 45 días sin asistir.
- Generación segura de códigos de cliente.
- Consulta limitada mediante código.
- Escritura de la bitácora.
- Operaciones administrativas especiales.

## Fotografías

Se recomienda Supabase Storage en lugar de Google Drive.

- Bucket privado llamado `client-photos`.
- Una carpeta por cliente o nombres generados con UUID.
- Solo los administradores podrán subir o reemplazar fotografías.
- El cliente recibirá únicamente una URL firmada de corta duración cuando tenga autorización.
- En la base se almacenará la ruta del archivo, no una URL pública permanente.

Google Drive se puede conectar, pero requiere OAuth, permisos y manejo de enlaces. Power Apps puede añadir licencias por usuario. Para este sistema, Supabase Storage es más sencillo, seguro y económico.

## GitHub y Vercel

1. Crear un repositorio privado en GitHub.
2. Subir el proyecto sin archivos `.env`.
3. Conectar el repositorio desde Vercel.
4. Registrar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en las variables de Vercel.
5. Definir `main` como rama de producción.
6. Utilizar ramas separadas para cambios y pruebas.
7. Cada actualización enviada a GitHub generará una vista previa.
8. Al integrar el cambio en `main`, Vercel publicará producción automáticamente.

## Funciones que conservará la Fase 2

- Registro de clientes con código numérico de cuatro dígitos.
- Consulta de datos antes de registrar una visita.
- Selección de barbero y servicio.
- Puntos configurables por servicio.
- Cortesías cada cinco visitas.
- Aviso de próxima cortesía.
- Felicitación visual y sonido.
- Cumpleañeros del mes.
- Clientes nuevos del mes.
- Clientes frecuentes.
- Clientes ausentes.
- Desactivación automática a los 45 días.
- Reactivación al regresar.
- Porcentaje de visitas por día.
- Filtros de visitas.
- Edición de clientes, barberos y servicios.
- Usuarios administrativos.
- Bitácora completa.
- Exportación profesional para Excel.
- Diseño visual y logo de AB Premiere.

## Costos estimados

### Inicio con servicios gratuitos

- GitHub: $0.
- Vercel: $0 para el sitio inicial.
- Supabase Free: $0.
- Dominio: aproximadamente $300 a $800 MXN al año.

El plan gratuito de Supabase incluye una base PostgreSQL, 500 MB de datos, 1 GB de archivos y hasta 50,000 usuarios activos mensuales. Puede pausar un proyecto después de una semana sin actividad.

### Producción con Supabase Pro

- Supabase Pro: USD $25 mensuales.
- Aproximadamente $5,100 MXN anuales al tipo de cambio consultado en septiembre de 2026, antes de impuestos y variaciones cambiarias.
- Dominio adicional: aproximadamente $300 a $800 MXN al año.

La Fase 2 puede comenzar gratuitamente y cambiar a Pro cuando el uso o la importancia operativa lo justifiquen.

## Plan de migración

1. Crear el proyecto nuevo sin modificar la Fase 1.
2. Crear Supabase y las migraciones PostgreSQL.
3. Diseñar y probar todas las políticas RLS.
4. Migrar el portal del cliente a JavaScript.
5. Migrar el panel administrativo.
6. Implementar Storage y fotografías privadas.
7. Implementar funciones protegidas para visitas, puntos y cortesías.
8. Migrar la bitácora y los reportes.
9. Importar clientes y visitas desde SQLite mediante una herramienta controlada.
10. Comparar resultados entre Fase 1 y Fase 2.
11. Publicar una versión de prueba en Vercel.
12. Realizar pruebas con datos ficticios.
13. Conectar el dominio cuando el cliente apruebe.
14. Conservar un respaldo final de SQLite antes del cambio definitivo.

## Criterios para publicar

- Ninguna clave secreta aparece en GitHub ni en el navegador.
- Todas las tablas tienen RLS activo y probado.
- Un cliente no puede consultar datos de otros clientes.
- Un usuario sin rol administrativo no puede abrir el panel ni exportar información.
- Los puntos y cortesías no pueden modificarse desde DevTools.
- Las fotografías no son públicas.
- La bitácora registra todas las operaciones importantes.
- La exportación de Excel funciona con permisos administrativos.
- Existe respaldo y procedimiento de restauración.
- La versión móvil y de escritorio se visualiza correctamente.

## Decisión recomendada

Desarrollar la Fase 2 como proyecto separado usando GitHub, Vercel y Supabase. Conservar la interfaz actual, pero trasladar toda lógica sensible a PostgreSQL, políticas RLS y funciones protegidas. Comenzar con los planes gratuitos y contratar Supabase Pro solamente cuando el sistema entre en operación crítica o supere los límites gratuitos.
