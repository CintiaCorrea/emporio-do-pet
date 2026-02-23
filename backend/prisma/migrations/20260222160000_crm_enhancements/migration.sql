-- CRM Enhancements Migration
-- Adds new fields for CRM integration: Lead/Client conversion, Kanban integration, automation triggers

-- Add new BoardType values
-- Note: Enum values are added automatically by Prisma

-- Add new AutomationTrigger values for CRM
-- Note: Enum values are added automatically by Prisma

-- Create ClientStatus enum if not exists
DO $$ BEGIN
    CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CHURNED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ClientType enum if not exists
DO $$ BEGIN
    CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'COMPANY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "type" "ClientType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "company_name" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "tax_id" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "converted_from_lead_id" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "total_revenue" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "total_orders" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "last_order_at" TIMESTAMP(3);

-- Create index on client status
CREATE INDEX IF NOT EXISTS "clients_status_idx" ON "clients"("status");
CREATE INDEX IF NOT EXISTS "clients_converted_from_lead_id_idx" ON "clients"("converted_from_lead_id");

-- Add new columns to leads table
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "converted_to_client_id" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "whatsapp_conversation_id" TEXT;

-- Create index on lead converted_to_client_id
CREATE INDEX IF NOT EXISTS "leads_converted_to_client_id_idx" ON "leads"("converted_to_client_id");

-- Add new columns to kanban_cards table (if table exists with old name, handle both)
DO $$ 
BEGIN
    -- Try adding to kanban_cards first (new name)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kanban_cards') THEN
        ALTER TABLE "kanban_cards" ADD COLUMN IF NOT EXISTS "lead_id" TEXT UNIQUE;
        ALTER TABLE "kanban_cards" ADD COLUMN IF NOT EXISTS "client_id" TEXT UNIQUE;
        ALTER TABLE "kanban_cards" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'medium';
        ALTER TABLE "kanban_cards" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3);
        ALTER TABLE "kanban_cards" ADD COLUMN IF NOT EXISTS "assigned_to" TEXT;
        ALTER TABLE "kanban_cards" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
        
        CREATE INDEX IF NOT EXISTS "kanban_cards_lead_id_idx" ON "kanban_cards"("lead_id");
        CREATE INDEX IF NOT EXISTS "kanban_cards_client_id_idx" ON "kanban_cards"("client_id");
    END IF;
    
    -- Also try KanbanCard (old name from Prisma default)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'KanbanCard') THEN
        ALTER TABLE "KanbanCard" ADD COLUMN IF NOT EXISTS "lead_id" TEXT UNIQUE;
        ALTER TABLE "KanbanCard" ADD COLUMN IF NOT EXISTS "client_id" TEXT UNIQUE;
        ALTER TABLE "KanbanCard" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'medium';
        ALTER TABLE "KanbanCard" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3);
        ALTER TABLE "KanbanCard" ADD COLUMN IF NOT EXISTS "assigned_to" TEXT;
        ALTER TABLE "KanbanCard" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
        
        CREATE INDEX IF NOT EXISTS "KanbanCard_lead_id_idx" ON "KanbanCard"("lead_id");
        CREATE INDEX IF NOT EXISTS "KanbanCard_client_id_idx" ON "KanbanCard"("client_id");
    END IF;
END $$;
