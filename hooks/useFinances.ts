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

export function useFinances(year?: number, month?: number) {
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

            // Default to current date if not provided
            const targetYear = year || new Date().getFullYear();
            const targetMonth = month !== undefined ? month : new Date().getMonth(); // 0-indexed

            // Calculate start and end dates for the MONTH (for summary mainly, but user might want history)
            // Actually, for "Recent Transactions", usually we want the latest regardless of month filters, 
            // OR strictly the filtered month. 
            // Let's implement Strict Filtering as requested "Optimization". 
            // So we only fetch data for the relevant period to save bandwidth.

            const startDate = new Date(targetYear, targetMonth, 1).toISOString();
            const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999).toISOString();

            // 1. Fetch Income (Orders Paid)
            // Filter by status 'pagado' OR payment_status 'pagado'
            // AND within date range
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .or('status.eq.pagado,payment_status.eq.pagado')
                .gte('delivery_date', startDate)
                .lte('delivery_date', endDate)
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
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false });

            if (movementsError) throw movementsError;

            // Calculate Totals
            let totalIncome = 0;
            const incomeTransactions: Transaction[] = [];

            if (orders) {
                orders.forEach((order: any) => {
                    // Use total_price. 
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
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            // No need to slice excessively if we are already filtering by month, 
            // but for safety let's keep it reasonable or let it be full month history.
            // Let's return full month history.

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

    // Re-fetch when month/year changes
    useEffect(() => {
        fetchFinances();
    }, [year, month]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFinances();
    }, [year, month]);

    const revertTransaction = async (transaction: Transaction) => {
        try {
            setLoading(true);
            if (transaction.type === 'income') {
                // It's an order. Revert status to 'pendiente'.
                // This effectively "un-pays" the order.
                const { error } = await supabase
                    .from('orders')
                    .update({
                        status: 'pendiente',
                        payment_status: 'pendiente',
                        // Optional: Reset deposit if it was a full payment transaction?
                        // For safety, let's just mark it pending. User can fix amounts.
                    })
                    .eq('id', transaction.id);

                if (error) throw error;

            } else if (transaction.type === 'expense') {
                // It's an inventory movement (purchase).
                // 1. Get the movement details to know what to subtract
                const { data: movement, error: fetchError } = await supabase
                    .from('inventory_movements')
                    .select('inventory_id, quantity')
                    .eq('id', transaction.id)
                    .single();

                if (fetchError) throw fetchError;

                if (movement) {
                    // 2. Fetch current item quantity
                    const { data: item, error: itemError } = await supabase
                        .from('inventory_items')
                        .select('quantity')
                        .eq('id', movement.inventory_id)
                        .single();

                    if (itemError) throw itemError;

                    // 3. Subtract the added quantity (Reverse the operation)
                    const newQuantity = (item.quantity || 0) - movement.quantity;

                    const { error: updateError } = await supabase
                        .from('inventory_items')
                        .update({ quantity: newQuantity })
                        .eq('id', movement.inventory_id);

                    if (updateError) throw updateError;

                    // 4. Delete the movement record
                    const { error: deleteError } = await supabase
                        .from('inventory_movements')
                        .delete()
                        .eq('id', transaction.id);

                    if (deleteError) throw deleteError;
                }
            }

            // Refresh data
            await fetchFinances();
            return true;

        } catch (error) {
            console.error('Error reverting transaction:', error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        summary,
        recentTransactions,
        loading,
        refreshing,
        onRefresh,
        revertTransaction
    };
}
