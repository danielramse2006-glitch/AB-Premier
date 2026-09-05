# AB Premiere Web

Versión web local preparada para publicarse posteriormente en un hosting con cPanel.

## Ejecutar localmente

Haz doble clic en `iniciar-local.bat`. Después abre:

- Portal de clientes: `http://127.0.0.1:8080/`
- Administración: `http://127.0.0.1:8080/admin`

## Datos iniciales de prueba

- Código de cliente: `2026`
- Usuario administrativo: `admin`
- Contraseña: `ABPremier2026`
- Autorización para registrar un socio: `ABREYNOSA`

La base local está en `storage/ab_premiere_web.sqlite`. No requiere instalar MySQL ni SQL Server.

## Funciones incluidas

- Registro y consulta de clientes con código numérico de cuatro dígitos.
- Foto por cámara, datos personales, puntos y fecha de última visita.
- Selección de barbero y servicio antes de registrar la visita.
- Cortesías automáticas cada cinco visitas, aviso previo y felicitación con sonido.
- Reactivación al volver y desactivación automática tras 45 días sin asistir.
- Panel de clientes, visitas, filtros, cumpleaños, frecuentes, ausentes y próximas cortesías.
- Porcentajes de asistencia por día de la semana para cada cliente y para el negocio.
- Gráfica completa de los últimos 31 días, incluyendo días sin visitas.
- Creación y consulta de usuarios administrativos.
- Gestión y edición de barberos, servicios, precios, puntos y estado activo; entrega de cortesías.
- Bitácora de altas, ediciones, visitas, cortesías y exportaciones.
- Reporte de Excel con diseño, filtros aplicados, totales, puntos y cortesías.

Para subirla a cPanel consulta `DEPLOY_CPANEL.md`.
