-- Drop the old constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Add updated constraint
ALTER TABLE orders
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('efectivo', 'pago_movil', 'zelle'));
