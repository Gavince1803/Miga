-- Add cost columns to inventory_movements for accurate financial tracking
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;

-- Optional: Update existing movements to estimate cost based on current item cost
-- efficiently updates historical data using current cost as a fallback
UPDATE public.inventory_movements im
SET 
  unit_cost = ii.cost_per_unit,
  total_cost = im.quantity * ii.cost_per_unit
FROM public.inventory_items ii
WHERE im.inventory_item_id = ii.id
AND im.total_cost = 0 
AND im.movement_type = 'agregado';
