-- 012_subscription_system.sql let each user INSERT/UPDATE their own row in
-- user_subscriptions, so anyone with the public anon key could set
-- is_premium = true / premium_until = '2099-01-01' on themselves and
-- check_premium_status() would honor it.
--
-- All legitimate writes go through SECURITY DEFINER functions
-- (redeem_activation_code, check_premium_status, delete_user_account), which
-- bypass RLS, so clients only need SELECT on their own row.
DROP POLICY IF EXISTS "Users can create own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;
