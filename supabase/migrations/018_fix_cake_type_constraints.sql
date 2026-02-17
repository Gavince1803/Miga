-- Ensure cake_type column exists in orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cake_type TEXT;

-- Remove check constraint on options_dictionary category if it exists
-- We wrap in a DO block to avoid errors if the constraint doesn't exist
DO $$
BEGIN
    -- Try to find and drop the constraint if it limits categories
    -- Common names might be options_dictionary_category_check
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'options_dictionary_category_check') THEN
        ALTER TABLE public.options_dictionary DROP CONSTRAINT options_dictionary_category_check;
    END IF;
END $$;
