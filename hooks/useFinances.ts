import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export interface FinanceSummary {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    profitMargin: number;
}

export interface Transaction {
    id: string;
    date: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category?: string;
}

export function useFinances() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<FinanceSummary>({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        profitMargin: 0
    });
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

    const fetchFinances = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            // 1. Fetch Income (Orders Paid)
            // Filter by status 'pagado' OR payment_status 'pagado'
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .or('status.eq.pagado,payment_status.eq.pagado')
                .order('delivery_date', { ascending: false });

            if (ordersError) throw ordersError;

            // 2. Fetch Expenses (Inventory Additions)
            // We need to join with inventory_items to get the cost
            const { data: movements, error: movementsError } = await supabase
                .from('inventory_movements')
                .select(`
                    *,
                    inventory_items (
                        name,
                        cost_per_unit
                    )
                `)
                .eq('movement_type', 'agregado')
                .order('created_at', { ascending: false });

            if (movementsError) throw movementsError;

            // Calculate Totals
            let totalIncome = 0;
            const incomeTransactions: Transaction[] = [];

            if (orders) {
                orders.forEach((order: any) => {
                    // Use total_price. If deposit_amount exists and is different, logic might vary, 
                    // but usually 'pagado' means full price is income.
                    const amount = order.total_price || 0;
                    totalIncome += amount;

                    incomeTransactions.push({
                        id: order.id,
                        date: order.delivery_date || order.created_at,
                        type: 'income',
                        amount: amount,
                        description: `Pedido #${order.order_number} - ${order.client_name}`,
                        category: 'Venta'
                    });
                });
            }

            let totalExpenses = 0;
            const expenseTransactions: Transaction[] = [];

            if (movements) {
                movements.forEach((mov: any) => {
                    const cost = mov.inventory_items?.cost_per_unit || 0;
                    const amount = (mov.quantity || 0) * cost;
                    totalExpenses += amount;

                    expenseTransactions.push({
                        id: mov.id,
                        date: mov.created_at,
                        type: 'expense',
                        amount: amount,
                        description: `Compra: ${mov.inventory_items?.name || 'Item'}`,
                        category: 'Inventario'
                    });
                });
            }

            // Merge and Sort Transactions
            const allTransactions = [...incomeTransactions, ...expenseTransactions]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 20); // Limit to recent 20

            setSummary({
                totalIncome,
                totalExpenses,
                balance: totalIncome - totalExpenses,
                profitMargin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
            });
            setRecentTransactions(allTransactions);

        } catch (error) {
            console.error('Error fetching finances:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchFinances();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFinances();
    }, []);

    return {
        summary,
        recentTransactions,
        loading,
        refreshing,
        onRefresh
    };
}
