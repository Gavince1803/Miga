import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export interface ClientSummary {
    name: string;
    phone: string;
    address: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string;
    favoriteCake: string;
}

export function useClients() {
    const [clients, setClients] = useState<ClientSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchClients = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setLoading(false); return; }

            const { data, error } = await supabase
                .from('orders')
                .select('client_name, client_phone, address, total_price, status, payment_status, delivery_date, cake_type')
                .eq('user_id', session.user.id)
                .order('delivery_date', { ascending: false });

            if (error) throw error;
            if (!data) { setLoading(false); return; }

            const clientMap = new Map<string, {
                name: string;
                phone: string;
                address: string;
                rows: typeof data;
            }>();

            data.forEach(row => {
                const key = row.client_name?.toLowerCase().trim();
                if (!key) return;
                if (!clientMap.has(key)) {
                    clientMap.set(key, { name: row.client_name, phone: row.client_phone || '', address: row.address || '', rows: [row] });
                } else {
                    const c = clientMap.get(key)!;
                    c.rows.push(row);
                    if (row.client_phone) c.phone = row.client_phone;
                    if (row.address) c.address = row.address;
                }
            });

            const result: ClientSummary[] = Array.from(clientMap.values()).map(({ name, phone, address, rows }) => {
                const totalOrders = rows.length;
                const totalSpent = rows
                    .filter(r => r.status === 'pagado' || r.payment_status === 'pagado')
                    .reduce((s, r) => s + (r.total_price || 0), 0);
                const lastOrderDate = rows[0]?.delivery_date || '';

                const cakeMap = new Map<string, number>();
                rows.forEach(r => {
                    if (!r.cake_type) return;
                    cakeMap.set(r.cake_type, (cakeMap.get(r.cake_type) || 0) + 1);
                });
                const favoriteCake = cakeMap.size > 0
                    ? Array.from(cakeMap.entries()).sort((a, b) => b[1] - a[1])[0][0]
                    : '';

                return { name, phone, address, totalOrders, totalSpent, lastOrderDate, favoriteCake };
            });

            result.sort((a, b) => b.lastOrderDate.localeCompare(a.lastOrderDate));
            setClients(result);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchClients(); }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchClients();
    }, []);

    return { clients, loading, refreshing, onRefresh };
}
