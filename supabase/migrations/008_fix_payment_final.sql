-- 1. PRIMERO Eliminamos la restricción vieja para tener libertad de cambiar los datos
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- 2. AHORA actualizamos los datos sin que nada nos bloquee
UPDATE orders SET payment_method = 'zelle' WHERE payment_method = 'pendiente';
UPDATE orders SET payment_method = 'pago_movil' WHERE payment_method = 'transferencia';

-- 3. Limpieza de seguridad
UPDATE orders SET payment_method = 'efectivo' WHERE payment_method NOT IN ('efectivo', 'pago_movil', 'zelle');

-- 4. FINALMENTE agregamos la restricción nueva
ALTER TABLE orders
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('efectivo', 'pago_movil', 'zelle'));
