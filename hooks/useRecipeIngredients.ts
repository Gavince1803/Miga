import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export type RecipeIngredient = {
    id: string;
    recipeId: string;
    inventoryItemId: string;
    quantity: number;
    unit: string;
    // Joined data for display
    inventoryItem?: {
        id: string;
        name: string;
        quantity: number;

        unit: string;
        costPerUnit: number;
    };
};

export type NewRecipeIngredient = {
    inventoryItemId: string;
    quantity: number;
    unit: string;
};

export function useRecipeIngredients() {
    const [loading, setLoading] = useState(false);

    /**
     * Fetch all ingredients for a recipe with their inventory item details
     */
    const { showAlert } = useAlert();

    const getIngredientsForRecipe = async (recipeId: string): Promise<RecipeIngredient[]> => {
        try {
            const { data, error } = await supabase
                .from('recipe_ingredients')
                .select(`
                    id,
                    recipe_id,
                    inventory_item_id,
                    quantity,
                    unit,
                    inventory_items (
                        id,
                        name,
                        quantity,
                        unit,
                        cost_per_unit
                    )
                `)
                .eq('recipe_id', recipeId);

            if (error) throw error;

            return (data || []).map(item => ({
                id: item.id,
                recipeId: item.recipe_id,
                inventoryItemId: item.inventory_item_id,
                quantity: item.quantity,
                unit: item.unit,
                inventoryItem: item.inventory_items ? {
                    id: (item.inventory_items as any).id,
                    name: (item.inventory_items as any).name,
                    quantity: (item.inventory_items as any).quantity,
                    unit: (item.inventory_items as any).unit,
                    costPerUnit: (item.inventory_items as any).cost_per_unit || 0,
                } : undefined
            }));
        } catch (error) {
            console.error('Error fetching recipe ingredients:', error);
            return [];
        }
    };

    const addIngredient = async (
        recipeId: string,
        ingredient: NewRecipeIngredient
    ): Promise<RecipeIngredient | null> => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('recipe_ingredients')
                .insert({
                    recipe_id: recipeId,
                    inventory_item_id: ingredient.inventoryItemId,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                recipeId: data.recipe_id,
                inventoryItemId: data.inventory_item_id,
                quantity: data.quantity,
                unit: data.unit
            };
        } catch (error) {
            console.error('Error adding ingredient:', error);
            showAlert({ title: 'Error', message: 'No se pudo agregar el ingrediente', type: 'error' });
            return null;
        } finally {
            setLoading(false);
        }
    };

    const createAndAddIngredient = async (
        recipeId: string,
        name: string,
        quantity: number,
        unit: string
    ): Promise<RecipeIngredient | null> => {
        try {
            setLoading(true);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            const normalizedName = name.trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

            const { data: existing } = await supabase
                .from('inventory_items')
                .select('id')
                .ilike('name', normalizedName)
                .single();

            let inventoryItemId: string;

            if (existing) {
                inventoryItemId = existing.id;
            } else {
                const { data: newItem, error: createError } = await supabase
                    .from('inventory_items')
                    .insert({
                        user_id: session.user.id,
                        name: normalizedName,
                        quantity: 0,
                        unit: unit,
                        min_stock: 5,
                        category: 'General'
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                inventoryItemId = newItem.id;
            }

            return await addIngredient(recipeId, {
                inventoryItemId,
                quantity,
                unit
            });
        } catch (error) {
            console.error('Error creating ingredient:', error);
            showAlert({ title: 'Error', message: 'No se pudo crear el ingrediente', type: 'error' });
            return null;
        } finally {
            setLoading(false);
        }
    };

    const updateIngredient = async (
        id: string,
        updates: { quantity?: number; unit?: string }
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('recipe_ingredients')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating ingredient:', error);
            return false;
        }
    };

    const removeIngredient = async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('recipe_ingredients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error removing ingredient:', error);
            return false;
        }
    };

    const setIngredientsForRecipe = async (
        recipeId: string,
        ingredients: NewRecipeIngredient[]
    ): Promise<boolean> => {
        try {
            setLoading(true);

            await supabase
                .from('recipe_ingredients')
                .delete()
                .eq('recipe_id', recipeId);

            if (ingredients.length > 0) {
                const { error } = await supabase
                    .from('recipe_ingredients')
                    .insert(
                        ingredients.map(ing => ({
                            recipe_id: recipeId,
                            inventory_item_id: ing.inventoryItemId,
                            quantity: ing.quantity,
                            unit: ing.unit
                        }))
                    );

                if (error) throw error;
            }

            return true;
        } catch (error) {
            console.error('Error setting ingredients:', error);
            showAlert({ title: 'Error', message: 'No se pudieron guardar los ingredientes', type: 'error' });
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        getIngredientsForRecipe,
        addIngredient,
        createAndAddIngredient,
        updateIngredient,
        removeIngredient,
        setIngredientsForRecipe
    };
}
