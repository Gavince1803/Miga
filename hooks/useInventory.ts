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

    const setStock = async (id: string, newQuantity: number) => {
        try {
            // Optimistic update
            setInventory(prev => prev.map(item => {
                if (item.id === id) {
                    return { ...item, quantity: Math.max(0, newQuantity) };
                }
                return item;
            }));

            const { error } = await supabase
                .from('inventory_items')
                .update({ quantity: Math.max(0, newQuantity), last_updated: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                fetchInventory();
                throw error;
            }
            return true;
        } catch (error) {
            console.error('Error setting stock:', error);
            Alert.alert('Error', 'No se pudo actualizar el stock');
            return false;
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchInventory();
    };

    const addItem = async (item: Omit<InventoryItem, 'id' | 'userId' | 'lastUpdated'>) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            const { error } = await supabase
                .from('inventory_items')
                .insert({
                    user_id: session.user.id,
                    name: item.name.trim(),
                    quantity: item.quantity,
                    unit: item.unit || 'u',
                    min_stock: item.minStock || 5,
                    category: item.category || 'General',
                });

            if (error) throw error;

            await fetchInventory();
            return true;
        } catch (error) {
            console.error('Error adding item:', error);
            Alert.alert('Error', 'No se pudo agregar el ingrediente');
            return false;
        }
    };

    const importInventory = async (items: Partial<InventoryItem>[]) => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            // 1. Get current inventory to check for duplicates by name
            const { data: currentItems, error: fetchError } = await supabase
                .from('inventory_items')
                .select('*');

            if (fetchError) throw fetchError;

            // Map current items by name (lower case for loose matching)
            const currentMap = new Map();
            currentItems?.forEach(i => currentMap.set(i.name.toLowerCase(), i));

            const toInsert: any[] = [];
            const toUpdate: Promise<any>[] = [];

            for (const item of items) {
                if (!item.name) continue;

                const normalizedName = item.name.trim();
                const key = normalizedName.toLowerCase();
                const existing = currentMap.get(key);

                if (existing) {
                    // Update existing
                    // We only update if there are changes to avoid unnecessary writes, 
                    // but for "Import" usually we want to overwrite stock or at least set it.
                    // Let's assume Excel is the source of truth for Quantity if provided.
                    const updates: any = {};
                    if (item.quantity !== undefined) updates.quantity = item.quantity;
                    if (item.unit) updates.unit = item.unit;
                    if (item.minStock !== undefined) updates.min_stock = item.minStock;
                    if (item.category) updates.category = item.category;

                    if (Object.keys(updates).length > 0) {
                        updates.last_updated = new Date().toISOString();
                        toUpdate.push(
                            supabase.from('inventory_items')
                                .update(updates)
                                .eq('id', existing.id)
                        );
                    }
                } else {
                    // Insert new
                    toInsert.push({
                        user_id: session.user.id,
                        name: normalizedName,
                        quantity: item.quantity || 0,
                        unit: item.unit || 'u',
                        min_stock: item.minStock || 5, // Default
                        category: item.category || 'General',
                    });
                }
            }

            // Execute Inserts
            if (toInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('inventory_items')
                    .insert(toInsert);
                if (insertError) throw insertError;
            }

            // Execute Updates
            if (toUpdate.length > 0) {
                await Promise.all(toUpdate);
            }

            await fetchInventory();
            return {
                added: toInsert.length,
                updated: toUpdate.length
            };

        } catch (error) {
            console.error('Error importing inventory:', error);
            Alert.alert('Error', 'Falló la importación');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        inventory,
        loading,
        refreshing,
        onRefresh,
        updateStock,
        setStock,
        addItem,
        importInventory
    };
}
