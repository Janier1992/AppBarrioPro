# 🏪 BarrioPro - Sistema de Gestión Comercial de Barrio

¡Bienvenido a **BarrioPro**! Una plataforma de nivel profesional, robusta y escalable diseñada específicamente para optimizar, organizar y potenciar la operación diaria de comercios locales e independientes (abastos, tiendas, minimarkets y verdulerías) en toda Latinoamérica.

Este proyecto integra un diseño visual moderno y limpio, persistencia en la nube en tiempo real mediante **Google Firebase (Firestore y Auth)**, un backend de analítica predictiva inteligente con **Google Gemini AI (3.5 Flash)** y visualización interactiva de rendimiento financiero mediante **Recharts**.

---

## 🏗️ 1. Arquitectura General de Software

La aplicación sigue una división física y conceptual absoluta de responsabilidades (Capa de Presentación, Capa de Lógica de Negocio y Capa de Datos) para asegurar un código mantenible, desacoplado y fácil de auditar.

```
                  ┌──────────────────────────────────────────────┐
                  │          CAPA DE PRESENTACIÓN (UI)           │
                  │   React 18.2 + Vite + TailwindCSS + Lucide   │
                  └──────┬────────────────────────────────┬──────┘
                         │                                │
                         ▼ (Lecturas en Tiempo Real)      ▼ (Peticiones API)
 ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
 │       CAPA DE DATOS (PERSISTENCIA)       │    │       CAPA DE LÓGICA DE NEGOCIO          │
 │   Google Firebase Firestore / Auth SDK   │    │  Backend Express (Node.js/TS proxy)      │
 └──────────────────────────────────────────┘    └──────────────┬───────────────────────────┘
                                                                │
                                                                ▼ (Inferencia / IA)
                                                 ┌──────────────────────────────────────────┐
                                                 │        Google Gemini 3.5 Flash API       │
                                                 └──────────────────────────────────────────┘
```

### Detalle de Capas
1. **Capa de Presentación (Frontend):** React v18 utilizando componentes funcionales altamente modulares e independientes, estilos utilitarios atómicos con Tailwind CSS y animaciones fluidas con `motion` (Framer Motion).
2. **Capa de Datos (Persistencia y Autenticación):** Integración directa del SDK cliente de Firebase para sincronización instantánea y offline-first de colecciones relativas al negocio (`products`, `sales`, `tasks`, `profile`).
3. **Capa de Lógica de Negocio (Backend Personalizado):** Un servidor de producción Express en TypeScript (`server.ts`) que centraliza y protege las credenciales de la API de Gemini, sirviendo como proxy seguro de endpoints críticos de IA y geolocalización.

---

## 📂 2. Árbol de Directorios Estructurado

El proyecto está organizado de manera predecible, limpia y balanceada, evitando redundancias u hojas duplicadas:

```
├── /assets                        # Recursos multimedia, logotipos e íconos vectoriales
├── /skills                        # Habilidades del agente y guías del sistema
├── /src                           # Código fuente de la aplicación React
│   ├── /components                # Componentes interactivos modulares y reutilizables
│   │   ├── Checklist.tsx          # Gestor de tareas, aperturas, cierres y rutinas
│   │   ├── Dashboard.tsx          # Panel principal con gráficos Recharts y KPIs
│   │   ├── Inventory.tsx          # Inventario, alertas de stock mínimo y control de precios
│   │   ├── Recommendations.tsx    # Asistente IA (reposiciones, combos y promociones)
│   │   ├── Sales.tsx              # Terminal Punto de Venta (POS) y caja diaria
│   │   └── Settings.tsx           # Configuración del perfil, PIN de seguridad e información
│   ├── /lib                       # Módulos de utilidades, helpers y configuraciones
│   │   ├── demoData.ts            # Generador/sembrador de datos simulados y ficticios
│   │   └── firebase.ts            # Inicialización de Firebase SDK y gestor defensivo de errores
│   ├── App.tsx                    # Orquestador del Layout Global, autenticación y barra lateral
│   ├── index.css                  # Estilos globales y variables de tipografía (Inter y JetBrains)
│   ├── main.tsx                   # Punto de entrada de renderizado de React
│   └── types.ts                   # Declaración e interfaz centralizada de Typescript
├── .env.example                   # Plantilla de variables de entorno seguras
├── firebase-applet-config.json    # Credenciales de comunicación del cliente Firebase
├── firestore.rules                # Reglas de seguridad declarativas de Firestore
├── package.json                   # Gestión de dependencias npm y scripts del ciclo de vida
├── server.ts                      # Servidor backend de API Express + Proxy de Gemini AI
└── tsconfig.json                  # Configuración estricta del compilador de TypeScript
```

---

## 📖 3. Glosario de Funciones Principales

A continuación se detallan las principales funciones operativas del sistema con su propósito y ubicación para facilitar las auditorías técnicas:

| Nombre de la Función | Ubicación | Propósito Técnico |
| :--- | :--- | :--- |
| `handleRegisterSale` | `Dashboard.tsx` | Registra una venta rápida desde el panel de control, disminuyendo el stock en Firestore y agregando la transacción. |
| `handleLoadDemo` | `Dashboard.tsx` | Carga un set completo de productos y ventas de los últimos 7 días en Firestore para poblar la visualización del negocio. |
| `handleAddTask` | `Checklist.tsx` | Valida, crea y registra una nueva tarea operativa diaria para el tendero. |
| `handleToggleComplete` | `Checklist.tsx` | Invierte el estado de completado de una tarea diaria (`completed: true/false`). |
| `handleDeleteTask` | `Checklist.tsx` | Elimina permanentemente una tarea específica de la base de datos de forma asíncrona. |
| `handleSaveEdit` | `Checklist.tsx` | Guarda las modificaciones de texto hechas mediante edición inline sobre una tarea. |
| `handleCreateProduct` | `Inventory.tsx` | Inserta un nuevo producto en el catálogo verificando duplicidad de código SKU. |
| `handleUpdateProduct` | `Inventory.tsx` | Modifica las especificaciones de un producto existente (precio, costo, stock mínimo y actual). |
| `handleDeleteProduct` | `Inventory.tsx` | Remueve un producto del catálogo de forma definitiva. |
| `handleFirestoreError` | `firebase.ts` | Captura excepciones de base de datos, mapea el contexto de autenticación del usuario y arroja un informe legible de error. |
| `getGeminiClient` | `server.ts` | Inicializa con "Lazy Loading" el cliente SDK de Google GenAI para evitar caídas de carga inicial del servidor. |

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
   npx cap init BarrioPro com.barriopro.app --web-dir=dist
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
   FROM node:18-alpine
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
   pm2 start dist/server.cjs --name "barriopro-backend"
   ```

### B. Migrar la Base de Datos a PostgreSQL Propia
Si deseas desvincularte de Firebase Firestore para pasar a una infraestructura relacional SQL propia (como **Supabase PostgreSQL** o **AWS RDS**):
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
   Reemplazar las llamadas de Firebase (`addDoc`, `collection`) con peticiones `fetch` hacia tus nuevos endpoints de API REST expuestos en el backend personalizado de Express, los cuales realizarán las consultas SQL correspondientes.

---

## 🛠️ 6. Flujo de Desarrollo Local

Si deseas correr este proyecto en tu propia máquina de manera local, sigue los siguientes pasos:

### Prerrequisitos
- Node.js (versión 18 o superior)
- npm (versión 9 o superior)

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
El servidor de desarrollo de Vite se iniciará automáticamente y expondrá la aplicación en `http://localhost:3000` con recarga caliente y proxy asíncrono hacia los endpoints del backend en NodeJS.

---
*BarrioPro - Herramientas de software con calidad artesanal y diseño técnico sostenible para el comercio local.*
