# AB Premiere

Aplicación local de control de socios y visitas con Flask, Waitress, SQLite y pywebview.

Incluye portal de registro/check-in, cámara, prevención de visitas duplicadas por día,
panel administrativo, métricas de personas por día, clientes frecuentes, edición y
activación de socios, historial, visitas manuales, usuarios y roles, auditoría,
exportación CSV, respaldos SQLite rotativos y logotipo local.

## Primer acceso

- Usuario administrador: `admin`
- Contraseña temporal: `ABPremier2026`
- Código inicial para liberar socios: `ABREYNOSA`
- Cliente de demostración: `2026`

Cámbialos desde el panel administrativo después del primer inicio.

## Desarrollo

Ejecuta `ejecutar_desarrollo.bat`.

## Generar el EXE

Ejecuta `empaquetar.bat`. El resultado queda en `dist\AB Premiere.exe`.

La base SQLite y las fotografías se guardan fuera del ejecutable, en
`%LOCALAPPDATA%\AB Premiere`, para que no se pierdan al actualizar el `.exe`.
