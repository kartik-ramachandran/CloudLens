-- ============================================================
-- Migration 002 · Password reset tokens
-- Adds reset token columns to the Users table.
-- ============================================================

ALTER TABLE "Users"
    ADD COLUMN IF NOT EXISTS "PasswordResetToken"       TEXT,
    ADD COLUMN IF NOT EXISTS "PasswordResetTokenExpiry" TIMESTAMP;
