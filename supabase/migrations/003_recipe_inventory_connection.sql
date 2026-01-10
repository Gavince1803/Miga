-- ============================================
-- MIGRATION: Recipe-Inventory Connection
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. RECIPE INGREDIENTS (Links recipes to inventory)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Users can manage own recipe ingredients" ON public.recipe_ingredients
  FOR ALL USING (
    recipe_id IN (SELECT id FROM public.recipes WHERE user_id = auth.uid())
  );

-- 2. ORDER ITEMS (Multiple products per order)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id), -- Optional: for auto-deduction
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own order items" ON public.order_items;
CREATE POLICY "Users can manage own order items" ON public.order_items
  FOR ALL USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

-- 3. INVENTORY MOVEMENTS (Stock change history)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('deduccion', 'agregado', 'ajuste', 'importacion')),
  quantity NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own movements" ON public.inventory_movements;
CREATE POLICY "Users can view own movements" ON public.inventory_movements
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own movements" ON public.inventory_movements;
CREATE POLICY "Users can insert own movements" ON public.inventory_movements
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Done! You should see 3 new tables in your database.
