# 🏪 Tiendly - Sistema de Gestión Comercial de Barrio

¡Bienvenido a **Tiendly**! Una plataforma de nivel profesional, robusta y escalable diseñada específicamente para optimizar, organizar y potenciar la operación diaria de comercios locales e independientes (abastos, tiendas, minimarkets y verdulerías) en toda Latinoamérica.

Este proyecto integra un diseño visual moderno y limpio, persistencia en la nube mediante **InsForge (Postgres + Auth + REST, tipo BaaS)**, un backend de analítica predictiva inteligente con **Google Gemini AI** y visualización interactiva de rendimiento financiero mediante **Recharts**.

> Nota: versiones previas de este README describían un backend en Firebase.
> Eso nunca se implementó — la persistencia real desde el primer commit es
> InsForge. `firebase` fue eliminado de `package.json` por no tener uso.

---

## 🏗️ 1. Arquitectura General de Software

```
                  ┌──────────────────────────────────────────────┐
                  │          CAPA DE PRESENTACIÓN (UI)           │
                  │   React 19 + Vite + TailwindCSS + Lucide     │
                  └──────┬────────────────────────────────┬──────┘
                         │                                │
                         ▼ (CRUD directo, sujeto a RLS)   ▼ (fetch autenticado)
 ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
 │       CAPA DE DATOS (PERSISTENCIA)       │    │   CAPA DE LÓGICA DE NEGOCIO (IA)         │
 │   InsForge (Postgres + Auth + REST)      │    │  api/chat.ts (función Vercel, prod)      │
 │   con fallback offline en localStorage   │◄───┤  server.ts (Express, solo dev local)     │
 └──────────────────────────────────────────┘    └──────────────┬───────────────────────────┘
                                                                │
                                                                ▼
                                                 ┌──────────────────────────────────────────┐
                                                 │            Google Gemini API             │
                                                 └──────────────────────────────────────────┘
```

### Detalle de Capas
1. **Capa de Presentación (Frontend):** React 19 con componentes funcionales modulares, Tailwind CSS y animaciones con `motion` (Framer Motion).
2. **Capa de Datos (Persistencia y Autenticación):** el cliente de InsForge (`@insforge/sdk`) llama directo desde el navegador a la API REST de InsForge, con `localStorage` como caché/fallback offline por usuario. El aislamiento entre tiendas depende de las políticas RLS descritas en [`insforge-rls-policies.sql`](insforge-rls-policies.sql) — **deben estar aplicadas en el proyecto de InsForge antes de manejar datos reales de más de una tienda.**
3. **Capa de Lógica de Negocio (IA):** en producción (Vercel) el único endpoint desplegado es la función serverless [`api/chat.ts`](api/chat.ts). `server.ts` replica la misma lógica (importada de `api/_lib/`) únicamente para desarrollo local con `npm run dev`. Ambos exigen una sesión válida de InsForge (Bearer token) antes de invocar a Gemini — ya no es un proxy abierto.

---

## 🚦 Estado de producción y seguridad

Hecho en código (ver historial de commits para el detalle):
- Autenticación obligatoria (Bearer token de InsForge) en el endpoint de IA, tanto en `server.ts` como en `api/chat.ts`.
- Límite de tasa por usuario y validación de esquema (`zod`) en las peticiones de IA.
- PIN de seguridad local hasheado con bcrypt (con migración automática de PINs antiguos en texto plano).
- Mitigaciones sobre la vulnerabilidad conocida de `xlsx` (límite de tamaño/filas en la carga masiva).
- Endpoints de IA sin ningún llamador real (`/api/recommendations/*`, `/api/grounding/maps`) retirados para reducir superficie de ataque.
- Suite de pruebas (`npm test`), pipeline de CI (`.github/workflows/ci.yml`), `Dockerfile`, y borradores de `PRIVACY.md` / `TERMS.md`.

**Pendiente — requiere acción humana con credenciales que un agente no tiene:**
- **Aplicar `insforge-rls-policies.sql`** en el proyecto de InsForge (dashboard o CLI autenticado). Sin esto, el aislamiento de datos entre tiendas no está garantizado a nivel de base de datos.
- **Rotar `GEMINI_API_KEY` y la anonKey de InsForge** si alguna vez se compartieron fuera de este equipo (hoy viven en texto plano en `.env.local`, que no está en git, pero rotarlas es buena práctica tras este endurecimiento).
- **Configurar las variables de entorno en Vercel** (Project Settings → Environment Variables) para que coincidan con `.env.example`.
- **Crear una cuenta de Sentry** y definir `VITE_SENTRY_DSN` si se quiere monitoreo de errores en producción (el código ya está preparado, inactivo sin DSN).
- **Revisión legal** de `PRIVACY.md` y `TERMS.md` antes de publicarlos a usuarios reales.

---

## 📂 2. Árbol de Directorios Estructurado

El proyecto está organizado de manera predecible, limpia y balanceada, evitando redundancias u hojas duplicadas:

```
├── /public                        # PWA: manifest, íconos y service worker (sw.js)
├── /docs                          # Manual de usuario (PDF) y capturas
├── /scripts                       # generate-user-manual.ts (genera el PDF del manual)
├── /src                           # Código fuente de la aplicación React
│   ├── /components                # Componentes interactivos modulares y reutilizables
│   │   ├── Checklist.tsx          # Gestor de tareas, aperturas, cierres y rutinas
│   │   ├── Dashboard.tsx          # Orquestador del panel y KPIs principales
│   │   ├── DashboardCharts.tsx    # Gráficos Recharts e historial
│   │   ├── Inventory.tsx          # Vista de inventario y alertas
│   │   ├── InventoryTable.tsx     # Tabla de productos con ajuste rápido
│   │   ├── InventoryBulkUpload.tsx# Carga masiva por Excel
│   │   ├── Sales.tsx              # Terminal de Punto de Venta (POS)
│   │   ├── POSCart.tsx            # Carrito y cobro
│   │   ├── POSCatalog.tsx         # Catálogo de venta directa
│   │   └── Settings.tsx           # Configuración del perfil de tienda
│   ├── /hooks                     # Hooks personalizados de lógica de negocio (KISS)
│   │   ├── use-app.ts             # Estado de Layout, PWA y PIN
│   │   ├── use-dashboard.ts       # Cálculos de KPI y finanzas
│   │   ├── use-inventory.ts       # Métricas de stock, carga XLSX y alertas
│   │   ├── use-sales.ts           # Control de transacciones del POS
│   │   └── use-settings.ts        # Ajustes de temas y Gemini API
│   ├── /lib                       # Módulos de utilidades, helpers y configuraciones
│   │   ├── db.ts                  # Capa de datos offline/online de InsForge
│   │   ├── demoData.ts            # Sembrador de datos ficticios
│   │   ├── insforge.ts            # Inicialización del SDK de InsForge y autenticación
│   │   ├── monitoring.ts          # Sentry opcional, inactivo sin VITE_SENTRY_DSN
│   │   ├── notifications.ts       # Gestor de notificaciones de fondo
│   │   ├── pdf.ts                 # Exportador a PDF de reportes y tickets
│   │   ├── pin.ts                 # Hasheo/verificación del PIN de seguridad
│   │   └── stock.ts               # Regla única de "stock crítico" (30% del stock mínimo)
│   ├── App.tsx                    # Orquestador del Layout Global y barra lateral
│   ├── index.css                  # Estilos globales y variables de tipografía
│   ├── main.tsx                   # Punto de entrada de React
│   └── types.ts                   # Declaración centralizada de Typescript
├── /api                           # Funciones serverless de Vercel (backend real de producción)
│   ├── chat.ts                    # Único endpoint desplegado hoy: chat de Tiendly AI
│   └── /_lib                      # Lógica compartida entre api/chat.ts y server.ts
│       ├── auth.ts                # Verificación del Bearer token de InsForge
│       ├── gemini.ts               # Cliente y llamadas a Gemini endurecidas
│       ├── rateLimit.ts           # Límite de tasa por usuario (best-effort)
│       └── validation.ts          # Esquemas zod de entrada
├── .env.example                   # Plantilla de variables de entorno seguras
├── .github/workflows/ci.yml       # Pipeline de CI: lint, tests, build, audit
├── Dockerfile                     # Build multi-stage para despliegue en contenedor
├── insforge-applet-config.json    # Credenciales públicas del cliente InsForge (anonKey)
├── insforge-rls-policies.sql      # Políticas RLS pendientes de aplicar (ver arriba)
├── PRIVACY.md / TERMS.md          # Borradores legales, pendientes de revisión por abogado
├── package.json                   # Gestión de dependencias npm y scripts
├── server.ts                      # Servidor Express — SOLO desarrollo local (npm run dev)
└── tsconfig.json                  # Configuración estricta del compilador de TypeScript
```

---

## 📖 3. Glosario de Funciones Principales

A continuación se detallan las principales funciones operativas del sistema con su propósito y ubicación para facilitar las auditorías técnicas:

| Nombre de la Función | Ubicación | Propósito Técnico |
| :--- | :--- | :--- |
| `handleRegistrarVentaRapida` | `use-dashboard.ts` | Registra una venta rápida disminuyendo stock y subiendo la transacción a la base de datos. |
| `handleCargarDatosDeDemostracion` | `use-dashboard.ts` | Carga stock inicial, checklist y transacciones ficticias para visualización realista. |
| `handleAddTask` | `Checklist.tsx` | Valida, crea y registra una nueva tarea operativa diaria para el tendero. |
| `handleToggleComplete` | `Checklist.tsx` | Invierte el estado de completado de una tarea diaria (`completed: true/false`). |
| `handleDeleteTask` | `Checklist.tsx` | Elimina permanentemente una tarea específica de la base de datos. |
| `handleRegistrarNuevoProducto` | `use-inventory.ts` | Inserta un nuevo producto en el catálogo verificando SKU. |
| `handleAjustarStockRapido` | `use-inventory.ts` | Incrementa o decrementa en una unidad el stock actual del catálogo. |
| `handleEliminarProductoDeInventario` | `use-inventory.ts` | Remueve un producto del catálogo definitivamente. |
| `processChatRequest` | `api/_lib/chatHandler.ts` | Lógica única del chat de IA (rate limit, validación, Gemini), compartida por `api/chat.ts` y `server.ts`. |
| `buildCspDirectives` | `api/_lib/csp.ts` | Content-Security-Policy de producción del servidor Express (permite InsForge/Sentry). |

---

## 📱 4. Configuración para Aplicación Móvil (Android / iOS)

Para transformar esta aplicación web SPA en una aplicación móvil nativa instalable en smartphones, se recomienda utilizar **CapacitorJS**, la tecnología moderna que actúa como un contenedor WebView híbrido nativo de alto rendimiento.

### Pasos para Configurar y Compilar con Capacitor:

1. **Instalar dependencias de Capacitor en el proyecto:**
   ```bash
   npm install @capacitor/core @capacitor/cli
   ```

2. **Inicializar la configuración de Capacitor en el directorio raíz:**
   ```bash
   npx cap init Tiendly com.tiendly.app --web-dir=dist
   ```
   *Nota: Se debe definir `dist` como el directorio web ya que es allí donde Vite compila los archivos estáticos de producción.*

3. **Instalar los componentes de plataforma móvil requeridos:**
   ```bash
   npm install @capacitor/android @capacitor/ios
   npx cap add android
   npx cap add ios
   ```

4. **Compilar la aplicación y sincronizar con los contenedores móviles:**
   Cada vez que realices cambios en el código React, ejecuta:
   ```bash
   npm run build
   npx cap sync
   ```

5. **Abrir el entorno nativo para compilar el archivo APK/IPA:**
   - Para Android (requiere Android Studio):
     ```bash
     npx cap open android
     ```
   - Para iOS (requiere macOS y Xcode):
     ```bash
     npx cap open ios
     ```

---

## 🖥️ 5. Backend Personalizado y Escalabilidad de Infraestructura

El servidor `server.ts` actual está diseñado para funcionar de manera unificada y ligera en contenedores (por ejemplo, en **Cloud Run**). Sin embargo, para escalarlo como una infraestructura propia e independiente, sigue estas pautas profesionales:

### A. Ejecución e Implementación en Servidor Propio (VPS / AWS EC2)
Para ejecutar este backend de forma aislada e independiente de los procesos de desarrollo del cliente:
1. **Configurar un archivo Dockerfile corporativo:**
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```
2. **Desplegar en producción:**
   Puedes utilizar servicios contenerizados de despliegue como **AWS ECS**, **Google Cloud Run**, o configurar un servidor VPS propio (por ejemplo, Hostinger VPS) instalando Docker o Node.js y un gestor de procesos como **PM2**:
   ```bash
   pm2 start dist/server.mjs --name "tiendly-backend"
   ```

### B. Migrar la Base de Datos a PostgreSQL Propia
Si deseas migrar desde InsForge para pasar a una infraestructura relacional SQL propia (como **Supabase PostgreSQL** o **AWS RDS**):
1. **Instalar un ORM profesional (Prisma o Drizzle):**
   ```bash
   npm install drizzle-orm pg
   npm install -D drizzle-kit @types/pg
   ```
2. **Definir el esquema relacional (`src/db/schema.ts`):**
   ```typescript
   import { pgTable, uuid, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";

   export const products = pgTable("products", {
     id: uuid("id").primaryKey().defaultRandom(),
     name: text("name").notNull(),
     sku: text("sku").unique().notNull(),
     category: text("category").notNull(),
     stock: integer("stock").notNull().default(0),
     minStock: integer("min_stock").notNull().default(5),
     price: doublePrecision("price").notNull(),
     cost: doublePrecision("cost").notNull(),
     updatedAt: timestamp("updated_at").defaultNow(),
   });
   ```
3. **Migrar la lógica de los componentes:**
   Reemplazar las llamadas del cliente de InsForge en `src/lib/db.ts` con peticiones `fetch` hacia tus nuevos endpoints de API REST expuestos en el backend personalizado de Express, los cuales realizarán las consultas SQL correspondientes.

---

## 🛠️ 6. Flujo de Desarrollo Local

Si deseas correr este proyecto en tu propia máquina de manera local, sigue los siguientes pasos:

### Prerrequisitos
- Node.js 20 o superior (la versión que usan CI y Docker)
- npm 9 o superior

### Instalación de Dependencias
```bash
npm install
```

### Configuración del Entorno
1. Duplica el archivo de ejemplo para las variables de entorno:
   ```bash
   cp .env.example .env
   ```
2. Coloca tu clave secreta de Gemini:
   ```env
   GEMINI_API_KEY=tu_api_key_aqui
   ```

### Ejecutar en Modo de Desarrollo
```bash
npm run dev
```
Antes de desplegar, valida localmente lo mismo que CI: `npm run lint && npm test && npm run build`. Para probar el build de producción: `npm start` (fija `NODE_ENV=production`; expone `/healthz` para health checks).

El servidor de desarrollo de Vite se iniciará automáticamente y expondrá la aplicación en `http://localhost:3000` con recarga caliente y proxy asíncrono hacia los endpoints del backend en NodeJS.

---
*Tiendly - Herramientas de software con calidad artesanal y diseño técnico sostenible para el comercio local.*
