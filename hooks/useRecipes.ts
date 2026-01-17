import { useAlert } from '@/context/AlertContext';
import { uploadImage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export type Recipe = {
    id: string;
    userId: string;
    title: string;
    imageUrl: string | null;
    ingredients: string;
    steps: string;
    category: string | null;
    createdAt: string;
    updatedAt: string;
    // Pricing
    suggestedPrice?: number;
    costPerPortion?: number;
    // Relations
    recipeIngredients?: {
        quantity: number;
        unit: string;
        inventoryItem: {
            name: string;
            costPerUnit: number;
            unit: string;
        }
    }[];
};

export type RecipeFormData = {
    title: string;
    imageUrl?: string;
    ingredients: string;
    steps: string;
    category?: string;
};

export function useRecipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Assuming useAlert is defined elsewhere and imported
    // const { showAlert } = useAlert(); // This line was commented out in the original, but the instruction implies it should be here. I'll assume it's meant to be uncommented.
    // If useAlert is not defined, this will cause an error. I'll keep it as it was in the original, but move it.
    const { showAlert } = useAlert();

    const fetchRecipes = async (silent = false) => {
        try {
            if (!silent && recipes.length === 0) setLoading(true);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setRecipes([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('recipes')
                .select(`
                    *,
                    recipe_ingredients (
                        quantity,
                        unit,
                        inventory_items (
                            name,
                            cost_per_unit,
                            unit
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const mapped: Recipe[] = data.map(item => ({
                    id: item.id,
                    userId: item.user_id,
                    title: item.title,
                    imageUrl: item.image_url,
                    ingredients: item.ingredients,
                    steps: item.steps,
                    category: item.category,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    suggestedPrice: item.suggested_price,
                    costPerPortion: item.cost_per_portion,
                    recipeIngredients: item.recipe_ingredients?.map((ri: any) => ({
                        quantity: ri.quantity,
                        unit: ri.unit, // Unit used in recipe
                        inventoryItem: {
                            name: ri.inventory_items?.name || 'Item',
                            costPerUnit: ri.inventory_items?.cost_per_unit || 0,
                            unit: ri.inventory_items?.unit || 'u'
                        }
                    })) || []
                }));
                // ...
                setRecipes(mapped);
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const createRecipe = async (data: RecipeFormData) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showAlert({ title: 'Error', message: 'Debes iniciar sesión', type: 'error' });
                return null;
            }

            // Upload image to Supabase Storage if it's a local URI
            let finalImageUrl: string | undefined = data.imageUrl;
            if (data.imageUrl && !data.imageUrl.includes('supabase.co')) {
                finalImageUrl = (await uploadImage(data.imageUrl, 'recipes')) || undefined;
            }

            const { data: newRecipe, error } = await supabase
                .from('recipes')
                .insert([{
                    user_id: session.user.id,
                    title: data.title,
                    image_url: finalImageUrl,
                    ingredients: data.ingredients,
                    steps: data.steps,
                    category: data.category
                }])
                .select()
                .single();

            if (error) throw error;

            await fetchRecipes();
            return newRecipe;
        } catch (error) {
            console.error('Error creating recipe:', error);
            showAlert({ title: 'Error', message: 'No se pudo guardar la receta', type: 'error' });
            return null;
        }
    };

    const updateRecipe = async (id: string, updates: Partial<RecipeFormData>) => {
        try {
            // Upload image to Supabase Storage if it's a local URI
            let finalImageUrl = updates.imageUrl;
            if (updates.imageUrl && !updates.imageUrl.includes('supabase.co')) {
                finalImageUrl = await uploadImage(updates.imageUrl, 'recipes') || undefined;
            }

            const { error } = await supabase
                .from('recipes')
                .update({
                    title: updates.title,
                    image_url: finalImageUrl,
                    ingredients: updates.ingredients,
                    steps: updates.steps,
                    category: updates.category,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id); // RLS ensures user owns it

            if (error) throw error;
            await fetchRecipes();
            return true;
        } catch (error) {
            console.error('Error updating recipe:', error);
            showAlert({ title: 'Error', message: 'No se pudo actualizar la receta', type: 'error' });
            return false;
        }
    };

    const getRecipeById = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data) {
                return {
                    id: data.id,
                    userId: data.user_id,
                    title: data.title,
                    imageUrl: data.image_url,
                    ingredients: data.ingredients,
                    steps: data.steps,
                    category: data.category,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                } as Recipe;
            }
            return null;
        } catch (error) {
            console.error('Error fetching recipe:', error);
            return null;
        }
    };

    const deleteRecipe = async (id: string) => {
        try {
            const { error } = await supabase
                .from('recipes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchRecipes();
        } catch (error) {
            console.error('Error deleting recipe:', error);
            showAlert({ title: 'Error', message: 'No se pudo eliminar la receta', type: 'error' });
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRecipes(false);
    };

    // Update recipe pricing from calculator
    const updateRecipePrice = async (id: string, suggestedPrice: number, costPerPortion: number) => {
        try {
            const { error } = await supabase
                .from('recipes')
                .update({
                    suggested_price: suggestedPrice,
                    cost_per_portion: costPerPortion,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setRecipes(prev => prev.map(r =>
                r.id === id ? { ...r, suggestedPrice, costPerPortion } : r
            ));

            return true;
        } catch (error) {
            console.error('Error updating recipe price:', error);
            showAlert({ title: 'Error', message: 'No se pudo guardar el precio', type: 'error' });
            return false;
        }
    };

    useEffect(() => {
        fetchRecipes(false);
    }, []);

    // Silent refetch exposed
    const refreshSilent = () => fetchRecipes(true);

    return {
        recipes,
        loading,
        refreshing,
        onRefresh,
        refreshSilent,
        createRecipe,
        updateRecipe,
        updateRecipePrice,
        deleteRecipe,
        getRecipeById
    };
}
