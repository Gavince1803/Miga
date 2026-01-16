import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useFinances } from '@/hooks/useFinances';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function FinancesScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { summary, recentTransactions, loading, refreshing, onRefresh } = useFinances();

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Finanzas',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
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
                    <View style={[styles.transactionRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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
                    </View>
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
