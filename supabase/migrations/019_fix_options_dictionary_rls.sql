-- Enable RLS on options_dictionary if not already enabled
ALTER TABLE public.options_dictionary ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to select their own options
CREATE POLICY "Users can view their own options" 
ON public.options_dictionary FOR SELECT 
USING (auth.uid() = user_id);

-- Policy to allow users to insert their own options
CREATE POLICY "Users can insert their own options" 
ON public.options_dictionary FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own options
CREATE POLICY "Users can update their own options" 
ON public.options_dictionary FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy to allow users to delete their own options
CREATE POLICY "Users can delete their own options" 
ON public.options_dictionary FOR DELETE 
USING (auth.uid() = user_id);
