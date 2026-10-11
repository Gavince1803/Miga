-- RLS audit 2026-10-11.
--
-- 1. Storage bucket `images`: the INSERT policies only checked bucket_id, so
--    any signed-in user could upload into another user's folder, and there was
--    no DELETE policy, so lib/storage.ts deleteImage() silently removed
--    nothing. uploadImage() always writes to `{user_id}/{folder}/{file}`
--    (every existing object already follows that layout), so both are scoped
--    to the caller's own folder.
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "fixImages 1ffg0oo_0" ON storage.objects;

CREATE POLICY "Users can upload own images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'images'
        AND (storage.foldername(name))[1] = (auth.uid())::text
    );

CREATE POLICY "Users can delete own images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'images'
        AND (storage.foldername(name))[1] = (auth.uid())::text
    );

-- Storage's remove() first SELECTs the rows it is about to delete, so the
-- owner also needs SELECT on their folder. Public URLs keep working because
-- the bucket is public (served without RLS).
CREATE POLICY "Users can view own images" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'images'
        AND (storage.foldername(name))[1] = (auth.uid())::text
    );

-- 2. SECURITY DEFINER functions had no fixed search_path. Pin it so a caller
--    can't shadow the unqualified table names they reference.
ALTER FUNCTION public.check_premium_status() SET search_path = public;
ALTER FUNCTION public.delete_user_account() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.redeem_activation_code(character varying) SET search_path = public;
ALTER FUNCTION public.generate_activation_code(character varying, integer, text, integer) SET search_path = public;
ALTER FUNCTION public.generate_batch_codes(integer, character varying, integer) SET search_path = public;

-- 3. admin_codes_view is owned by postgres and so bypassed RLS on
--    activation_codes. Nobody but postgres has SELECT on it today; make it run
--    with the caller's permissions anyway so a future GRANT can't leak codes.
ALTER VIEW public.admin_codes_view SET (security_invoker = on);

-- 4. options_dictionary had one ALL policy plus four per-command copies of the
--    same check. Keep the ALL policy, like every other table.
DROP POLICY IF EXISTS "Users can view their own options" ON options_dictionary;
DROP POLICY IF EXISTS "Users can insert their own options" ON options_dictionary;
DROP POLICY IF EXISTS "Users can update their own options" ON options_dictionary;
DROP POLICY IF EXISTS "Users can delete their own options" ON options_dictionary;
