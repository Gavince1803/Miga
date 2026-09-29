-- Order numbers came from one sequence shared by every user: a new user's
-- first order was #1541, and the number leaked how many orders the whole app
-- has. From now on each user gets her own sequence: max(order_number) + 1.
--
-- Existing orders keep their numbers (clients may already have them on a PDF
-- or WhatsApp); each user's next order continues from her own highest number,
-- and new users start at #1.
BEGIN;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Serialize inserts per user so two orders created at once can't get the same number
    PERFORM pg_advisory_xact_lock(hashtext('order_number:' || NEW.user_id::text));

    SELECT COALESCE(MAX(order_number), 0) + 1
      INTO NEW.order_number
      FROM public.orders
     WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- A uniqueness rule on order_number alone would now collide between users:
-- replace it with uniqueness per user.
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT con.conname
          FROM pg_constraint con
         WHERE con.conrelid = 'public.orders'::regclass
           AND con.contype = 'u'
           AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute
                                    WHERE attrelid = 'public.orders'::regclass
                                      AND attname = 'order_number')]
    LOOP
        EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_user_order_number_key
    ON public.orders (user_id, order_number);

COMMIT;
