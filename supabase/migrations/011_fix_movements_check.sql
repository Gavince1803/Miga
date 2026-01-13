-- Migration to fix movement_type constraint mismatch
-- The code uses 'uso' but schema defined 'ajuste'. We need both or simply 'uso'.

ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_movement_type_check
CHECK (movement_type IN ('deduccion', 'agregado', 'ajuste', 'importacion', 'uso'));

-- Ensure RLS is enabled correctly
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
