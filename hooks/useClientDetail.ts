import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import { useCallback, useEffect, useState } from 'react';

export interface ClientStats {
    totalOrders: number;
    totalSpent: number;
    paidCount: number;
    pendingCount: number;
    favoriteCake: string;
}

export function useClientDetail(clientName: string) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<ClientStats>({ totalOrders: 0, totalSpent: 0, paidCount: 0, pendingCount: 0, favoriteCake: '—' });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchOrders = async () => {
        if (!clientName?.trim()) { setLoading(false); return; }
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setLoading(false); return; }

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', session.user.id)
                .ilike('client_name', clientName.trim())
                .order('delivery_date', { ascending: false });

            if (error) throw error;

            const mapped: Order[] = (data || []).map(item => ({
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
                cakeType: item.cake_type,
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

            const paidCount = mapped.filter(o => o.status === 'pagado' || o.paymentStatus === 'pagado').length;
            const totalSpent = mapped
                .filter(o => o.status === 'pagado' || o.paymentStatus === 'pagado')
                .reduce((s, o) => s + (o.totalPrice || 0), 0);

            const cakeMap = new Map<string, { count: number; date: string }>();
            mapped.forEach(o => {
                if (!o.cakeType) return;
                const date = o.deliveryDate || o.createdAt || '';
                const ex = cakeMap.get(o.cakeType);
                if (!ex) cakeMap.set(o.cakeType, { count: 1, date });
                else cakeMap.set(o.cakeType, { count: ex.count + 1, date: date > ex.date ? date : ex.date });
            });
            const favoriteCake = cakeMap.size > 0
                ? Array.from(cakeMap.entries()).sort((a, b) =>
                    b[1].count !== a[1].count ? b[1].count - a[1].count : b[1].date.localeCompare(a[1].date)
                )[0][0]
                : '—';

            setOrders(mapped);
            setStats({ totalOrders: mapped.length, totalSpent, paidCount, pendingCount: mapped.length - paidCount, favoriteCake });
        } catch (error) {
            console.error('Error fetching client detail:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchOrders(); }, [clientName]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchOrders();
    }, [clientName]);

    return { orders, stats, loading, refreshing, onRefresh };
}
