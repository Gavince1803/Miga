import { useAlert } from '@/context/AlertContext';
import { deductInventoryForOrder, formatDeductionMessage } from '@/lib/inventoryDeduction';
import { cancelOrderNotification, scheduleOrderNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { Order, OrderFormData } from '@/types';
import { useCallback, useEffect, useState } from 'react';

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { showAlert } = useAlert();

    const fetchOrders = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setOrders([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('delivery_date', { ascending: true });

            if (error) {
                throw error;
            }

            if (data) {
                const mappedOrders: Order[] = data.map(item => ({
                    id: item.id,
                    userId: item.user_id,
                    orderNumber: item.order_number,
                    clientName: item.client_name,
                    clientPhone: item.client_phone,
                    address: item.address,
                    orderDate: item.created_at, // Using created_at as order date for now if order_date null
                    deliveryDate: item.delivery_date,
                    deliveryTime: item.delivery_time,
                    size: item.size,
                    servings: item.servings,
                    filling: item.filling,
                    cover: item.cover,
                    occasion: item.occasion,
                    cakeType: item.cake_type,
                    description: item.description,
                    totalPrice: item.total_price,
                    depositAmount: item.deposit_amount || 0,
                    paymentMethod: item.payment_method,
                    paymentStatus: item.payment_status || 'pendiente',
                    status: item.status,
                    reminderDays: item.reminder_days || 0,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                }));
                setOrders(mappedOrders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            showAlert({ title: 'Error', message: 'No se pudieron cargar los pedidos', type: 'error' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Helper to save new options to dictionary
    const saveToDictionary = async (category: string, value: string) => {
        if (!value) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Upsert (ignore duplicate errors)
            await supabase
                .from('options_dictionary')
                .upsert(
                    { user_id: session.user.id, category, value },
                    { onConflict: 'user_id, category, value' }
                );
        } catch (error) {
            // Silently fail, not critical
            console.log('Error saving dictionary option:', error);
        }
    };

    const createOrder = async (orderData: OrderFormData) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showAlert({ title: 'Error', message: 'Debes iniciar sesión para guardar pedidos', type: 'error' });
                return null;
            }

            // Save new options to dictionary in background
            if (orderData.filling) saveToDictionary('filling', orderData.filling);
            if (orderData.cover) saveToDictionary('cover', orderData.cover);
            if (orderData.occasion) saveToDictionary('occasion', orderData.occasion);
            if (orderData.cakeType) saveToDictionary('cake_type', orderData.cakeType);
            // Save custom size
            if (orderData.size) saveToDictionary('size', orderData.size);

            if (orderData.size) saveToDictionary('size', orderData.size);

            console.log('Sending Order to DB:', {
                cakeType: orderData.cakeType,
                clientId: session.user.id
            });

            const { data, error } = await supabase
                .from('orders')
                .insert([
                    {
                        user_id: session.user.id,
                        client_name: orderData.clientName,
                        client_phone: orderData.clientPhone,
                        address: orderData.address,
                        delivery_date: (() => {
                            const d = orderData.deliveryDate;
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                        })(),
                        delivery_time: orderData.deliveryTime,
                        size: orderData.size,
                        servings: orderData.servings,
                        filling: orderData.filling,
                        cover: orderData.cover,
                        occasion: orderData.occasion,
                        cake_type: orderData.cakeType,
                        description: orderData.description,

                        total_price: orderData.totalPrice,
                        deposit_amount: orderData.depositAmount,
                        payment_method: orderData.paymentMethod,
                        payment_status: orderData.paymentStatus,

                        status: 'pendiente',
                        reminder_days: orderData.reminderDays,
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            // Map snake_case data to camelCase for scheduleOrderNotification
            if (data) {
                await scheduleOrderNotification({
                    id: data.id,
                    clientName: data.client_name,
                    description: data.description,
                    size: data.size,
                    deliveryDate: data.delivery_date,
                    deliveryTime: data.delivery_time,
                    reminderDays: data.reminder_days
                });
            }

            await fetchOrders(); // Refresh list
            return data;
        } catch (error) {
            console.error('Error creating order:', error);
            showAlert({ title: 'Error', message: 'No se pudo guardar el pedido', type: 'error' });
            return null;
        }
    };

    const updateOrderStatus = async (id: string, status: string) => {
        try {
            // If marking as 'pagado', also update the deposit to equal total (payment complete)
            if (status === 'pagado') {
                // First get the order to know the total
                const { data: orderData } = await supabase
                    .from('orders')
                    .select('total_price')
                    .eq('id', id)
                    .single();

                const updates: any = {
                    status,
                    payment_status: 'pagado'
                };

                // Set deposit to total (fully paid)
                if (orderData?.total_price) {
                    updates.deposit_amount = orderData.total_price;
                }

                const { error } = await supabase
                    .from('orders')
                    .update(updates)
                    .eq('id', id);

                if (error) throw error;

                // Auto-deduct inventory including in updateOrder
                const { deductedItems, errors } = await deductInventoryForOrder(id);
                const notification = formatDeductionMessage(deductedItems, errors);
                if (notification) {
                    showAlert(notification);
                }
            } else {
                const { error } = await supabase
                    .from('orders')
                    .update({ status })
                    .eq('id', id);

                if (error) throw error;
            }

            await fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
            showAlert({ title: 'Error', message: 'No se pudo actualizar el estado', type: 'error' });
        }
    };

    const updateOrder = async (id: string, orderData: Partial<OrderFormData>) => {
        try {
            const updates: any = {};
            if (orderData.clientName) updates.client_name = orderData.clientName;
            if (orderData.clientPhone) updates.client_phone = orderData.clientPhone;
            if (orderData.address) updates.address = orderData.address;
            if (orderData.deliveryDate) {
                const d = orderData.deliveryDate;
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                updates.delivery_date = `${year}-${month}-${day}`;
            }
            if (orderData.deliveryTime) updates.delivery_time = orderData.deliveryTime;
            if (orderData.size) updates.size = orderData.size;
            if (orderData.servings) updates.servings = orderData.servings;
            if (orderData.filling) updates.filling = orderData.filling;
            if (orderData.cover) updates.cover = orderData.cover;
            if (orderData.occasion) updates.occasion = orderData.occasion;
            if (orderData.cakeType) updates.cake_type = orderData.cakeType;
            if (orderData.description) updates.description = orderData.description;

            if (orderData.totalPrice !== undefined) updates.total_price = orderData.totalPrice;
            if (orderData.depositAmount !== undefined) updates.deposit_amount = orderData.depositAmount;
            if (orderData.paymentMethod) updates.payment_method = orderData.paymentMethod;

            if (orderData.paymentStatus) updates.payment_status = orderData.paymentStatus;

            // Check changes to reminderDays
            if (orderData.reminderDays !== undefined) updates.reminder_days = orderData.reminderDays;

            const { data, error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            if (updates.payment_status === 'pagado' || updates.status === 'pagado') {
                const { deductedItems, errors } = await deductInventoryForOrder(id);
                const notification = formatDeductionMessage(deductedItems, errors);
                if (notification) {
                    showAlert(notification);
                }
            }

            // Update Notification Schedule
            if (data) {
                // Correctly map for notification function
                await scheduleOrderNotification({
                    id: data.id,
                    clientName: data.client_name,
                    description: data.description,
                    size: data.size,
                    deliveryDate: data.delivery_date,
                    deliveryTime: data.delivery_time,
                    reminderDays: data.reminder_days
                });
            }

            await fetchOrders();
            return data;
        } catch (error) {
            console.error('Error updating order:', error);
            showAlert({ title: 'Error', message: 'No se pudo actualizar el pedido', type: 'error' });
            return null;
        }
    };

    const deleteOrder = async (id: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Cancel notification
            await cancelOrderNotification(id);

            setOrders(prev => prev.filter(o => o.id !== id));
        } catch (error) {
            console.error('Error deleting order:', error);
            showAlert({ title: 'Error', message: 'No se pudo eliminar el pedido', type: 'error' });
        }
    };

    // Helper to fetch options from dictionary
    const getDictionaryOptions = async (category: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return [];

            const { data, error } = await supabase
                .from('options_dictionary')
                .select('value')
                .eq('user_id', session.user.id)
                .eq('category', category);

            if (error) throw error;
            return data.map(item => item.value);
        } catch (error) {
            console.error(`Error fetching ${category} options:`, error);
            return [];
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchOrders();
    }, []);

    /**
     * Fetch all orders from a specific client (case-insensitive match)
     */
    const getOrdersByClient = async (clientName: string): Promise<Order[]> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return [];

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', session.user.id)
                .ilike('client_name', clientName)
                .order('delivery_date', { ascending: false });

            if (error) throw error;

            return (data || []).map(item => ({
                id: item.id,
                userId: item.user_id,
                orderNumber: item.order_number,
                clientName: item.client_name,
                clientPhone: item.client_phone,
                address: item.address,
                orderDate: item.created_at,
                deliveryDate: item.delivery_date,
                deliveryTime: item.delivery_time,
                size: item.size,
                servings: item.servings,
                filling: item.filling,
                cover: item.cover,
                occasion: item.occasion,
                description: item.description,
                totalPrice: item.total_price,
                depositAmount: item.deposit_amount || 0,
                paymentMethod: item.payment_method,
                paymentStatus: item.payment_status || 'pendiente',
                status: item.status,
                reminderDays: item.reminder_days || 0,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
            }));
        } catch (error) {
            console.error('Error fetching client orders:', error);
            return [];
        }
    };

    return {
        orders,
        loading,
        refreshing,
        onRefresh,
        createOrder,
        updateOrderStatus,
        updateOrder,
        deleteOrder,
        getDictionaryOptions,
        getOrdersByClient,
    };
}
