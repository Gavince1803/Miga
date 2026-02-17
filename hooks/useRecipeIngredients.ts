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
        isArchived?: boolean;
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
                        cost_per_unit,
                        is_archived
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
                    isArchived: (item.inventory_items as any).is_archived || false,
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
        unit: string,
        purchaseDetails?: {
            purchaseQuantity?: number;
            purchaseUnit?: string;
            purchaseCost?: number;
        }
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
                .select('id, is_archived')
                .ilike('name', normalizedName)
                .single();

            let inventoryItemId: string;

            if (existing) {
                inventoryItemId = existing.id;

                // Unarchive if it was archived
                if (existing.is_archived) {
                    await supabase
                        .from('inventory_items')
                        .update({ is_archived: false })
                        .eq('id', existing.id);
                }

                // If purchase details provided for EXISTING item, update stock and log movement!
                if (purchaseDetails?.purchaseQuantity && purchaseDetails?.purchaseCost) {
                    const pQty = purchaseDetails.purchaseQuantity;
                    const pUnit = purchaseDetails.purchaseUnit || unit;

                    // Conversion
                    const convertUnit = (val: number, from: string, to: string): number => {
                        if (from === to) return val;
                        if (from === 'kg' && to === 'g') return val * 1000;
                        if (from === 'g' && to === 'kg') return val / 1000;
                        if (from === 'L' && to === 'ml') return val * 1000;
                        if (from === 'ml' && to === 'L') return val / 1000;
                        return val;
                    };

                    const addedQuantity = convertUnit(pQty, pUnit, unit);

                    if (addedQuantity > 0) {
                        // 1. Get current details to calc average cost
                        const { data: currentItem } = await supabase
                            .from('inventory_items')
                            .select('quantity, cost_per_unit')
                            .eq('id', existing.id)
                            .single();

                        const oldQty = currentItem?.quantity || 0;
                        const oldCost = currentItem?.cost_per_unit || 0;
                        const newCost = purchaseDetails.purchaseCost / addedQuantity; // Unit cost of THIS purchase

                        // Weighted Average Cost
                        // New Avg = ((OldQty * OldCost) + (NewQty * NewCost)) / (OldQty + NewQty)
                        // Note: If OldQty < 0, handle gracefully? Assume 0 for weight.
                        const validOldQty = Math.max(0, oldQty);
                        const weightedCost = ((validOldQty * oldCost) + (addedQuantity * newCost)) / (validOldQty + addedQuantity);

                        // 2. Update Inventory Item
                        await supabase
                            .from('inventory_items')
                            .update({
                                quantity: oldQty + addedQuantity,
                                cost_per_unit: weightedCost
                            })
                            .eq('id', existing.id);

                        // 3. Log Movement
                        await supabase.from('inventory_movements').insert({
                            user_id: session.user.id,
                            inventory_item_id: existing.id,
                            movement_type: 'agregado',
                            quantity: addedQuantity,
                            unit_cost: newCost,
                            total_cost: purchaseDetails.purchaseCost,
                            notes: 'Compra (desde Receta - Existente)'
                        });
                    }
                }

            } else {
                // Calculate Unit Cost if provided
                let costPerUnit = 0;
                let initialQuantity = 0;

                // Basic Unit Conversion Helper
                const convertUnit = (val: number, from: string, to: string): number => {
                    if (from === to) return val;
                    // Mass
                    if (from === 'kg' && to === 'g') return val * 1000;
                    if (from === 'g' && to === 'kg') return val / 1000;
                    // Volume
                    if (from === 'L' && to === 'ml') return val * 1000;
                    if (from === 'ml' && to === 'L') return val / 1000;

                    // Fallback for incompatible or custom units (e.g. u -> u, or kg -> L)
                    return val;
                };

                if (purchaseDetails?.purchaseQuantity && purchaseDetails?.purchaseCost) {
                    const pQty = purchaseDetails.purchaseQuantity;
                    const pUnit = purchaseDetails.purchaseUnit || unit;

                    // Convert purchase quantity to storage unit (which equals recipe unit for now)
                    initialQuantity = convertUnit(pQty, pUnit, unit);

                    // Cost per unit based on converted quantity
                    if (initialQuantity > 0) {
                        costPerUnit = purchaseDetails.purchaseCost / initialQuantity;
                    }
                } else {
                    // Fallback: If no purchase details, assume we have at least what the recipe needs
                    // (Fix for "0 stock" issue when user doesn't enter purchase info)
                    initialQuantity = quantity;
                }

                const { data: newItem, error: createError } = await supabase
                    .from('inventory_items')
                    .insert({
                        user_id: session.user.id,
                        name: normalizedName,
                        quantity: initialQuantity, // Initialize with purchased amount or recipe amount
                        unit: unit,
                        min_stock: 5,
                        category: 'General',
                        cost_per_unit: costPerUnit
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                inventoryItemId = newItem.id;

                // Log Movement for Financials if quantity > 0
                if (initialQuantity > 0) {
                    let moveTotalCost = 0;
                    if (purchaseDetails?.purchaseCost) {
                        moveTotalCost = purchaseDetails.purchaseCost;
                    } else {
                        moveTotalCost = costPerUnit * initialQuantity;
                    }

                    const { error: moveError } = await supabase.from('inventory_movements').insert({
                        user_id: session.user.id,
                        inventory_item_id: newItem.id,
                        movement_type: 'agregado',
                        quantity: initialQuantity,
                        unit_cost: costPerUnit,
                        total_cost: moveTotalCost,
                        notes: 'Compra Inicial (desde Receta)'
                    });
                    if (moveError) console.error('Error logging movement in createAndAddIngredient:', moveError);
                }
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
