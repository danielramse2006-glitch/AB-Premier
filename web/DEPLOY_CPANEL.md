# Despliegue posterior en cPanel

1. Crear una base MySQL/MariaDB y un usuario desde cPanel.
2. Subir el contenido de `web` a `public_html` excepto `tools`, `storage` e `iniciar-local.bat`.
3. Configurar las variables `AB_DB_DRIVER=mysql`, `AB_DB_HOST`, `AB_DB_NAME`, `AB_DB_USER`, `AB_DB_PASSWORD` y `AB_RELEASE_CODE`.
4. Abrir el sitio una vez para crear las tablas.
5. Cambiar inmediatamente la contraseña inicial del administrador.
6. Crear un Cron Job diario apuntando a `cron-daily.php`.

Credenciales locales iniciales: `admin` / `ABPremier2026`. Código de alta: `ABREYNOSA`.
