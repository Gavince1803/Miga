import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Alert } from 'react-native';

export type OrderItem = {
    id: string;
    orderId: string;
    recipeId: string | null;
    productName: string;
    quantity: number;
    notes: string | null;
    // Joined recipe data
    recipe?: {
        id: string;
        title: string;
        imageUrl: string | null;
    };
};

export type NewOrderItem = {
    recipeId?: string;
    productName: string;
    quantity: number;
    notes?: string;
};

export function useOrderItems() {
    const [loading, setLoading] = useState(false);

    /**
     * Get all items for an order with recipe details
     */
    const getItemsForOrder = async (orderId: string): Promise<OrderItem[]> => {
        try {
            const { data, error } = await supabase
                .from('order_items')
                .select(`
                    id,
                    order_id,
                    recipe_id,
                    product_name,
                    quantity,
                    notes,
                    recipes (
                        id,
                        title,
                        image_url
                    )
                `)
                .eq('order_id', orderId);

            if (error) throw error;

            return (data || []).map(item => ({
                id: item.id,
                orderId: item.order_id,
                recipeId: item.recipe_id,
                productName: item.product_name,
                quantity: item.quantity,
                notes: item.notes,
                recipe: item.recipes ? {
                    id: (item.recipes as any).id,
                    title: (item.recipes as any).title,
                    imageUrl: (item.recipes as any).image_url,
                } : undefined
            }));
        } catch (error) {
            console.error('Error fetching order items:', error);
            return [];
        }
    };

    /**
     * Add items to an order (bulk)
     */
    const setItemsForOrder = async (orderId: string, items: NewOrderItem[]): Promise<boolean> => {
        try {
            setLoading(true);

            // Delete existing items
            await supabase
                .from('order_items')
                .delete()
                .eq('order_id', orderId);

            // Insert new items
            if (items.length > 0) {
                const { error } = await supabase
                    .from('order_items')
                    .insert(
                        items.map(item => ({
                            order_id: orderId,
                            recipe_id: item.recipeId || null,
                            product_name: item.productName,
                            quantity: item.quantity,
                            notes: item.notes || null
                        }))
                    );

                if (error) throw error;
            }

            return true;
        } catch (error) {
            console.error('Error setting order items:', error);
            Alert.alert('Error', 'No se pudieron guardar los productos');
            return false;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Add a single item to order
     */
    const addItem = async (orderId: string, item: NewOrderItem): Promise<OrderItem | null> => {
        try {
            const { data, error } = await supabase
                .from('order_items')
                .insert({
                    order_id: orderId,
                    recipe_id: item.recipeId || null,
                    product_name: item.productName,
                    quantity: item.quantity,
                    notes: item.notes || null
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                orderId: data.order_id,
                recipeId: data.recipe_id,
                productName: data.product_name,
                quantity: data.quantity,
                notes: data.notes
            };
        } catch (error) {
            console.error('Error adding order item:', error);
            return null;
        }
    };

    /**
     * Remove item from order
     */
    const removeItem = async (itemId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('order_items')
                .delete()
                .eq('id', itemId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error removing order item:', error);
            return false;
        }
    };

    return {
        loading,
        getItemsForOrder,
        setItemsForOrder,
        addItem,
        removeItem
    };
}
