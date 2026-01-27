import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useFinances } from '@/hooks/useFinances';
import { useHaptics } from '@/hooks/useHaptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('screen');

export default function FinancesScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const { summary, recentTransactions, loading, refreshing, onRefresh, revertTransaction } = useFinances(
        currentDate.getFullYear(),
        currentDate.getMonth()
    );

    const { showAlert } = useAlert();
    const haptics = useHaptics();

    const handleTransactionPress = (transaction: any) => {
        haptics.selection();

        if (transaction.type === 'expense') {
            showAlert({
                title: 'Detalles del Gasto',
                message: `${transaction.description}\nMonto: ${formatCurrency(transaction.amount)}\n\n¿Deseas revertir esta operación? Esto eliminará el registro y devolverá el stock al inventario.`,
                type: 'warning',
                buttons: [
                    { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
                    {
                        text: 'Revertir / Eliminar',
                        onPress: async () => {
                            const success = await revertTransaction(transaction);
                            if (success) {
                                haptics.success();
                                // onRefresh handled internally by useFinances usually, keeps data fresh
                            }
                        },
                        style: 'destructive'
                    }
                ]
            });
        } else {
            // Income Reversion
            showAlert({
                title: 'Detalles del Ingreso',
                message: `${transaction.description}\nMonto: ${formatCurrency(transaction.amount)}\n\n¿Hubo un error? Puedes revertir este ingreso (se marcará como pendiente).`,
                type: 'warning',
                buttons: [
                    { text: 'Cancelar', onPress: () => { }, style: 'cancel' },
                    {
                        text: 'Revertir Ingreso',
                        onPress: async () => {
                            const success = await revertTransaction(transaction);
                            if (success) {
                                haptics.success();
                            }
                        },
                        style: 'destructive'
                    }
                ]
            });
        }
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    const changeMonth = (increment: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setCurrentDate(newDate);
    };

    // Process data for charts: Daily Income vs Expense
    // We aggregate by Day of Month
    const chartData = useMemo(() => {
        if (!recentTransactions || recentTransactions.length === 0) return [];

        const daysMap = new Map<number, { income: number; expense: number }>();

        // Init some days? No, let's just map present data
        recentTransactions.forEach(t => {
            const day = new Date(t.date).getDate();
            const current = daysMap.get(day) || { income: 0, expense: 0 };

            if (t.type === 'income') current.income += t.amount;
            else current.expense += t.amount;

            daysMap.set(day, current);
        });

        // Convert to array sorted by day
        const sortedDays = Array.from(daysMap.keys()).sort((a, b) => a - b);

        // Format for Gifted Charts: Stacked or simple? 
        // Simple Bar: value = income - expense (Net) or just Income?
        // Let's show Net Profit per day for simplicity, or Income (Green) vs Expense (Red) bars side by side?
        // Gifted Charts supports "stacks" or "groups". Let's do simple Income (Green) for now to keep it clear.
        // Better: Income Bars.

        return sortedDays.map(day => ({
            value: daysMap.get(day)?.income || 0,
            label: `${day}`,
            frontColor: colors.success,
            topLabelComponent: () => (
                <Text style={{ color: colors.success, fontSize: 9, marginBottom: 2 }}>
                    {formatCurrency(daysMap.get(day)?.income || 0).split('.')[0]}
                </Text>
            ),
        }));
    }, [recentTransactions, colors]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Finanzas',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
                headerRight: () => (
                    <TouchableOpacity onPress={() => setCurrentDate(new Date())} style={{ marginRight: 15 }}>
                        <FontAwesome name="calendar-o" size={20} color={colors.primary} />
                    </TouchableOpacity>
                )
            }} />

            <FlatList
                contentContainerStyle={styles.contentContainer}
                data={recentTransactions}
                keyExtractor={item => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListHeaderComponent={
                    <View style={styles.header}>
                        {/* Month Selector */}
                        <View style={[styles.monthSelector, { backgroundColor: colors.surface }]}>
                            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
                                <FontAwesome name="chevron-left" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <Text style={[styles.monthTitle, { color: colors.text }]}>
                                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </Text>
                            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
                                <FontAwesome name="chevron-right" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Summary Cards */}
                        <View style={styles.summaryGrid}>
                            <View style={[styles.summaryCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
                                    <FontAwesome name="arrow-up" size={16} color={colors.success} />
                                </View>
                                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ingresos</Text>
                                <Text style={[styles.summaryValue, { color: colors.success }]}>
                                    {formatCurrency(summary.totalIncome)}
                                </Text>
                            </View>

                            <View style={[styles.summaryCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                <View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
                                    <FontAwesome name="arrow-down" size={16} color={colors.error} />
                                </View>
                                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Gastos</Text>
                                <Text style={[styles.summaryValue, { color: colors.error }]}>
                                    {formatCurrency(summary.totalExpenses)}
                                </Text>
                            </View>
                        </View>

                        {/* Chart Section */}
                        {!loading && recentTransactions.length > 0 && (
                            <View style={[styles.chartContainer, { backgroundColor: colors.surface }, Shadows.sm]}>
                                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 20 }]}>
                                    Resumen Diario
                                </Text>
                                <BarChart
                                    data={chartData}
                                    barWidth={22}
                                    spacing={14}
                                    roundedTop
                                    roundedBottom
                                    hideRules
                                    xAxisThickness={0}
                                    yAxisThickness={0}
                                    yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                                    noOfSections={3}
                                    maxValue={100} // Dynamic? No, let auto calc
                                    isAnimated
                                    animationDuration={500}
                                    width={width - 80} // screen padding
                                    labelWidth={30}
                                    xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                                />
                            </View>
                        )}

                        {/* Balance Main Card */}
                        <View style={[styles.balanceCard, { backgroundColor: colors.primary }, Shadows.md]}>
                            <View>
                                <Text style={[styles.balanceLabel, { color: 'rgba(255,255,255,0.8)' }]}>Balance Total</Text>
                                <Text style={[styles.balanceValue, { color: '#FFF' }]}>
                                    {formatCurrency(summary.balance)}
                                </Text>
                            </View>
                            <View style={[styles.marginContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Text style={[styles.marginText, { color: '#FFF' }]}>
                                    {summary.profitMargin.toFixed(1)}% Margen
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Movimientos Recientes</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleTransactionPress(item)}
                        style={[styles.transactionRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
                    >
                        <View style={[styles.transactionIcon, {
                            backgroundColor: item.type === 'income' ? colors.success + '15' : colors.error + '15'
                        }]}>
                            <FontAwesome
                                name={item.type === 'income' ? 'tag' : 'shopping-cart'}
                                size={14}
                                color={item.type === 'income' ? colors.success : colors.error}
                            />
                        </View>
                        <View style={styles.transactionInfo}>
                            <Text style={[styles.transactionDesc, { color: colors.text }]}>{item.description}</Text>
                            <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                                {new Date(item.date).toLocaleDateString()}
                            </Text>
                        </View>
                        <Text style={[styles.transactionAmount, {
                            color: item.type === 'income' ? colors.success : colors.error
                        }]}>
                            {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                        </Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                No hay movimientos registrados
                            </Text>
                        </View>
                    ) : (
                        <View style={{ padding: 20 }}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 100,
    },
    header: {
        padding: Spacing.md,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    chartContainer: {
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        alignItems: 'center',
    },
    monthNavBtn: {
        padding: Spacing.sm,
    },
    monthTitle: {
        ...Typography.bodyBold,
        fontSize: 16,
    },
    summaryCard: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    summaryLabel: {
        ...Typography.caption,
        marginBottom: 4,
    },
    summaryValue: {
        ...Typography.title,
        fontSize: 20,
    },
    balanceCard: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    balanceLabel: {
        ...Typography.body,
        fontWeight: '600',
        marginBottom: 4,
    },
    balanceValue: {
        ...Typography.title,
        fontSize: 32,
    },
    marginContainer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    marginText: {
        ...Typography.caption,
        fontWeight: '700',
    },
    sectionTitle: {
        ...Typography.subtitle,
        marginBottom: Spacing.sm,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    transactionIcon: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionDesc: {
        ...Typography.bodyBold,
        marginBottom: 2,
    },
    transactionDate: {
        ...Typography.caption,
    },
    transactionAmount: {
        ...Typography.bodyBold,
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        fontStyle: 'italic',
    },
});
