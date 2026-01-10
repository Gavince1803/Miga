-- Update legacy payment methods
UPDATE orders SET payment_method = 'zelle' WHERE payment_method = 'pendiente';
UPDATE orders SET payment_method = 'pago_movil' WHERE payment_method = 'transferencia';
