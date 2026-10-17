-- 032: delivery separated from payment.
-- `status` mixed two things (Pendiente / Pagado / Cancelado). Payment already lives in
-- payment_status + deposit_amount; delivery gets its own column. `status` stays and is
-- still written the same way, so app versions before this one keep working.

BEGIN;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

COMMENT ON COLUMN public.orders.delivered_at IS
    'When the order was delivered (NULL = not delivered yet). Independent of payment.';

-- Backfill: past orders that weren't cancelled are assumed delivered on their delivery date
UPDATE public.orders
SET delivered_at = (delivery_date + COALESCE(delivery_time, '12:00'::time))::timestamptz
WHERE delivered_at IS NULL
  AND status <> 'cancelado'
  AND delivery_date < CURRENT_DATE;

COMMIT;
