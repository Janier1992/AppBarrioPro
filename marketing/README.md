# Marketing de Tiendly

- `paquete-redes.md`: guiones, ganchos, textos por red, calendario y captación de contactos.
- `record-demo.cjs`: graba los videos 9:16 de la app (los videos generados quedan en `marketing/out/`, que **no** se sube a git por su tamaño).

## Regenerar los videos

Requisitos: Node, `ffmpeg` y Playwright con Chromium.

```bash
# 1) App en modo demostración (sin InsForge); datos ficticios sembrados por el script
VITE_INSFORGE_ANON_KEY="your-anon-key" PORT=3180 npm run dev

# 2) Grabar (≈ 1–2 min). Resultado: marketing/out/*.mp4
node marketing/record-demo.cjs http://localhost:3180 marketing/out
```

- Cambia textos, orden o ritmo editando el guion al final de `record-demo.cjs` (cada escena empieza con un `mark("…")`; de ahí salen los clips cortos).
- **Asistente con respuesta real:** el script intercepta `/api/chat` y devuelve una respuesta de ejemplo. Para grabarlo con la respuesta real, quita el bloque `ctx.route("**/api/chat", …)` y apunta a una app con sesión y clave de Gemini.
- No incluye audio: agrega música o voz dentro de Instagram/TikTok/Facebook.

## Sobre el conector de Higgsfield

El conector de Higgsfield disponible en Claude solo permite consultar modelos y generaciones ya hechas; **no genera video**. Por eso los videos se graban directamente de la app real. Si en el futuro se quiere un video generado con IA (por ejemplo, una escena de apertura), habría que hacerlo en la propia plataforma de Higgsfield y luego unirlo a estos clips.
