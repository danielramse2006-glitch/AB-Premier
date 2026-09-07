# Premios por cortes y celebración

## Activar los premios en Supabase

Abre SQL Editor → New query. Copia TODO `supabase/migrations/202609060002_rewards.sql` y pulsa Run.
Este archivo actualiza las funciones y conserva clientes, visitas y cortesías existentes. No vuelvas a ejecutar el SQL inicial.
Los nuevos cortes no generan puntos. Los campos históricos de puntos se conservan para evitar pérdida de datos, pero ya no se muestran ni se usan.
Cada visita registrada cuenta como un corte. El programa es acumulativo: no se reinicia después del corte 35.

## Cargar datos ficticios

En otra consulta, pega TODO `supabase/demo/01_datos_prueba.sql` y pulsa Run.
Se agregan ocho socios marcados DEMO, con historial hasta ayer y a un corte de cada premio.
Si alguno de sus códigos pertenece a un cliente real, el script se detiene sin modificar datos.
Ejecutarlo de nuevo no duplica ni reinicia los socios de prueba.

| Código | Cortes actuales | Premio al registrar el siguiente corte |
|---|---:|---|
| 9105 | 4 | Bebidas gratis |
| 9110 | 9 | Corte gratis |
| 9115 | 14 | Facial gratis |
| 9120 | 19 | Corte más bebida premium |
| 9125 | 24 | Playera AB Premium |
| 9128 | 27 | Agenda y pluma de AB Premier |
| 9132 | 31 | Termo de AB Premier |
| 9135 | 34 | Sobaquera de AB Premier y categoría Cliente Premium |

Abre el portal, inicia sesión y busca 9105. Selecciona barbero y servicio, y pulsa Registrar corte.
Se mostrará Congratulations, el premio, la imagen animada, confeti y el audio proporcionado.
Prueba los demás códigos para los otros premios. No se permiten dos cortes del mismo socio en el mismo día.
Los datos DEMO aparecen en reportes junto con los reales: úsalos para pruebas antes de operar.

## Agregar la foto después

Sube `foto1.jpg` dentro de la carpeta `public` del repositorio (ruta `public/foto1.jpg`).
Cuando GitHub termine de publicar, aparecerá en las celebraciones. Si falta, se usa el logo AB Premier recortado.
El audio está en `public/assets/yay.mp3`. Se reproduce al confirmarse el premio; si el navegador bloquea el sonido, aparece un botón para escucharlo.
La preferencia de movimiento reducido del dispositivo desactiva rebotes y confeti.
