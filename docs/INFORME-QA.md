# Informe QA y seguridad — Tiendly (verificación final)

Versión evaluada: `main` @ 9bfc73d + correcciones de esta verificación (rama `qa/verificacion-final`)
Entorno: local — build de producción (Express) y modo demo en Chromium; sin InsForge ni Gemini reales.
Alcance: seguridad, consistencia de datos, funcionalidad de los flujos principales, accesibilidad (WCAG 2.0 A/AA), navegación en computador y celular.

## Veredicto: GO WITH RISKS

No hay defectos críticos ni altos abiertos en el código. Se recomienda liberar **una vez cumplidas las acciones del dueño** de la sección "Riesgos residuales" (R1 y R2 en especial). El resto son riesgos bajos aceptados.

## Resumen de ejecución

| Verificación | Resultado |
|---|---|
| Lint (`tsc --noEmit`) | PASS |
| Pruebas automatizadas (Vitest) | PASS — 23 archivos, **120 pruebas** (eran 75 al iniciar la auditoría) |
| Build de producción | PASS |
| `check:api` (ESM + 401 sin sesión) | PASS |
| `npm audit --omit=dev` | 0 críticas; 3 altas (cadena `zod` en `@insforge/sdk`, ver R4). Eran 4 |
| Secretos en el repositorio / patrones XSS peligrosos | 0 hallazgos |
| Servidor de producción: cabeceras de seguridad | PASS (CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy, COOP); `vercel.json` equivalente |
| API: sin token 401 · GET 404 · JSON malformado 400 · cuerpo 3 MB 413 · límite por IP 429 | PASS |
| Archivos sensibles y *path traversal* | PASS (se devuelve el index de la SPA, nunca archivos) |
| Flujos funcionales en navegador — computador | **12/12 PASS** |
| Flujos funcionales en navegador — celular | **4/4 PASS** |
| Accesibilidad (axe-core, WCAG 2.0 A/AA): 12 vistas claras + 6 en tema oscuro | **0 violaciones** (tras correcciones) |
| Errores de página (`pageerror`) durante las pruebas | 0 |

## Casos ejecutados en navegador (datos y resultado verificados, no solo en pantalla)

| ID | Caso | Resultado |
|---|---|---|
| TC-VENT-001 | Venta en efectivo descuenta el stock exacto y registra la venta con el total correcto | PASS |
| TC-VENT-002 | No se puede cobrar con el carrito vacío | PASS |
| TC-FIAD-001 | Venta a fiado crea la deuda (cliente, monto, vencimiento) sin nacer pagada | PASS |
| TC-FIAD-002 | Fiado sin nombre de cliente no se registra | PASS |
| TC-FIAD-003 | Cobrar un fiado (con confirmación) lo marca como pagado | PASS |
| TC-INV-001 | Botones −/+ ajustan el stock de la fila y se detienen en 0 | PASS |
| TC-TASK-001 | Crear y completar una tarea | PASS |
| TC-TEMA-001 | El tema cambia con **un** clic y persiste tras recargar | PASS |
| TC-PIN-001 | PIN: no se guarda en claro; rechaza PIN erróneo; desbloquea con el correcto | PASS |
| TC-SEC-001 | La exportación CSV neutraliza `=HYPERLINK(...)` en nombres de producto | PASS |
| TC-SEC-002 | Un nombre con HTML (`<img onerror>`) se muestra como texto y no ejecuta código | PASS |
| TC-NAV-001 | Menú lateral: ocultar, mostrar y recordar la preferencia | PASS |
| TC-MOV-001 | Celular: barra inferior visible y sin menú lateral | PASS |
| TC-MOV-002 | Celular: sin desbordamiento horizontal en los 6 destinos | PASS |
| TC-MOV-003 | Celular: venta desde la barra "Cobrar" descuenta stock | PASS |
| TC-MOV-004 | Celular: "+ Reponer" abre la edición del producto | PASS |
| (unitarias) | Cola de reintento sin conexión, orden, idempotencia, stock atómico, limitador compartido, importación .xlsx/.csv, CSV seguro, cabeceras Vercel, ids de navegación únicos | PASS |

## Defectos encontrados y corregidos (14)

| ID | Sev. | Hallazgo | Corrección | Regresión |
|---|---|---|---|---|
| QA-001 | Alta | Inyección de fórmulas en la exportación CSV | `src/lib/csv.ts` neutraliza `= + - @` | `csv.test.ts`, TC-SEC-001 |
| QA-002 | Media | Sin cabeceras de seguridad en Vercel | `vercel.json` (CSP, HSTS, etc.) | `vercelConfig.test.ts` |
| QA-003 | Media | Clave de Gemini guardada en la base y enviada en cada petición | Solo variable de servidor `GEMINI_API_KEY`; el cliente ya no la envía ni guarda | `chatHandler.test.ts`, `db.test.ts` |
| QA-004 | Alta | Escrituras fallidas (sin señal) se perdían y la siguiente lectura pisaba el dato local | Cola persistente con reintento en orden e idempotente (`outbox.ts`) | `outbox.test.ts` (8) |
| QA-005 | Alta | Stock no atómico: dos dispositivos vendiendo a la vez se pisaban | Deltas con función SQL `adjust_stock` idempotente (+ respaldo) | `stock-atomico.test.ts` (6) |
| QA-006 | Media | Limitador de tasa solo en memoria por instancia; sin límite por IP | Upstash Redis compartido + límite por IP (memoria como respaldo) | `rateLimit.test.ts`, prueba 429 real |
| QA-007 | Alta | Dependencia `xlsx` con vulnerabilidades sin parche | Reemplazada por `read-excel-file` + lector CSV propio | `spreadsheet.test.ts` (8), importación real |
| QA-008 | Alta | Tras QA-003, el guardado del perfil enviaba una columna inexistente y el servidor lo rechazaba (error mío) | `saveProfile` ya no envía el campo; migración SQL segura | `db.test.ts` |
| QA-009 | Media | Los menús lateral y "Más" repetían `id` en el DOM (las herramientas apuntaban al elemento oculto; error mío) | Ids propios `sidebar-*` | `navigationIds.test.ts` |
| QA-010 | Media | Zoom deshabilitado en el navegador (`user-scalable=no`) — WCAG 1.4.4 | Viewport sin restricción de zoom | axe `meta-viewport` |
| QA-011 | Alta (a11y) | 12 botones de icono sin nombre (tareas, interruptores) y 2 campos sin etiqueta | `aria-label`, `role="switch"`, `htmlFor`/`id` | axe `button-name`, `label` |
| QA-012 | Media (a11y) | Contraste insuficiente (3.05:1) en la etiqueta "N activas" | Color más oscuro | axe `color-contrast` |
| QA-013 | Media (a11y) | Contraste insuficiente en tema oscuro (cerrar sesión, "Quedan N", fichas activas) | Ajustes de color en `.dark` | axe en tema oscuro |
| QA-014 | Media (UX) | Editar/eliminar tarea solo aparecía al pasar el cursor: en celular y con teclado no se podía | Visibles en pantallas táctiles y al enfocar con teclado | revisión de código |

## Riesgos residuales

| ID | Sev. | Riesgo | Acción | Responsable |
|---|---|---|---|---|
| R1 | Alta | Las políticas RLS (`insforge-rls-policies.sql`) las ejecutó el dueño, pero **QA no pudo verificar su efecto** (sin acceso a InsForge). Sin ellas, un usuario podría leer datos de otro. | Probar con dos cuentas: A crea un producto y B no debe verlo ni poder editarlo. | Dueño |
| R2 | Media | La migración de stock atómico se ejecutó pero **no se confirmó su resultado**; sin la función la app usa el respaldo no atómico. | Vender un producto y confirmar el stock en `products`; vender desde dos dispositivos a la vez. | Dueño |
| R3 | Media | Límite de tasa compartido inactivo hasta crear la base Upstash y definir `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` en Vercel. | Configurar las dos variables. | Dueño |
| R4 | Media | `npm audit` marca la cadena `zod` vía `@insforge/sdk` (DoS por colecciones enormes); mitigado con límites en el esquema del chat. | Actualizar `@insforge/sdk` cuando haya versión corregida. | Desarrollo |
| R5 | Media | Claves expuestas en algún momento (Gemini, InsForge) sin rotar. | Rotarlas. | Dueño |
| R6 | Baja | El PIN es un bloqueo de pantalla del dispositivo, no autenticación. | Documentado; no usar como control de acceso. | — |
| R7 | Baja | `connect-src` de `vercel.json` fija el origen actual de InsForge. | Si cambia el proyecto, actualizar `vercel.json` y `csp.ts` (una prueba avisa si divergen). | Desarrollo |

## Limitaciones de esta verificación

- No se probó contra InsForge ni Gemini reales (sin credenciales ni red): la sincronización remota, RLS, la función SQL y el asistente se validaron por pruebas unitarias con dobles y revisión estática.
- Solo Chromium (computador 1440×900 y celular 390×844). No se probó Safari/Firefox ni dispositivos físicos.
- Accesibilidad: solo reglas automáticas WCAG 2.0 A/AA (cubren ~30–40 % de los criterios); no se hizo prueba manual con lector de pantalla ni de navegación completa por teclado.
- No se hicieron pruebas de carga ni de rendimiento.
- La prueba del modo sin conexión es unitaria (no se simuló corte de red real en navegador).

## Recomendación

Cerrar la verificación como **GO WITH RISKS** y liberar tras cumplir R1, R2, R3 y R5 (acciones del dueño, de minutos cada una). Repetir esta batería (`npm run lint && npm test && npm run build && npm run check:api`, más los casos TC) antes de cada despliegue importante.
