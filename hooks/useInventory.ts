import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/types';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useInventory() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchInventory = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setInventory([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            if (data) {
                const mappedItems: InventoryItem[] = data.map(item => ({
                    id: item.id,
                    userId: item.user_id,
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    minStock: item.min_stock,
                    category: item.category,
                    lastUpdated: item.last_updated,
                }));
                setInventory(mappedItems);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            Alert.alert('Error', 'No se pudo cargar el inventario');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const updateStock = async (id: string, delta: number) => {
        try {
            // Optimistic update
            setInventory(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, quantity: Math.max(0, item.quantity + delta) };
                }
                return item;
            }));

            // Fetch current quantity to ensure atomicity (or use RPC)
            // For simplicity, we just calculate new value based on current known state
            // Ideally, we should use a Postgres function for atomic updates
            const item = inventory.find(i => i.id === id);
            if (!item) return;

            const newQuantity = Math.max(0, item.quantity + delta);

            const { error } = await supabase
                .from('inventory_items')
                .update({ quantity: newQuantity, last_updated: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                // Revert if error
                fetchInventory();
                throw error;
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            Alert.alert('Error', 'No se pudo actualizar el stock');
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchInventory();
    };

    return {
        inventory,
        loading,
        refreshing,
        onRefresh,
        updateStock,
    };
}
