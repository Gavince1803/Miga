-- Migration: Restringir acceso a funciones/vista administrativas de códigos de activación
--
-- Causa raíz: 013_admin_code_generation.sql creó generate_activation_code(),
-- generate_batch_codes() (ambas SECURITY DEFINER) y admin_codes_view sin
-- revocar el acceso por defecto que Postgres/Supabase conceden a los roles
-- anon/authenticated al crear funciones y vistas nuevas. Esto permite que
-- cualquier usuario autenticado, con solo la anon key pública, llame
-- generate_activation_code() para acuñar sus propios códigos premium
-- gratis y canjearlos con la función redeem_activation_code() ya expuesta
-- al cliente (ver hooks/useSubscription.ts) — bypass total del sistema de
-- pago. admin_codes_view además bypassea la RLS de activation_codes (las
-- vistas corren con privilegios del owner por defecto), exponiendo todos
-- los códigos generados, incluyendo los no canjeados.
--
-- Este REVOKE no afecta el uso previsto original ("generar códigos desde
-- el SQL Editor de Supabase"): ese editor corre con el rol postgres/
-- superusuario, que bypassea los permisos de PostgREST por completo.

REVOKE EXECUTE ON FUNCTION generate_activation_code(VARCHAR, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION generate_batch_codes(INTEGER, VARCHAR, INTEGER) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON admin_codes_view FROM PUBLIC, anon, authenticated;
