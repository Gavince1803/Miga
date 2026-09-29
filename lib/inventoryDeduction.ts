import { supabase } from '@/lib/supabase';
import { convertValue } from '@/lib/units';

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

        // Deduct once per order: toggling pagado -> pendiente -> pagado must not deduct again
        const { count: previousDeductions, error: previousError } = await supabase
            .from('inventory_movements')
            .select('id', { count: 'exact', head: true })
            .eq('order_id', orderId)
            .eq('movement_type', 'deduccion');

        if (previousError) throw previousError;
        if (previousDeductions && previousDeductions > 0) {
            return { success: true, deductedItems: [], errors: [] };
        }

        // 2. Get all order items with their recipes
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('id, quantity, recipe_id, product_name')
            .eq('order_id', orderId);

        if (itemsError) throw itemsError;
        if (!orderItems || orderItems.length === 0) {
            return { success: true, deductedItems: [], errors: [] };
        }

        // 3. Load the ingredients of every recipe in the order in one query
        const recipeIds = [...new Set(orderItems.map(item => item.recipe_id).filter(Boolean))];
        if (recipeIds.length === 0) {
            return { success: true, deductedItems: [], errors: [] };
        }

        const { data: recipeIngredients, error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .select(`
                recipe_id,
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
            .in('recipe_id', recipeIds);

        if (ingredientsError) throw ingredientsError;

        // 4. Add up what each inventory item loses across all products, so two
        // products using the same ingredient don't overwrite each other
        const totals = new Map<string, { item: any; amount: number; products: string[] }>();
        for (const orderItem of orderItems) {
            if (!orderItem.recipe_id) continue; // Skip items without recipes
            for (const ingredient of recipeIngredients ?? []) {
                if (ingredient.recipe_id !== orderItem.recipe_id) continue;
                const inventoryItem = ingredient.inventory_items as any;
                if (!inventoryItem) continue;

                // Normalize: Convert needed amount (in ingredient.unit) -> (inventoryItem.unit)
                const amount = convertValue(ingredient.quantity * orderItem.quantity, ingredient.unit, inventoryItem.unit);
                if (amount === null) {
                    errors.push(`Unidades incompatibles para ${inventoryItem.name}: ${ingredient.unit} vs ${inventoryItem.unit}`);
                    continue;
                }

                const entry = totals.get(inventoryItem.id) ?? { item: inventoryItem, amount: 0, products: [] };
                entry.amount += amount;
                entry.products.push(orderItem.product_name);
                totals.set(inventoryItem.id, entry);
            }
        }

        // 5. Update every item in parallel (don't go below 0)
        const now = new Date().toISOString();
        const entries = [...totals.values()];
        const results = await Promise.all(entries.map(({ item, amount }) =>
            supabase
                .from('inventory_items')
                .update({ quantity: Math.max(0, item.quantity - amount), last_updated: now })
                .eq('id', item.id)
        ));

        const movements: Record<string, unknown>[] = [];
        entries.forEach(({ item, amount, products }, i) => {
            if (results[i].error) {
                errors.push(`Error descontando ${item.name}`);
                return;
            }
            movements.push({
                user_id: session.user.id,
                inventory_item_id: item.id,
                order_id: orderId,
                movement_type: 'deduccion',
                quantity: -amount,
                notes: `Pedido completado - ${[...new Set(products)].join(', ')}`
            });
            deductedItems.push({ name: item.name, quantity: amount, unit: item.unit });
        });

        // 6. Log all movements in one insert
        if (movements.length > 0) {
            await supabase.from('inventory_movements').insert(movements);
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
 * Format the deduction summary message
 */
export function formatDeductionMessage(
    deductedItems: { name: string; quantity: number; unit: string }[],
    errors: string[]
): { title: string; message: string; type: 'success' | 'warning' } | null {
    if (deductedItems.length === 0 && errors.length === 0) {
        return null; // Nothing to show
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

    return {
        title: deductedItems.length > 0 ? '✓ Inventario Actualizado' : '⚠️ Advertencias',
        message: message.trim(),
        type: errors.length > 0 ? 'warning' : 'success'
    };
}
