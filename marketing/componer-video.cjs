// ======================================================
// Archivo: marketing/componer-video.cjs
// Responsabilidad: Unir las escenas grabadas (grabar-escenas.cjs) con la narración, y producir el
//   video final 9:16 (1080x1920) listo para Instagram, Facebook y TikTok:
//     - ritmo: cada escena dura lo que dura su frase (se acelera hasta 1,5x o se congela el último
//       fotograma para no cortar la imagen)
//     - subtítulos grabados en la imagen (franja superior) y un archivo .srt aparte
//     - voz: si hay audios en --voz (un archivo por línea, nombrado con su id: 01-intro.m4a, ...),
//       se mezclan con los tiempos exactos; si no hay, el video sale con subtítulos y sin voz
//
// Uso:
//   node marketing/componer-video.cjs --escenas marketing/escenas --voz marketing/voz --salida marketing/out
// Los audios pueden ser .wav .mp3 .m4a .aac .ogg .flac. Si falta alguno, esa línea se muestra con
// subtítulos y duración estimada (--pps palabras por segundo; 2,5 por defecto, ≈3,2 si es solo para leer).
// ======================================================
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => (cur.startsWith("--") ? [...acc, [cur.slice(2), all[i + 1]]] : acc), [])
);
const ESCENAS = path.resolve(args.escenas || "marketing/escenas");
const VOZ = args.voz ? path.resolve(args.voz) : null;
const SALIDA = path.resolve(args.salida || "marketing/out");
const NOMBRE = args.nombre || "tiendly-explicado-9x16";
const FONTS_DIR = args.fuentes || "/usr/share/fonts/opentype/inter";
const WORDS_PER_SECOND = Number(args.pps || 2.5); // ritmo estimado cuando no hay audio (≈3,2 si es solo para leer)
const MAX_SPEEDUP = 1.5;
const MIN_SPEED = 0.7; // se puede ralentizar una escena hasta 0,7x antes de congelar el último fotograma
const PAUSE_AFTER = 0.45; // pausa tras cada frase (s)
const LEAD_IN = 0.15; // la voz empieza un instante después de que arranca la escena
const MAX_CHARS = 62; // largo máximo de cada subtítulo (2 líneas en pantalla)

const narracion = JSON.parse(fs.readFileSync(path.join(__dirname, "narracion.json"), "utf-8"));
const escenasJson = JSON.parse(fs.readFileSync(path.join(ESCENAS, "escenas.json"), "utf-8"));
const escenasInfo = escenasJson.escenas;
const BAND_H = Math.round((escenasJson.bandaCssPx || 104) * 3); // alto de la franja de subtítulos en píxeles del video
fs.mkdirSync(SALIDA, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "tiendly-compose-"));

const run = (cmd, a) => execFileSync(cmd, a, { stdio: ["ignore", "inherit", "inherit"] });
const probeDuration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

function findAudio(id) {
  if (!VOZ || !fs.existsSync(VOZ)) return null;
  const prefix = id.split("-")[0]; // acepta "01-intro.m4a" o "01.m4a"
  const files = fs.readdirSync(VOZ).filter((f) => /\.(wav|mp3|m4a|aac|ogg|flac|opus)$/i.test(f));
  const hit = files.find((f) => f.toLowerCase().startsWith(id.toLowerCase())) || files.find((f) => f.split(/[-_.]/)[0] === prefix);
  return hit ? path.join(VOZ, hit) : null;
}

const estimate = (text) => text.trim().split(/\s+/).length / WORDS_PER_SECOND + 0.4;

/** Parte el texto en subtítulos cortos: primero por frases, luego por comas, luego por palabras. */
function chunkText(text) {
  const pieces = [];
  for (const sentence of text.match(/[^.!?¡¿]+[.!?]?/g) || [text]) {
    let rest = sentence.trim();
    while (rest.length > MAX_CHARS) {
      let cut = rest.lastIndexOf(",", MAX_CHARS);
      if (cut < MAX_CHARS * 0.4) cut = rest.lastIndexOf(" ", MAX_CHARS);
      if (cut <= 0) cut = MAX_CHARS;
      pieces.push(rest.slice(0, cut + (rest[cut] === "," ? 1 : 0)).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) pieces.push(rest);
  }
  return pieces.filter(Boolean);
}

const tsAss = (t) => {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
};
const tsSrt = (t) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
};

(async () => {
  let offset = 0;
  const segments = [];
  const subs = [];
  const audios = [];

  for (const linea of narracion) {
    const esc = escenasInfo.find((e) => e.id === linea.id);
    if (!esc) { console.warn(`  (sin escena para ${linea.id}, se omite)`); continue; }
    const clip = path.join(ESCENAS, `${linea.id}.mp4`);
    const audio = findAudio(linea.id);
    const speech = audio ? probeDuration(audio) : estimate(linea.texto);

    const base = speech + LEAD_IN + PAUSE_AFTER;
    const speed = Math.min(Math.max(esc.duracion / base, MIN_SPEED), MAX_SPEEDUP);
    const clipDur = esc.duracion / speed;
    const total = Math.max(base, clipDur);
    const pad = Math.max(total - clipDur, 0);

    const seg = path.join(TMP, `${linea.id}.mp4`);
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", clip,
      "-vf", `setpts=PTS/${speed.toFixed(4)},tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)},fps=30,format=yuv420p`,
      "-t", total.toFixed(3), "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-an", seg]);
    segments.push(seg);

    // Subtítulos: tiempo repartido según el largo de cada trozo.
    const chunks = chunkText(linea.texto);
    const chars = chunks.reduce((s, c) => s + c.length, 0);
    let t = offset + LEAD_IN;
    for (const c of chunks) {
      const d = Math.max((c.length / chars) * speech, 0.8);
      subs.push({ start: t, end: Math.min(t + d, offset + LEAD_IN + speech + 0.1), text: c });
      t += (c.length / chars) * speech;
    }
    if (audio) audios.push({ file: audio, delay: offset + LEAD_IN });
    console.log(`  ${linea.id}: voz ${speech.toFixed(1)} s${audio ? "" : " (estimada)"} · escena ${esc.duracion.toFixed(1)} s → ${total.toFixed(1)} s (x${speed.toFixed(2)}${pad > 0.05 ? `, +${pad.toFixed(1)} s congelado` : ""})`);
    offset += total;
  }

  // ---------- Subtítulos (.ass para grabar en la imagen, .srt para las redes) ----------
  const ass = [
    "[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // Texto blanco centrado sobre la franja verde de marca (la franja se dibuja con drawbox).
    "Style: Sub,Inter SemiBold,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,0,1", "",
    "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...subs.map((s) => `Dialogue: 0,${tsAss(s.start)},${tsAss(s.end)},Sub,,0,0,0,,{\\an5\\pos(540,${Math.round(BAND_H / 2)})}${s.text.replace(/\n/g, " ")}`),
  ].join("\n");
  const assPath = path.join(TMP, "subs.ass");
  fs.writeFileSync(assPath, ass);
  fs.writeFileSync(path.join(SALIDA, `${NOMBRE}.srt`), subs.map((s, i) => `${i + 1}\n${tsSrt(s.start)} --> ${tsSrt(s.end)}\n${s.text}\n`).join("\n"));

  // ---------- Unir escenas ----------
  const list = path.join(TMP, "list.txt");
  fs.writeFileSync(list, segments.map((s) => `file '${s}'`).join("\n"));
  const joined = path.join(TMP, "unido.mp4");
  run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined]);

  // ---------- Subtítulos grabados + audio ----------
  const out = path.join(SALIDA, `${NOMBRE}.mp4`);
  const ffArgs = ["-y", "-loglevel", "error", "-i", joined];
  const vf = `drawbox=x=0:y=0:w=iw:h=${BAND_H}:color=0x1F4D38:t=fill,ass=${assPath}:fontsdir=${FONTS_DIR}`;
  if (audios.length) {
    audios.forEach((a) => ffArgs.push("-i", a.file));
    const filters = audios.map((a, i) => `[${i + 1}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${Math.round(a.delay * 1000)}|${Math.round(a.delay * 1000)}[a${i}]`);
    filters.push(`${audios.map((_, i) => `[a${i}]`).join("")}amix=inputs=${audios.length}:normalize=0:duration=longest,loudnorm=I=-16:TP=-1.5:LRA=11,apad[aout]`);
    ffArgs.push("-filter_complex", filters.join(";"), "-vf", vf, "-map", "0:v", "-map", "[aout]", "-t", offset.toFixed(3),
      "-c:a", "aac", "-b:a", "192k");
  } else {
    // Sin voz: pista de audio en silencio (algunas redes la prefieren) y subtítulos grabados.
    ffArgs.push("-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-vf", vf, "-map", "0:v", "-map", "1:a", "-t", offset.toFixed(3), "-c:a", "aac", "-b:a", "96k");
  }
  ffArgs.push("-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", out);
  run("ffmpeg", ffArgs);

  console.log(`Listo: ${out} (${offset.toFixed(1)} s, ${audios.length ? audios.length + " líneas con voz" : "sin voz: solo subtítulos"})`);
  console.log(`Subtítulos aparte: ${path.join(SALIDA, NOMBRE + ".srt")}`);
  if (!process.env.KEEP_TMP) fs.rmSync(TMP, { recursive: true, force: true });
})().catch((e) => {
  console.error("Falló la composición:", e);
  process.exit(1);
});
