-- ============================================================
-- Migration 001 · Initial schema
-- Run once on a fresh PostgreSQL database before first deploy.
-- ============================================================

CREATE TABLE IF NOT EXISTS "GlobalAzureCredentials" (
    "Id"           SERIAL PRIMARY KEY,
    "TenantId"     TEXT NOT NULL DEFAULT '',
    "ClientId"     TEXT NOT NULL DEFAULT '',
    "ClientSecret" TEXT NOT NULL DEFAULT '',
    "CreatedAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Users" (
    "Id"                SERIAL PRIMARY KEY,
    "Email"             TEXT NOT NULL DEFAULT '',
    "Name"              TEXT NOT NULL DEFAULT '',
    "ProfilePictureUrl" TEXT,
    "Provider"          TEXT NOT NULL DEFAULT '',
    "ProviderId"        TEXT NOT NULL DEFAULT '',
    "TenantId"          TEXT,
    "CreatedAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
    "LastLoginAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
    "IsActive"          BOOLEAN NOT NULL DEFAULT TRUE,
    "Role"              INTEGER NOT NULL DEFAULT 1,
    "OrganizationName"  TEXT,
    "PasswordHash"      TEXT
);

CREATE TABLE IF NOT EXISTS "SsoProviderConfigs" (
    "Id"               SERIAL PRIMARY KEY,
    "Provider"         TEXT NOT NULL DEFAULT '',
    "ClientId"         TEXT NOT NULL DEFAULT '',
    "ClientSecret"     TEXT NOT NULL DEFAULT '',
    "Authority"        TEXT,
    "TenantId"         TEXT,
    "RedirectUri"      TEXT,
    "Scopes"           TEXT,
    "IsEnabled"        BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
    "UpdatedAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
    "OrganizationName" TEXT
);
