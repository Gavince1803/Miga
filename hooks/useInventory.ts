import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/types';
import { useCallback, useEffect, useState } from 'react';

export function useInventory() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { showAlert } = useAlert();

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
                    costPerUnit: item.cost_per_unit, // Financials
                    category: item.category,
                    createdAt: item.created_at,
                }));
                setInventory(mappedItems);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            showAlert({ title: 'Error', message: 'No se pudo cargar el inventario', type: 'error' });
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

            // Log Movement for Financials
            if (delta !== 0) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { error: moveError } = await supabase.from('inventory_movements').insert({
                        user_id: session.user.id,
                        inventory_item_id: id,
                        movement_type: delta > 0 ? 'agregado' : 'uso',
                        quantity: Math.abs(delta),
                        notes: delta > 0 ? 'Restock Rápido' : 'Uso Rápido'
                    });
                    if (moveError) console.error('Error logging movement (updateStock):', moveError);
                }
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            showAlert({ title: 'Error', message: 'No se pudo actualizar el stock', type: 'error' });
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

            // Log Movement
            const item = inventory.find(i => i.id === id);
            if (item) {
                const delta = newQuantity - item.quantity;
                if (delta !== 0) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        const { error: moveError } = await supabase.from('inventory_movements').insert({
                            user_id: session.user.id,
                            inventory_item_id: id,
                            movement_type: delta > 0 ? 'agregado' : 'uso',
                            quantity: Math.abs(delta),
                            notes: 'Ajuste Manual'
                        });
                        if (moveError) console.error('Error logging movement (setStock):', moveError);
                    }
                }
            }
            return true;
        } catch (error) {
            console.error('Error setting stock:', error);
            showAlert({ title: 'Error', message: 'No se pudo actualizar el stock', type: 'error' });
            return false;
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchInventory();
    }, []);

    const addItem = async (item: Omit<InventoryItem, 'id' | 'userId' | 'createdAt'>) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            const { data: newItem, error } = await supabase
                .from('inventory_items')
                .insert({
                    user_id: session.user.id,
                    name: item.name.trim(),
                    quantity: item.quantity,
                    unit: item.unit || 'u',
                    min_stock: item.minStock || 5,
                    cost_per_unit: item.costPerUnit || 0,
                    category: item.category || 'General',
                })
                .select()
                .single();

            if (error) throw error;

            // Record initial movement for Expenses tracking
            if (newItem && newItem.quantity > 0) {
                const { error: moveError } = await supabase.from('inventory_movements').insert({
                    user_id: session.user.id,
                    inventory_item_id: newItem.id,
                    movement_type: 'agregado',
                    quantity: newItem.quantity,
                    notes: 'Stock Inicial',
                });
                if (moveError) console.error('Error logging movement (addItem):', moveError);
            }

            await fetchInventory();
            return true;
        } catch (error) {
            console.error('Error adding item:', error);
            showAlert({ title: 'Error', message: 'No se pudo agregar el ingrediente', type: 'error' });
            return false;
        }
    };

    const updateItemDetails = async (id: string, updates: Partial<Omit<InventoryItem, 'id' | 'userId' | 'createdAt'>>) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
            if (updates.unit) dbUpdates.unit = updates.unit;
            if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
            if (updates.costPerUnit !== undefined) dbUpdates.cost_per_unit = updates.costPerUnit;
            if (updates.category) dbUpdates.category = updates.category;

            if (Object.keys(dbUpdates).length === 0) return true;

            dbUpdates.last_updated = new Date().toISOString();

            const { error } = await supabase
                .from('inventory_items')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;

            setInventory(prev => prev.map(item => {
                if (item.id === id) {
                    // Force update local state
                    // If updating quantity here, we are not logging movement. 
                    // This function should be preferred for NON-quantity updates or corrections.
                    return { ...item, ...updates };
                }
                return item;
            }));

            return true;
        } catch (error) {
            console.error('Error updating item:', error);
            showAlert({ title: 'Error', message: 'No se pudo actualizar el ingrediente', type: 'error' });
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
                    if (item.costPerUnit !== undefined) updates.cost_per_unit = item.costPerUnit;

                    if (Object.keys(updates).length > 0) {
                        updates.last_updated = new Date().toISOString();
                        toUpdate.push(
                            supabase.from('inventory_items')
                                .update(updates)
                                .eq('id', existing.id) as unknown as Promise<any>
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
                        cost_per_unit: item.costPerUnit || 0,
                    });
                }
            }

            // Execute Inserts with Movement Logging
            if (toInsert.length > 0) {
                const { data: insertedData, error: insertError } = await supabase
                    .from('inventory_items')
                    .insert(toInsert)
                    .select(); // Fetch IDs to log movements

                if (insertError) throw insertError;

                // Log movements for "importacion"
                if (session && insertedData) {
                    const movements = insertedData.map(item => ({
                        user_id: session.user.id,
                        inventory_item_id: item.id,
                        movement_type: 'importacion',
                        quantity: item.quantity,
                        notes: 'Importación Excel'
                    }));

                    if (movements.length > 0) {
                        const { error: moveError } = await supabase.from('inventory_movements').insert(movements);
                        if (moveError) console.warn('Error logging import movements:', moveError);
                    }
                }
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
            showAlert({ title: 'Error', message: 'Falló la importación', type: 'error' });
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Export inventory to array for Excel generation
    const exportInventory = (): { Nombre: string; Cantidad: number; Unidad: string; Costo: number; Minimo: number; Categoria: string }[] => {
        return inventory.map(item => ({
            Nombre: item.name,
            Cantidad: item.quantity,
            Unidad: item.unit,
            Costo: item.costPerUnit || 0,
            Minimo: item.minStock || 0,
            Categoria: item.category || 'General'
        }));
    };

    return {
        inventory,
        loading,
        refreshing,
        onRefresh,
        fetchInventory,
        updateStock,
        setStock,
        addItem,
        importInventory,
        updateItemDetails,
        exportInventory
    };
}
