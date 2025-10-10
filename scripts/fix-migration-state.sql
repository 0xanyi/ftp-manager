-- Fix migration state by removing the failed migration record
-- This should be run against your production database to clean up the failed migration

-- First, let's see what's in the migrations table
SELECT migration_name, started_at, finished_at, logs 
FROM _prisma_migrations 
ORDER BY started_at DESC;

-- Remove the failed migration record for 20251009172043_
DELETE FROM _prisma_migrations 
WHERE migration_name = '20251009172043_';

-- Verify the cleanup
SELECT migration_name, started_at, finished_at, logs 
FROM _prisma_migrations 
ORDER BY started_at DESC;