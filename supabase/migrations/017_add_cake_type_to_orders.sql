-- Add cake_type column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cake_type TEXT;

-- Comment for clarity
COMMENT ON COLUMN public.orders.cake_type IS 'Type of cake (e.g., Vainilla, Chocolate, Red Velvet)';
