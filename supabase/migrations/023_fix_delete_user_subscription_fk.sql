-- Migration: delete_user_account() debe limpiar datos de suscripción
--
-- Causa raíz: user_subscriptions.user_id y activation_codes.redeemed_by
-- referencian auth.users(id) sin ON DELETE CASCADE (012_subscription_system.sql).
-- delete_user_account() (016_delete_user.sql) nunca toca esas dos tablas
-- antes de `delete from auth.users`, así que para cualquier usuario que
-- alguna vez canjeó un código (es decir, cualquier cliente pagador) el
-- DELETE final viola la foreign key y toda la función falla — haciendo
-- rollback también de los borrados de recipes/orders/inventory_items que
-- sí se habían ejecutado. El usuario ve "No se pudo eliminar la cuenta.
-- Intenta de nuevo." indefinidamente (ver app/(tabs)/settings.tsx), sin
-- poder ejercer su derecho de borrado (GDPR / App Store Guideline 5.1.1).

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete dependent data (children first)
  DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = current_user_id);
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = current_user_id);
  DELETE FROM inventory_movements WHERE inventory_item_id IN (SELECT id FROM inventory_items WHERE user_id = current_user_id);

  -- Delete main entities
  DELETE FROM recipes WHERE user_id = current_user_id;
  DELETE FROM orders WHERE user_id = current_user_id;
  DELETE FROM inventory_items WHERE user_id = current_user_id;

  -- Subscription data: remove the user's own subscription row, and null
  -- out redeemed_by on any activation code they redeemed (the code itself
  -- is admin-owned historical data, not the user's — we keep the row and
  -- its redeemed_at, only clear the reference to the deleted user).
  DELETE FROM user_subscriptions WHERE user_id = current_user_id;
  UPDATE activation_codes SET redeemed_by = NULL WHERE redeemed_by = current_user_id;

  -- Finally, delete the user from auth.users
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
