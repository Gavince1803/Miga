import { supabase } from '@/lib/supabase';
import { Order, OrderFormData } from '@/types';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
                    description: item.description,
                    totalPrice: item.total_price,
                    paymentMethod: item.payment_method,
                    status: item.status,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                }));
                setOrders(mappedOrders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            Alert.alert('Error', 'No se pudieron cargar los pedidos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const createOrder = async (orderData: OrderFormData) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('Error', 'Debes iniciar sesión para guardar pedidos');
                return null;
            }

            const { data, error } = await supabase
                .from('orders')
                .insert([
                    {
                        user_id: session.user.id,
                        client_name: orderData.clientName,
                        client_phone: orderData.clientPhone,
                        address: orderData.address,
                        delivery_date: orderData.deliveryDate.toISOString().split('T')[0], // YYYY-MM-DD
                        delivery_time: orderData.deliveryTime,
                        size: orderData.size,
                        servings: orderData.servings,
                        filling: orderData.filling,
                        cover: orderData.cover,
                        occasion: orderData.occasion,
                        description: orderData.description,
                        total_price: orderData.totalPrice,
                        payment_method: orderData.paymentMethod,
                        status: 'pendiente',
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            await fetchOrders(); // Refresh list
            return data;
        } catch (error) {
            console.error('Error creating order:', error);
            Alert.alert('Error', 'No se pudo guardar el pedido');
            return null;
        }
    };

    const updateOrderStatus = async (id: string, status: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            await fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
            Alert.alert('Error', 'No se pudo actualizar el estado');
        }
    };

    const updateOrder = async (id: string, orderData: Partial<OrderFormData>) => {
        try {
            const updates: any = {};
            if (orderData.clientName) updates.client_name = orderData.clientName;
            if (orderData.clientPhone) updates.client_phone = orderData.clientPhone;
            if (orderData.address) updates.address = orderData.address;
            if (orderData.deliveryDate) updates.delivery_date = orderData.deliveryDate.toISOString().split('T')[0];
            if (orderData.deliveryTime) updates.delivery_time = orderData.deliveryTime;
            if (orderData.size) updates.size = orderData.size;
            if (orderData.servings) updates.servings = orderData.servings;
            if (orderData.filling) updates.filling = orderData.filling;
            if (orderData.cover) updates.cover = orderData.cover;
            if (orderData.occasion) updates.occasion = orderData.occasion;
            if (orderData.description) updates.description = orderData.description;
            if (orderData.totalPrice !== undefined) updates.total_price = orderData.totalPrice;
            if (orderData.paymentMethod) updates.payment_method = orderData.paymentMethod;

            const { data, error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await fetchOrders();
            return data;
        } catch (error) {
            console.error('Error updating order:', error);
            Alert.alert('Error', 'No se pudo actualizar el pedido');
            return null;
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    return {
        orders,
        loading,
        refreshing,
        onRefresh,
        createOrder,
        updateOrderStatus,
        updateOrder,
    };
}
