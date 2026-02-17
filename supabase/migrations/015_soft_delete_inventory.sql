-- Add soft delete (archive) column to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
