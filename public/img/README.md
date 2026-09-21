# Imágenes del sitio

Coloca aquí los archivos con estos nombres exactos. Mientras falten, el sitio
muestra el degradado oscuro de `.media` / `.hero-media` en su lugar (sin errores).

## Heros (horizontal, mín. 1920×1080)
- hero-inicio.jpg
- hero-servicios.jpg
- hero-propiedades.jpg
- hero-proyectos.jpg
- hero-nosotros.jpg
- hero-contacto.jpg
- cta-band.jpg          (banda de llamada a la acción, interiores oscuros)

## Servicios (4:3, mín. 800×600)
- servicio-construccion.jpg
- servicio-remodelacion.jpg
- servicio-ampliaciones.jpg
- servicio-mantenimiento.jpg

## Pendientes de entrega del cliente

Estas rutas están vacías a propósito en `src/data/site.ts`: usar foto de archivo
para obra propia sería presentar trabajo ajeno como de AHH. En cuanto lleguen las
fotos reales, se agregan aquí y se rellena el campo `image`.

- Casa en Fraccionamiento Cittanova (4:3, mín. 1000×750)
- Residencia Los Leones I y II (4:3, mín. 1000×750)
- Set de antes/después de remodelaciones

## Sin uso actual

Quedaron en el repo tras retirar las propiedades y proyectos ficticios. Son fotos
de archivo genéricas, reutilizables como imagen de sección, pero no deben volver a
presentarse como obra de AHH:
`propiedad-cumbres.jpg`, `propiedad-cordillera.jpg`, `propiedad-san-francisco.jpg`,
`proyecto-cumbres.jpg`, `proyecto-cocina.jpg`, `proyecto-plaza.jpg`,
`proyecto-sala.jpg`, `proyecto-san-francisco.jpg`, `proyecto-oficinas.jpg`,
`equipo.jpg`.

Las rutas viven en `src/data/site.ts` y en los `style="background-image:..."` de cada página.
