-- =====================================================
-- Migration: Add Treatment Board Type
-- Date: 2026-04-03
-- Description: Adds TREATMENT value to the BoardType enum
--   to support a default CRM pipeline for treatments
--   connected to the ERP treatments module.
-- =====================================================

-- Add new value to BoardType enum
ALTER TYPE "BoardType" ADD VALUE IF NOT EXISTS 'TREATMENT';
