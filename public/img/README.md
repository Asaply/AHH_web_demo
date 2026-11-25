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

## Fotos de obra propia

Viven en `propiedades/<slug>/` y `proyectos/<slug>/` como `01.jpg` (1800 px lado
largo) + `01-sm.jpg` (720 px), y se registran en `src/data/site.ts` con
`photoDir` / `photoCount`. Originales en Drive › Ahh Constructura › Fotografia
(copia local en `content/`, fuera de git).

- Casa Alleza Boreal → `propiedades/alleza-boreal/` (23 de 37; las últimas 5
  son áreas comunes del fraccionamiento). La carpeta se llamaba "Reliz".
- Residencia Los Leones I → `proyectos/los-leones/` (Drive › Fotografia › Leones)

## Pendientes de entrega del cliente

- Fotos del Terreno en Av. Homero (solo hay un plano escaneado)
- Video `casa_leones.mp4` (Drive › Video › Leones, 965 MB: comprimir antes de usar)
- Set de antes/después de remodelaciones con calidad para web

## Sin uso actual

Quedaron en el repo tras retirar las propiedades y proyectos ficticios. Son fotos
de archivo genéricas, reutilizables como imagen de sección, pero no deben volver a
presentarse como obra de AHH:
`propiedad-cumbres.jpg`, `propiedad-cordillera.jpg`, `propiedad-san-francisco.jpg`,
`proyecto-cumbres.jpg`, `proyecto-cocina.jpg`, `proyecto-plaza.jpg`,
`proyecto-sala.jpg`, `proyecto-san-francisco.jpg`, `proyecto-oficinas.jpg`,
`equipo.jpg`.

Las rutas viven en `src/data/site.ts` y en los `style="background-image:..."` de cada página.
