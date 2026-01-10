-- 1. Primero limpiamos los datos para que cumplan la nueva regla
UPDATE orders SET payment_method = 'zelle' WHERE payment_method = 'pendiente';
UPDATE orders SET payment_method = 'pago_movil' WHERE payment_method = 'transferencia';

-- 2. Por seguridad, cualquier otro valor desconocido lo pasamos a 'efectivo'
-- (Esto evita que el constraint falle si hay algún otro texto basura)
UPDATE orders SET payment_method = 'efectivo' WHERE payment_method NOT IN ('efectivo', 'pago_movil', 'zelle');

-- 3. Ahora que los datos están limpios, aplicamos la regla estricta
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('efectivo', 'pago_movil', 'zelle'));
