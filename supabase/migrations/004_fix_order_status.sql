-- Remove the old check constraint if it exists (name might vary, so we try generic approach or drop specific name if known)
-- Assuming the constraint is named "orders_status_check" or similar.
-- Or better, we can just alter the constraint.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_status_check'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_status_check;
    END IF;
END $$;

-- Add the new constraint with 'pagado'
ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pendiente', 'pagado', 'cancelado'));

-- Also update existing orders that might have old statuses to 'pendiente' or 'pagado' to avoid violations?
-- Actually, data might already be there. We should update data first before adding constraint if we were stricter.
-- But since we dropped the old one (if it existed), now we add new one.
-- Let's update any old status to compatible ones to be safe
UPDATE orders SET status = 'pendiente' WHERE status = 'en_proceso';
UPDATE orders SET status = 'pagado' WHERE status = 'completado';
