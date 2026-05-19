-- ============================================================
-- CloudLens API startup patch · SQLite
-- Keeps startup schema repair SQL outside Program.cs.
-- ============================================================

DELETE FROM "GlobalAzureCredentials" WHERE "Id" IS NULL;
DELETE FROM "Users" WHERE "Id" IS NULL;

CREATE TABLE IF NOT EXISTS "Users" (
    "Id"                       INTEGER PRIMARY KEY AUTOINCREMENT,
    "Email"                    TEXT NOT NULL DEFAULT '',
    "Name"                     TEXT NOT NULL DEFAULT '',
    "ProfilePictureUrl"        TEXT,
    "Provider"                 TEXT NOT NULL DEFAULT '',
    "ProviderId"               TEXT NOT NULL DEFAULT '',
    "TenantId"                 TEXT,
    "CreatedAt"                TEXT NOT NULL DEFAULT '',
    "LastLoginAt"              TEXT NOT NULL DEFAULT '',
    "IsActive"                 INTEGER NOT NULL DEFAULT 1,
    "Role"                     INTEGER NOT NULL DEFAULT 1,
    "OrganizationName"         TEXT,
    "PasswordHash"             TEXT,
    "PasswordResetToken"       TEXT,
    "PasswordResetTokenExpiry" TEXT
);

CREATE TABLE IF NOT EXISTS "SsoProviderConfigs" (
    "Id"               INTEGER PRIMARY KEY AUTOINCREMENT,
    "Provider"         TEXT NOT NULL DEFAULT '',
    "ClientId"         TEXT NOT NULL DEFAULT '',
    "ClientSecret"     TEXT NOT NULL DEFAULT '',
    "Authority"        TEXT,
    "TenantId"         TEXT,
    "RedirectUri"      TEXT,
    "Scopes"           TEXT,
    "IsEnabled"        INTEGER NOT NULL DEFAULT 1,
    "CreatedAt"        TEXT NOT NULL DEFAULT '',
    "UpdatedAt"        TEXT NOT NULL DEFAULT '',
    "OrganizationName" TEXT
);

ALTER TABLE "Users" ADD COLUMN "PasswordHash" TEXT;
ALTER TABLE "Users" ADD COLUMN "PasswordResetToken" TEXT;
ALTER TABLE "Users" ADD COLUMN "PasswordResetTokenExpiry" TEXT;
