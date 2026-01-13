-- Add cost_per_unit to inventory table
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10, 2) DEFAULT 0;

-- Comment
COMMENT ON COLUMN inventory_items.cost_per_unit IS 'Cost of the ingredient per unit (e.g. price per 1kg)';
