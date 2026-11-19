# Marketing de Tiendly

- `paquete-redes.md`: ganchos, textos por red, calendario y captación de contactos.
- `narracion.json`: el texto que se narra y se subtitula (una línea por escena).
- `guion-voz.md`: el mismo texto en formato para **grabar tu propia voz** con el celular.
- `grabar-escenas.cjs`: graba la app real en alta resolución (1080×1920, 9:16), una escena por línea.
- `componer-video.cjs`: une escenas + voz + subtítulos y produce el video final y un `.srt`.
- Los videos (`marketing/out/`) y las escenas (`marketing/escenas/`) **no** se suben a git por su tamaño; se regeneran.

## Cómo se produce el video

```bash
# 1) App en modo demostración (sin InsForge). Los datos de la tienda son ficticios y los siembra el script.
VITE_INSFORGE_ANON_KEY="your-anon-key" PORT=3180 npm run dev

# 2) Grabar las 14 escenas (≈ 10 min). Resultado: marketing/escenas/*.mp4 + escenas.json
node marketing/grabar-escenas.cjs http://localhost:3180 marketing/escenas

# 3) Componer el video final (segundos). Sin voz: solo subtítulos.
node marketing/componer-video.cjs --escenas marketing/escenas --salida marketing/out

# 3b) Con voz: un audio por línea en marketing/voz/ (01-intro.m4a, 02-hoy.m4a, ...). Ver guion-voz.md
node marketing/componer-video.cjs --escenas marketing/escenas --voz marketing/voz --salida marketing/out
```

Requisitos: Node, Playwright con Chromium y `ffmpeg` (con `libx264`, `libass` y la fuente Inter en `/usr/share/fonts/opentype/inter`; se puede cambiar con `--fuentes`).

### Cómo funciona (y por qué se ve nítido)
- Capturar a 1080×1920 reales cuesta ~5 fotogramas/s en un Chromium sin GPU. El grabador alarga ×6 las esperas del guion y reproduce los fotogramas ×6 más rápido (≈30 fps). Antes se capturaba a 360×640 y se ampliaba, de ahí la imagen "empañada".
- El compositor ajusta cada escena a la duración de su frase (hasta 1,5× más rápida o congelando el último fotograma), dibuja una franja verde con los subtítulos y mezcla los audios con sus tiempos exactos (`loudnorm` a −16 LUFS). Sin audios usa una duración estimada (≈2,5 palabras/s).
- Cada escena es independiente: si cambias la voz o el texto, **no hace falta volver a grabar**, solo componer.

### Notas honestas
- La **respuesta del asistente** en la escena 13 es un texto de ejemplo (se intercepta `/api/chat`; la grabación se hace sin clave de Gemini). Para grabarla real, quita el bloque `ctx.route("**/api/chat", …)` y apunta a una app con sesión y clave.
- Los datos (Tienda La Esquina, Doña Marta…) son ficticios.
- No hay música: agrégala dentro de Instagram/TikTok/Facebook para usar su catálogo con derechos.

## Sobre la voz
- **Tu voz:** graba cada línea de `guion-voz.md` con el celular y ponla en `marketing/voz/`. Es la opción más natural y con la que tendrás control total.
- **Voz sintética:** se puede generar con un motor local (por ejemplo Piper) a partir del mismo `narracion.json`; si usas una voz con licencia Creative Commons, acredita al autor en la descripción.
- **Clonar tu voz** requiere una muestra tuya y una herramienta de clonación con tu consentimiento; no se hace desde este repositorio.

## Sobre el conector de Higgsfield
El conector de Higgsfield disponible en Claude solo consulta modelos y generaciones ya hechas; **no genera video**. Por eso los videos se graban de la app real. Si quieres una escena generada con IA (por ejemplo, una apertura), hazla en la plataforma de Higgsfield y únela a estas escenas.
