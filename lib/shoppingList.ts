import { supabase } from '@/lib/supabase';
import { convertValue } from '@/lib/units';
import { InventoryItem, Order } from '@/types';

export type ShoppingItem = {
    inventoryItemId: string;
    name: string;
    unit: string;
    /** How much to buy, in the item's unit */
    toBuy: number;
    reason: 'minimo' | 'pedidos';
    /** Clients whose upcoming orders need it */
    forOrders: string[];
};

const DAYS_AHEAD = 7;

/**
 * What to buy: items below their minimum, plus what the recipes of pending
 * orders due in the next week need beyond current stock. Paid orders are left
 * out because their stock was already deducted.
 */
export async function buildShoppingList(inventory: InventoryItem[], orders: Order[]): Promise<ShoppingItem[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + DAYS_AHEAD);
    const toKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const upcoming = orders.filter(o =>
        o.status === 'pendiente' &&
        o.deliveryDate >= toKey(today) &&
        o.deliveryDate <= toKey(limit)
    );

    // Needed per inventory item for upcoming orders (in the item's unit)
    const needed = new Map<string, { amount: number; clients: Set<string> }>();

    if (upcoming.length > 0) {
        const { data: orderItems, error } = await supabase
            .from('order_items')
            .select('order_id, quantity, recipe_id')
            .in('order_id', upcoming.map(o => o.id))
            .not('recipe_id', 'is', null);
        if (error) throw error;

        const recipeIds = [...new Set((orderItems ?? []).map(i => i.recipe_id))];
        if (recipeIds.length > 0) {
            const { data: ingredients, error: ingError } = await supabase
                .from('recipe_ingredients')
                .select('recipe_id, quantity, unit, inventory_item_id')
                .in('recipe_id', recipeIds);
            if (ingError) throw ingError;

            const byId = new Map(inventory.map(i => [i.id, i]));
            const clientOf = new Map(upcoming.map(o => [o.id, o.clientName]));

            for (const orderItem of orderItems ?? []) {
                for (const ing of ingredients ?? []) {
                    if (ing.recipe_id !== orderItem.recipe_id) continue;
                    const item = byId.get(ing.inventory_item_id);
                    if (!item) continue;
                    const amount = convertValue(ing.quantity * orderItem.quantity, ing.unit, item.unit);
                    if (amount === null) continue;
                    const entry = needed.get(item.id) ?? { amount: 0, clients: new Set<string>() };
                    entry.amount += amount;
                    entry.clients.add(clientOf.get(orderItem.order_id) ?? '');
                    needed.set(item.id, entry);
                }
            }
        }
    }

    const list: ShoppingItem[] = [];
    for (const item of inventory) {
        const stock = Math.max(0, item.quantity);
        const forOrders = needed.get(item.id);
        const shortForOrders = forOrders ? forOrders.amount - stock : 0;
        // After covering the orders, stay at or above the minimum
        const shortForMin = item.minStock > 0 ? item.minStock - (stock - (forOrders?.amount ?? 0)) : 0;
        const toBuy = Math.max(shortForOrders, shortForMin);
        if (toBuy <= 0) continue;

        list.push({
            inventoryItemId: item.id,
            name: item.name,
            unit: item.unit,
            toBuy,
            reason: shortForOrders > 0 ? 'pedidos' : 'minimo',
            forOrders: forOrders ? [...forOrders.clients].filter(Boolean) : [],
        });
    }

    // Order needs first (they have a deadline), then by name
    return list.sort((a, b) =>
        a.reason !== b.reason ? (a.reason === 'pedidos' ? -1 : 1) : a.name.localeCompare(b.name)
    );
}

export function formatAmount(quantity: number, unit: string): string {
    if ((unit === 'g' || unit === 'ml') && quantity >= 1000) {
        return `${Math.round(quantity / 10) / 100} ${unit === 'g' ? 'kg' : 'L'}`;
    }
    return `${Math.round(quantity * 100) / 100} ${unit}`;
}

export function shoppingListText(items: ShoppingItem[]): string {
    const lines = items.map(i => `• ${i.name}: ${formatAmount(i.toBuy, i.unit)}`);
    return `🛒 Lista de compras\n\n${lines.join('\n')}\n\nHecha con Miga`;
}
