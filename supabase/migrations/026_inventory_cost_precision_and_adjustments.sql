-- 1. cost_per_unit was numeric(10,2): a cost per gram/ml like 0.0025 was stored
--    as 0.00, so ingredients kept in g/ml lost their cost (recipe costing and
--    the weighted-average purchase price broke). Remove the scale limit.
--    Values already rounded can't be recovered; new purchases store full precision.
-- 2. The app now logs stock corrections (+/-) as 'ajuste' so they don't count as
--    purchases (expenses). Redefine the check with every type the app writes.
-- Wrapped in a transaction: if an existing row has a type not listed, nothing changes.
BEGIN;

ALTER TABLE public.inventory_items
    ALTER COLUMN cost_per_unit TYPE numeric;

ALTER TABLE public.inventory_movements
    DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE public.inventory_movements
    ADD CONSTRAINT inventory_movements_movement_type_check
    CHECK (movement_type IN ('agregado', 'uso', 'importacion', 'deduccion', 'ajuste'));

COMMIT;
