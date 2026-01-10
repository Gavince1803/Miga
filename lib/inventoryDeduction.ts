import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

/**
 * Deduct inventory items based on recipes linked to an order's products.
 * Called when order status changes to 'completado'.
 */
export async function deductInventoryForOrder(orderId: string): Promise<{
    success: boolean;
    deductedItems: { name: string; quantity: number; unit: string }[];
    errors: string[];
}> {
    const deductedItems: { name: string; quantity: number; unit: string }[] = [];
    const errors: string[] = [];

    try {
        // 1. Get session for user_id
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        // 2. Get all order items with their recipes
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('id, quantity, recipe_id, product_name')
            .eq('order_id', orderId);

        if (itemsError) throw itemsError;
        if (!orderItems || orderItems.length === 0) {
            return { success: true, deductedItems: [], errors: [] };
        }

        // 3. For each order item with a recipe, get recipe ingredients
        for (const item of orderItems) {
            if (!item.recipe_id) continue; // Skip items without recipes

            const { data: recipeIngredients, error: ingredientsError } = await supabase
                .from('recipe_ingredients')
                .select(`
                    quantity,
                    unit,
                    inventory_item_id,
                    inventory_items (
                        id,
                        name,
                        quantity,
                        unit
                    )
                `)
                .eq('recipe_id', item.recipe_id);

            if (ingredientsError) {
                errors.push(`Error cargando ingredientes para ${item.product_name}`);
                continue;
            }

            if (!recipeIngredients) continue;

            // 4. Deduct each ingredient * order item quantity
            for (const ingredient of recipeIngredients) {
                const totalToDeduct = ingredient.quantity * item.quantity;
                const inventoryItem = ingredient.inventory_items as any;

                if (!inventoryItem) continue;

                // Calculate new quantity (don't go below 0)
                const newQuantity = Math.max(0, inventoryItem.quantity - totalToDeduct);

                // Update inventory
                const { error: updateError } = await supabase
                    .from('inventory_items')
                    .update({
                        quantity: newQuantity,
                        last_updated: new Date().toISOString()
                    })
                    .eq('id', inventoryItem.id);

                if (updateError) {
                    errors.push(`Error descontando ${inventoryItem.name}`);
                    continue;
                }

                // Log the movement
                await supabase
                    .from('inventory_movements')
                    .insert({
                        user_id: session.user.id,
                        inventory_item_id: inventoryItem.id,
                        order_id: orderId,
                        movement_type: 'deduccion',
                        quantity: -totalToDeduct,
                        notes: `Pedido completado - ${item.product_name}`
                    });

                deductedItems.push({
                    name: inventoryItem.name,
                    quantity: totalToDeduct,
                    unit: ingredient.unit
                });
            }
        }

        return { success: errors.length === 0, deductedItems, errors };
    } catch (error) {
        console.error('Error deducting inventory:', error);
        return {
            success: false,
            deductedItems,
            errors: ['Error general al descontar inventario']
        };
    }
}

/**
 * Show a summary of what was deducted
 */
export function showDeductionSummary(
    deductedItems: { name: string; quantity: number; unit: string }[],
    errors: string[]
) {
    if (deductedItems.length === 0 && errors.length === 0) {
        return; // Nothing to show
    }

    let message = '';

    if (deductedItems.length > 0) {
        message += 'Ingredientes descontados:\n';
        deductedItems.forEach(item => {
            message += `• ${item.quantity} ${item.unit} de ${item.name}\n`;
        });
    }

    if (errors.length > 0) {
        message += '\n⚠️ Advertencias:\n';
        errors.forEach(err => {
            message += `• ${err}\n`;
        });
    }

    Alert.alert(
        deductedItems.length > 0 ? '✓ Inventario Actualizado' : '⚠️ Advertencias',
        message.trim()
    );
}
