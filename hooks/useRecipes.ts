import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

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
                .select('*')
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
                }));
                setRecipes(mapped);
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
            // Alert.alert('Error', 'No se pudieron cargar las recetas'); // Silent failure on refetch is better
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const createRecipe = async (data: RecipeFormData) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('Error', 'Debes iniciar sesión');
                return null;
            }

            const { data: newRecipe, error } = await supabase
                .from('recipes')
                .insert([{
                    user_id: session.user.id,
                    title: data.title,
                    image_url: data.imageUrl,
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
            Alert.alert('Error', 'No se pudo guardar la receta');
            return null;
        }
    };

    const updateRecipe = async (id: string, updates: Partial<RecipeFormData>) => {
        try {
            const { error } = await supabase
                .from('recipes')
                .update({
                    title: updates.title,
                    image_url: updates.imageUrl,
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
            Alert.alert('Error', 'No se pudo actualizar la receta');
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
            Alert.alert('Error', 'No se pudo eliminar la receta');
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRecipes(false);
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
        deleteRecipe,
        getRecipeById
    };
}
