import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Alert } from 'react-native';

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
                        unit
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
                } : undefined
            }));
        } catch (error) {
            console.error('Error fetching recipe ingredients:', error);
            return [];
        }
    };

    /**
     * Add an ingredient to a recipe
     * If inventoryItemId is null, we'll create a new inventory item first
     */
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
            Alert.alert('Error', 'No se pudo agregar el ingrediente');
            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Create a new inventory item and add it as recipe ingredient
     * Used when user types a new ingredient name not in inventory
     */
    const createAndAddIngredient = async (
        recipeId: string,
        name: string,
        quantity: number,
        unit: string
    ): Promise<RecipeIngredient | null> => {
        try {
            setLoading(true);

            // 1. Get session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            // 2. Normalize name (capitalize first letter of each word)
            const normalizedName = name.trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

            // 3. Check if item already exists (case insensitive)
            const { data: existing } = await supabase
                .from('inventory_items')
                .select('id')
                .ilike('name', normalizedName)
                .single();

            let inventoryItemId: string;

            if (existing) {
                // Use existing
                inventoryItemId = existing.id;
            } else {
                // Create new inventory item with 0 stock
                const { data: newItem, error: createError } = await supabase
                    .from('inventory_items')
                    .insert({
                        user_id: session.user.id,
                        name: normalizedName,
                        quantity: 0, // Start with 0 stock
                        unit: unit,
                        min_stock: 5,
                        category: 'General'
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                inventoryItemId = newItem.id;
            }

            // 4. Add as recipe ingredient
            return await addIngredient(recipeId, {
                inventoryItemId,
                quantity,
                unit
            });
        } catch (error) {
            console.error('Error creating ingredient:', error);
            Alert.alert('Error', 'No se pudo crear el ingrediente');
            return null;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Update ingredient quantity/unit
     */
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

    /**
     * Remove ingredient from recipe
     */
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

    /**
     * Bulk add ingredients to a recipe (for initial creation)
     */
    const setIngredientsForRecipe = async (
        recipeId: string,
        ingredients: NewRecipeIngredient[]
    ): Promise<boolean> => {
        try {
            setLoading(true);

            // First, delete existing ingredients
            await supabase
                .from('recipe_ingredients')
                .delete()
                .eq('recipe_id', recipeId);

            // Then insert new ones
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
            Alert.alert('Error', 'No se pudieron guardar los ingredientes');
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
