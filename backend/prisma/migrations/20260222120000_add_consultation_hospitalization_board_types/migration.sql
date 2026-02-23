-- =====================================================
-- Migration: Add Consultation and Hospitalization Board Types
-- Date: 2026-02-22
-- Description: Adds CONSULTATION and HOSPITALIZATION values
--   to the BoardType enum to support default CRM pipelines
--   for veterinary consultations and hospitalizations.
-- =====================================================

-- Add new values to BoardType enum
ALTER TYPE "BoardType" ADD VALUE IF NOT EXISTS 'CONSULTATION';
ALTER TYPE "BoardType" ADD VALUE IF NOT EXISTS 'HOSPITALIZATION';
