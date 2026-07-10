import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export interface MonthSummary {
    totalOrders: number;
    totalRevenue: number;
    avgTicket: number;
}

export interface MonthlyRevenue {
    month: string;
    revenue: number;
}

export interface TopProduct {
    name: string;
    count: number;
}

export interface TopClient {
    name: string;
    count: number;
}

export interface AnalyticsData {
    summary: MonthSummary;
    monthlyRevenue: MonthlyRevenue[];
    topProducts: TopProduct[];
    topClients: TopClient[];
    busiestWeekday: string;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function useAnalytics() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<AnalyticsData>({
        summary: { totalOrders: 0, totalRevenue: 0, avgTicket: 0 },
        monthlyRevenue: [],
        topProducts: [],
        topClients: [],
        busiestWeekday: '—',
    });

    const fetchAnalytics = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setLoading(false); return; }

            const now = new Date();
            const curYear = now.getFullYear();
            const curMonth = now.getMonth();

            const sixMonthsAgo = new Date(curYear, curMonth - 5, 1);

            const { data: orders, error } = await supabase
                .from('orders')
                .select('id, client_name, cake_type, total_price, delivery_date, status, payment_status')
                .gte('delivery_date', sixMonthsAgo.toISOString())
                .order('delivery_date', { ascending: true });

            if (error) throw error;
            if (!orders || orders.length === 0) {
                setData({
                    summary: { totalOrders: 0, totalRevenue: 0, avgTicket: 0 },
                    monthlyRevenue: buildEmptyMonthlyRevenue(curYear, curMonth),
                    topProducts: [],
                    topClients: [],
                    busiestWeekday: '—',
                });
                return;
            }

            const paidOrders = orders.filter(o =>
                o.status === 'pagado' || o.payment_status === 'pagado'
            );

            // Current month summary
            const currentMonthPaid = paidOrders.filter(o => {
                const d = new Date(o.delivery_date);
                return d.getFullYear() === curYear && d.getMonth() === curMonth;
            });
            const totalRevenue = currentMonthPaid.reduce((s, o) => s + (o.total_price || 0), 0);
            const totalOrders = currentMonthPaid.length;
            const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            // Monthly revenue — last 6 months
            const monthlyMap = new Map<string, number>();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(curYear, curMonth - i, 1);
                monthlyMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
            }
            paidOrders.forEach(o => {
                const d = new Date(o.delivery_date);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                if (monthlyMap.has(key)) {
                    monthlyMap.set(key, (monthlyMap.get(key) || 0) + (o.total_price || 0));
                }
            });
            const monthlyRevenue: MonthlyRevenue[] = Array.from(monthlyMap.entries()).map(([key, revenue]) => {
                const m = parseInt(key.split('-')[1]);
                return { month: MONTH_NAMES[m], revenue };
            });

            // Top 5 products by cake_type
            const productMap = new Map<string, number>();
            orders.forEach(o => {
                if (!o.cake_type) return;
                productMap.set(o.cake_type, (productMap.get(o.cake_type) || 0) + 1);
            });
            const topProducts: TopProduct[] = Array.from(productMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, count]) => ({ name, count }));

            // Top 3 clients
            const clientMap = new Map<string, number>();
            orders.forEach(o => {
                if (!o.client_name) return;
                clientMap.set(o.client_name, (clientMap.get(o.client_name) || 0) + 1);
            });
            const topClients: TopClient[] = Array.from(clientMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name, count]) => ({ name, count }));

            // Busiest weekday (all orders in range)
            const weekdayCount = new Array(7).fill(0);
            orders.forEach(o => {
                if (!o.delivery_date) return;
                weekdayCount[new Date(o.delivery_date).getDay()]++;
            });
            const maxCount = Math.max(...weekdayCount);
            const busiestWeekday = maxCount > 0 ? WEEKDAYS[weekdayCount.indexOf(maxCount)] : '—';

            setData({ summary: { totalOrders, totalRevenue, avgTicket }, monthlyRevenue, topProducts, topClients, busiestWeekday });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAnalytics();
    }, []);

    return { data, loading, refreshing, onRefresh };
}

function buildEmptyMonthlyRevenue(curYear: number, curMonth: number): MonthlyRevenue[] {
    return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(curYear, curMonth - (5 - i), 1);
        return { month: MONTH_NAMES[d.getMonth()], revenue: 0 };
    });
}
