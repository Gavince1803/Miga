-- The app offers 'transferencia' for non-VES currencies since March 2026
-- (getPaymentMethodOptions in types/index.ts), but the original check
-- constraint on orders.payment_method never included it, so inserts and
-- updates with that value fail with 23514.
-- Redefine the constraint to match the PaymentMethod type.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('efectivo', 'pago_movil', 'zelle', 'transferencia'));
