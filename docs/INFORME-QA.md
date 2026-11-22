# Informe QA y seguridad — Tiendly

Rama: `qa/seguridad-y-consistencia` (base `main` @ db2960a) · Modo: auditoría + pruebas + corrección y verificación
Entorno: local (build de producción Express + modo demo sin InsForge). **No se probó contra producción ni contra InsForge real.**

## Veredicto: GO WITH RISKS
Sin defectos críticos abiertos. Los riesgos residuales (abajo) requieren aceptación del responsable o acciones suyas (RLS, rotación de claves).

## Resumen de ejecución
| Verificación | Resultado |
|---|---|
| `npm run lint` (tsc) | PASS |
| `npm test` | PASS — 18 archivos, 87 pruebas (+12 nuevas) |
| `npm run build` | PASS |
| `npm run check:api` (ESM + 401 sin sesión) | PASS |
| `npm audit --omit=dev` | 0 críticas; 4 altas conocidas (ver R2) |
| Secretos en código/historial | PASS — solo placeholders en `.env.example` |
| Patrones XSS (`innerHTML`, `eval`, etc.) | PASS — ninguno; el chat IA renderiza texto como nodos React |
| Servidor de producción: cabeceras (CSP, HSTS, nosniff, XFO, COOP, Referrer) | PASS |
| `/api/chat` sin token / token falso → 401; JSON malformado → 400; cuerpo 3 MB → 413; GET → 404 | PASS |
| Archivos sensibles (`.env`, `server.ts`, `package.json`, `.map`) y traversal | PASS — devuelven el index de la SPA, sin contenido |
| Políticas RLS (5 tablas × 4 operaciones, `WITH CHECK`) | PASS en revisión estática (**no aplicadas por QA**) |
| Humo en navegador (demo): Hoy, Fiados, Productos, Vender, XSS en nombre de producto | PASS (errores de consola solo por red bloqueada del sandbox) |

## Defectos encontrados y corregidos
| ID | Sev. | Hallazgo | Corrección | Regresión |
|---|---|---|---|---|
| QA-001 | Alta | **Inyección de fórmulas en CSV**: un producto llamado `=HYPERLINK(...)` se ejecutaba al abrir la exportación en Excel/Sheets. | `src/lib/csv.ts` (`escapeCsvCell`, `toCsv`) antepone `'` a celdas que empiezan por `= + - @ tab CR`; usado en `use-settings.ts`. | `csv.test.ts` (9) |
| QA-002 | Media | **Sin cabeceras de seguridad en Vercel** (la CSP/Helmet solo vivía en Express; no había `vercel.json`). | `vercel.json` con CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy, COOP, Permissions-Policy y rewrite SPA que excluye `/api`. | `api/_lib/vercelConfig.test.ts` (3) mantiene el `connect-src` alineado con `csp.ts` |

## Riesgos residuales (no corregidos)
| ID | Sev. | Riesgo | Acción sugerida | Responsable |
|---|---|---|---|---|
| R1 | Alta | Políticas RLS aún no aplicadas en InsForge: sin ellas un usuario podría leer datos ajenos. | Ejecutar `insforge-rls-policies.sql` y probar con dos cuentas. | Dueño |
| R2 | Media | `xlsx` (prototype pollution/ReDoS, sin parche) y cadena `zod` vía `@insforge/sdk`. Mitigado con límite de 5 MB / 5000 filas. | Migrar a `exceljs`/lectura CSV; actualizar SDK cuando haya parche. | Desarrollo |
| R3 | ~~Media~~ **Resuelto** | La clave de Gemini ya no se guarda en el perfil ni viaja en `/api/chat`; solo se usa `GEMINI_API_KEY` del servidor. | Ejecutar `insforge-migration-quitar-clave-gemini.sql` para borrar claves antiguas. | Dueño |
| R4 | ~~Media~~ **Resuelto (requiere migración)** | Escrituras fallidas: cola persistente con reintento (`src/lib/outbox.ts`). Stock: ahora se envía un delta a la función atómica e idempotente `adjust_stock` (`insforge-migration-stock-atomico.sql`); sin la función usa un respaldo leer-y-escribir. | Ejecutar la migración SQL en InsForge. | Dueño |
| R5 | Baja | Limitador de tasa en memoria (se reinicia por instancia serverless); PIN es bloqueo de interfaz, no autenticación. | Limitador compartido (Redis/Upstash) si hay abuso; documentar el alcance del PIN. | Desarrollo |
| R6 | Baja | `connect-src` fija el origen InsForge actual en `vercel.json`; si cambia el proyecto, hay que actualizarlo. | Actualizar ambos archivos; el test avisa si divergen. | Desarrollo |

## Limitaciones
No se ejecutaron pruebas de carga, accesibilidad automatizada, ni flujos con InsForge/Gemini reales (sin credenciales ni red). La verificación de RLS fue estática. No se validó en navegadores distintos de Chromium.
