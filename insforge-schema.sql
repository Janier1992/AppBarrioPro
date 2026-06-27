-- ======================================================
-- Archivo: insforge-schema.sql
-- Responsabilidad: Definición de Esquema de Base de Datos (DDL)
-- Módulo: Capa de Base de Datos (Database Layer)
-- Descripción: Define la estructura relacional de la base de datos PostgreSQL
--              en InsForge, incluyendo tablas, restricciones e índices.
-- Dependencias: Ninguna
-- Observaciones: Compatible con consultas de la capa de datos.
-- ======================================================

-- Habilitar la extensión de generación de UUIDs si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. TABLA: PROFILE (Perfil Comercial de la Tienda)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile (
    id VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) UNIQUE NOT NULL,
    "businessName" VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    hours VARCHAR(100),
    "lowStockThreshold" INTEGER DEFAULT 5,
    "umbralStockCritico" INTEGER DEFAULT 5,
    "securityPin" VARCHAR(10),
    theme VARCHAR(20) DEFAULT 'light',
    "logoUrl" TEXT,
    "hasCompletedOnboarding" BOOLEAN DEFAULT FALSE,
    "geminiApiKey" TEXT,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_profile_user ON profile("userId");

-- --------------------------------------------------------------------
-- 2. TABLA: PRODUCTS (Catálogo e Inventario)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    category VARCHAR(100),
    stock INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost NUMERIC(12, 2) DEFAULT 0.00,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_products_user ON products("userId");
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- --------------------------------------------------------------------
-- 3. TABLA: SALES (Transacciones y Ventas de Punto de Venta)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" VARCHAR(255) DEFAULT 'Consumidor Final',
    "paymentMethod" VARCHAR(100) DEFAULT 'Efectivo'
);

-- Índices de auditoría y análisis temporal
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales("userId");
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(timestamp);

-- --------------------------------------------------------------------
-- 4. TABLA: TASKS (Checklist de Tareas Operativas Diarias)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de checklist
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks("userId");
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks("createdAt");

-- --------------------------------------------------------------------
-- 5. TABLA: DEBTS (Registro de Fiados y Cuentas por Cobrar)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS debts (
    id VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "clientName" VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "dueDate" VARCHAR(100) NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP WITH TIME ZONE
);

-- Índices de cobranzas
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts("userId");
CREATE INDEX IF NOT EXISTS idx_debts_paid ON debts(paid);
