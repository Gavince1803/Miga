-- In-app feedback: one-time prompt after a success moment (order paid) plus a
-- permanent "Enviar sugerencia" entry in Settings. Happy users are sent to the
-- native store review dialog; unhappy ones leave feedback here instead.
BEGIN;

CREATE TABLE IF NOT EXISTS public.feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category text NOT NULL CHECK (category IN ('pedidos', 'inventario', 'finanzas', 'precios', 'otro')),
    message text,
    allow_contact boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own feedback insert" ON public.feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own feedback select" ON public.feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Lives in profiles (not AsyncStorage) so it survives reinstalls and new phones
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS feedback_prompt_shown boolean NOT NULL DEFAULT false;

COMMIT;
