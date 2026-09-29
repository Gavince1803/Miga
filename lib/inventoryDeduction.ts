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
    /** Products in the order with no recipe (or a recipe with no ingredients) */
    skippedProducts: string[];
}> {
    const deductedItems: { name: string; quantity: number; unit: string }[] = [];
    const errors: string[] = [];
    const skippedProducts: string[] = [];

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
            return { success: true, deductedItems: [], errors: [], skippedProducts: [] };
        }

        // 2. Get all order items with their recipes
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('id, quantity, recipe_id, product_name')
            .eq('order_id', orderId);

        if (itemsError) throw itemsError;
        if (!orderItems || orderItems.length === 0) {
            return { success: true, deductedItems: [], errors: [], skippedProducts: [] };
        }

        // 3. Load the ingredients of every recipe in the order in one query
        const recipeIds = [...new Set(orderItems.map(item => item.recipe_id).filter(Boolean))];
        if (recipeIds.length === 0) {
            return { success: true, deductedItems: [], errors: [], skippedProducts: orderItems.map(item => item.product_name) };
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
            const ingredients = (recipeIngredients ?? []).filter(i => i.recipe_id === orderItem.recipe_id);
            if (!orderItem.recipe_id || ingredients.length === 0) {
                skippedProducts.push(orderItem.product_name);
                continue;
            }
            for (const ingredient of ingredients) {
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
        // What is actually taken can be less than needed when stock runs out;
        // that's what gets recorded, so "Deshacer" restores exactly that
        const outOfStock: string[] = [];
        entries.forEach(entry => { entry.amount = Math.min(entry.amount, Math.max(0, entry.item.quantity)); });
        for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].amount <= 0) {
                outOfStock.push(entries[i].item.name);
                entries.splice(i, 1);
            }
        }
        if (outOfStock.length > 0) errors.push(`Sin stock: ${outOfStock.reverse().join(', ').toLowerCase()}`);
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

        return { success: errors.length === 0, deductedItems, errors, skippedProducts };
    } catch (error) {
        console.error('Error deducting inventory:', error);
        return {
            success: false,
            deductedItems,
            errors: ['Error general al descontar inventario'],
            skippedProducts,
        };
    }
}

/**
 * Puts back what an order's deduction took and deletes those movements, so the
 * order can be deducted again later.
 */
export async function undoDeductionForOrder(orderId: string): Promise<boolean> {
    try {
        const { data: movements, error } = await supabase
            .from('inventory_movements')
            .select('id, inventory_item_id, quantity, inventory_items ( quantity )')
            .eq('order_id', orderId)
            .eq('movement_type', 'deduccion');
        if (error) throw error;
        if (!movements || movements.length === 0) return true;

        const now = new Date().toISOString();
        const results = await Promise.all(movements.map((m: any) =>
            supabase
                .from('inventory_items')
                .update({ quantity: (m.inventory_items?.quantity ?? 0) + Math.abs(m.quantity), last_updated: now })
                .eq('id', m.inventory_item_id)
        ));
        if (results.some(r => r.error)) throw new Error('Error restoring stock');

        const { error: deleteError } = await supabase
            .from('inventory_movements')
            .delete()
            .in('id', movements.map((m: any) => m.id));
        if (deleteError) throw deleteError;
        return true;
    } catch (error) {
        console.error('Error undoing deduction:', error);
        return false;
    }
}

function formatQuantity(quantity: number, unit: string): string {
    if ((unit === 'g' || unit === 'ml') && quantity >= 1000) {
        return `${Math.round(quantity / 10) / 100} ${unit === 'g' ? 'kg' : 'L'}`;
    }
    return `${Math.round(quantity * 100) / 100} ${unit}`;
}

/**
 * Short text for the toast shown after a paid order deducts stock.
 * Returns null when there's nothing worth telling (no products in the order).
 */
export function describeDeduction(result: {
    deductedItems: { name: string; quantity: number; unit: string }[];
    errors: string[];
    skippedProducts: string[];
}): { message: string; canUndo: boolean; needsRecipe: boolean } | null {
    const { deductedItems, errors, skippedProducts } = result;
    const parts: string[] = [];

    if (deductedItems.length > 0) {
        const list = deductedItems.map(i => `${i.name.toLowerCase()} ${formatQuantity(i.quantity, i.unit)}`);
        parts.push(`Se descontó: ${list.join(', ')}`);
    }
    if (skippedProducts.length > 0) {
        const names = [...new Set(skippedProducts)].join(', ');
        parts.push(deductedItems.length > 0
            ? `${names} no tiene receta vinculada`
            : `No se descontó inventario: ${names} no tiene receta vinculada`);
    }
    if (errors.length > 0) parts.push(errors.join('. '));

    if (parts.length === 0) return null;
    return {
        message: parts.join('. '),
        canUndo: deductedItems.length > 0,
        needsRecipe: deductedItems.length === 0 && skippedProducts.length > 0,
    };
}
