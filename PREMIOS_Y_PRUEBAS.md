# Premios por cortes y celebración

## Activar los premios en Supabase

Abre SQL Editor → New query. Copia TODO `supabase/migrations/202609060002_rewards.sql` y pulsa Run.
Este archivo actualiza las funciones y conserva clientes, visitas y cortesías existentes. No vuelvas a ejecutar el SQL inicial.
Los nuevos cortes no generan puntos. Los campos históricos de puntos se conservan para evitar pérdida de datos, pero ya no se muestran ni se usan.
Cada visita registrada cuenta como un corte. El programa es acumulativo: no se reinicia después del corte 35.

## Cargar datos ficticios

En otra consulta, pega TODO `supabase/demo/02_reset_demos_a_un_corte.sql` y pulsa Run.
Este archivo borra solo socios marcados DEMO y crea diez socios de prueba llamados Panchito 1 al Panchito 10.
Todos quedan a un corte de ganar. Si alguno de sus códigos pertenece a un cliente real, el script se detiene sin modificar datos reales.
Ejecutarlo de nuevo vuelve a dejar los Panchitos listos para ganar.

| Código | Socio | Cortes actuales | Premio al registrar el siguiente corte |
|---|---|---:|---|
| 9001 | Panchito 1 | 4 | Bebidas gratis |
| 9002 | Panchito 2 | 9 | Corte gratis |
| 9003 | Panchito 3 | 14 | Facial gratis |
| 9004 | Panchito 4 | 19 | Corte más bebida premium |
| 9005 | Panchito 5 | 24 | Playera AB Premium |
| 9006 | Panchito 6 | 27 | Agenda y pluma de AB Premier |
| 9007 | Panchito 7 | 31 | Termo de AB Premier |
| 9008 | Panchito 8 | 34 | Sobaquera de AB Premier y categoría Cliente Premium |
| 9009 | Panchito 9 | 4 | Bebidas gratis |
| 9010 | Panchito 10 | 9 | Corte gratis |

Abre el portal, inicia sesión y busca 9001. Selecciona barbero y servicio, y pulsa Registrar visita.
Se mostrará Congratulations, el premio, la imagen animada, confeti y el audio proporcionado.
Prueba los demás códigos para los otros premios. No se permiten dos cortes del mismo socio en el mismo día.
Los datos DEMO aparecen en reportes junto con los reales: úsalos para pruebas antes de operar.

## Agregar la foto después

Sube `foto1.jpg` dentro de la carpeta `public` del repositorio (ruta `public/foto1.jpg`).
Cuando GitHub termine de publicar, aparecerá en las celebraciones. Si falta, se usa el logo AB Premier recortado.
El audio está en `public/assets/celebration.mp3`. Se reproduce al confirmarse el premio; si el navegador bloquea el sonido, aparece un botón para escucharlo.
La preferencia de movimiento reducido del dispositivo desactiva rebotes y confeti.
