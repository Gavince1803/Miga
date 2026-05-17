import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useSubscription } from '@/hooks/useSubscription';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack } from 'expo-router';
import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('screen');

export default function AnalyticsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { data, loading, refreshing, onRefresh } = useAnalytics();
    const { isPremium, loading: isAuthLoading } = useSubscription();
    const { currency } = useSettings();
    const currencySymbol = CURRENCIES[currency]?.symbol || '$';

    const formatCurrency = React.useCallback((amount: number) => {
        if (currency === 'VES') {
            return `${currencySymbol}${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }, [currency, currencySymbol]);

    const barChartData = useMemo(() => {
        return data.monthlyRevenue.map(item => ({
            value: item.revenue,
            label: item.month,
            frontColor: colors.primary,
            topLabelComponent: () => (
                <Text style={{ color: colors.primary, fontSize: 9, marginBottom: 2 }}>
                    {item.revenue > 0 ? formatCurrency(item.revenue).split('.')[0] : ''}
                </Text>
            ),
        }));
    }, [data.monthlyRevenue, colors, formatCurrency]);

    const barChartMax = useMemo(() => {
        if (barChartData.length === 0) return 100;
        const max = Math.max(...barChartData.map(d => d.value));
        if (max === 0) return 100;
        return Math.ceil((max * 1.25) / 10) * 10;
    }, [barChartData]);

    const topProductMax = useMemo(() => {
        if (data.topProducts.length === 0) return 1;
        return data.topProducts[0].count;
    }, [data.topProducts]);

    const topClientMax = useMemo(() => {
        if (data.topClients.length === 0) return 1;
        return data.topClients[0].count;
    }, [data.topClients]);

    if (isAuthLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!isPremium) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{
                    title: 'Analytics',
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerShadowVisible: false,
                }} />
                <View style={styles.premiumGate}>
                    <View style={[styles.premiumIconCircle, { backgroundColor: colors.primary + '15' }]}>
                        <FontAwesome name="bar-chart" size={48} color={colors.primary} />
                    </View>
                    <Text style={[styles.premiumTitle, { color: colors.text }]}>
                        Analytics Avanzado
                    </Text>
                    <Text style={[styles.premiumDesc, { color: colors.textSecondary }]}>
                        Descubre qué productos se venden más, tus mejores clientes y tendencias de ingresos mes a mes.
                    </Text>
                    <View style={styles.premiumFeatures}>
                        {[
                            { icon: 'bar-chart', text: 'Ingresos de los últimos 6 meses' },
                            { icon: 'birthday-cake', text: 'Top 5 productos más pedidos' },
                            { icon: 'users', text: 'Top 3 clientes frecuentes' },
                            { icon: 'calendar-check-o', text: 'Día con más entregas' },
                        ].map((f, i) => (
                            <View key={i} style={styles.premiumFeatureRow}>
                                <FontAwesome name={f.icon as any} size={16} color={colors.primary} />
                                <Text style={[styles.premiumFeatureText, { color: colors.text }]}>{f.text}</Text>
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity
                        style={[styles.premiumCTA, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/premium')}
                    >
                        <FontAwesome name="star" size={18} color="#FFF" />
                        <Text style={styles.premiumCTAText}>Desbloquear con Premium</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Analytics',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
            }} />

            <ScrollView
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Month Summary */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumen del Mes</Text>
                <View style={styles.summaryGrid}>
                    <View style={[styles.summaryCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                            <FontAwesome name="shopping-bag" size={15} color={colors.primary} />
                        </View>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pedidos</Text>
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
                        ) : (
                            <Text style={[styles.summaryValue, { color: colors.text }]}>
                                {data.summary.totalOrders}
                            </Text>
                        )}
                    </View>

                    <View style={[styles.summaryCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
                            <FontAwesome name="money" size={15} color={colors.success} />
                        </View>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ingresos</Text>
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
                        ) : (
                            <Text style={[styles.summaryValue, { color: colors.success }]}>
                                {formatCurrency(data.summary.totalRevenue)}
                            </Text>
                        )}
                    </View>

                    <View style={[styles.summaryCardFull, { backgroundColor: colors.surface }, Shadows.sm]}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
                            <FontAwesome name="ticket" size={15} color={colors.warning} />
                        </View>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ticket Promedio</Text>
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
                        ) : (
                            <Text style={[styles.summaryValue, { color: colors.warning }]}>
                                {formatCurrency(data.summary.avgTicket)}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Monthly Revenue Chart */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingresos por Mes</Text>
                <View style={[styles.chartContainer, { backgroundColor: colors.surface }, Shadows.sm]}>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : (
                        <BarChart
                            data={barChartData}
                            barWidth={28}
                            spacing={18}
                            roundedTop
                            roundedBottom
                            hideRules
                            xAxisThickness={0}
                            yAxisThickness={0}
                            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                            noOfSections={3}
                            maxValue={barChartMax}
                            isAnimated
                            animationDuration={500}
                            width={width - 80}
                            labelWidth={36}
                            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
                        />
                    )}
                </View>

                {/* Top 5 Products */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Top 5 Productos</Text>
                <View style={[styles.listCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} style={{ padding: Spacing.lg }} />
                    ) : data.topProducts.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin datos aún</Text>
                    ) : (
                        data.topProducts.map((product, index) => (
                            <View key={product.name} style={[styles.rankRow, index < data.topProducts.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                                <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.primary + '20' : colors.surfaceSecondary }]}>
                                    <Text style={[styles.rankNumber, { color: index === 0 ? colors.primary : colors.textSecondary }]}>
                                        {index + 1}
                                    </Text>
                                </View>
                                <View style={styles.rankInfo}>
                                    <Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
                                        {product.name}
                                    </Text>
                                    <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                                        <View style={[styles.barFill, { backgroundColor: colors.primary, width: `${(product.count / topProductMax) * 100}%` }]} />
                                    </View>
                                </View>
                                <Text style={[styles.rankCount, { color: colors.textSecondary }]}>
                                    {product.count} ped.
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Top 3 Clients */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Top 3 Clientes</Text>
                <View style={[styles.listCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} style={{ padding: Spacing.lg }} />
                    ) : data.topClients.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin datos aún</Text>
                    ) : (
                        data.topClients.map((client, index) => (
                            <View key={client.name} style={[styles.rankRow, index < data.topClients.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                                <View style={[styles.clientAvatar, { backgroundColor: colors.secondary + '30' }]}>
                                    <Text style={[styles.clientInitial, { color: colors.primary }]}>
                                        {client.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.rankInfo}>
                                    <Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
                                        {client.name}
                                    </Text>
                                    <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                                        <View style={[styles.barFill, { backgroundColor: colors.secondary, width: `${(client.count / topClientMax) * 100}%` }]} />
                                    </View>
                                </View>
                                <Text style={[styles.rankCount, { color: colors.textSecondary }]}>
                                    {client.count} ped.
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Busiest Weekday */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Día más Ocupado</Text>
                <View style={[styles.weekdayCard, { backgroundColor: colors.primary }, Shadows.md]}>
                    <FontAwesome name="calendar-check-o" size={32} color="rgba(255,255,255,0.9)" />
                    <View style={styles.weekdayInfo}>
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Text style={styles.weekdayLabel}>Más entregas los</Text>
                                <Text style={styles.weekdayName}>{data.busiestWeekday}</Text>
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    sectionTitle: {
        ...Typography.subtitle,
        fontSize: 18,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    summaryCard: {
        flex: 1,
        minWidth: '45%',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    summaryCardFull: {
        width: '100%',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
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
        ...Typography.bodyBold,
        fontSize: 20,
    },
    chartContainer: {
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        alignItems: 'center',
        minHeight: 120,
        justifyContent: 'center',
    },
    listCard: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankNumber: {
        ...Typography.caption,
        fontWeight: '700',
    },
    clientAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clientInitial: {
        ...Typography.bodyBold,
        fontSize: 15,
    },
    rankInfo: {
        flex: 1,
        gap: 4,
    },
    rankName: {
        ...Typography.caption,
        fontWeight: '600',
    },
    barTrack: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    barFill: {
        height: 4,
        borderRadius: 2,
    },
    rankCount: {
        ...Typography.small,
        fontWeight: '600',
    },
    weekdayCard: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        marginBottom: Spacing.md,
    },
    weekdayInfo: {
        flex: 1,
    },
    weekdayLabel: {
        color: 'rgba(255,255,255,0.75)',
        ...Typography.caption,
        marginBottom: 4,
    },
    weekdayName: {
        color: '#FFF',
        ...Typography.title,
        fontSize: 26,
    },
    emptyText: {
        ...Typography.body,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: Spacing.lg,
    },
    // Premium gate
    premiumGate: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    premiumIconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    premiumTitle: {
        ...Typography.title,
        fontSize: 24,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    premiumDesc: {
        ...Typography.body,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 22,
    },
    premiumFeatures: {
        alignSelf: 'stretch',
        marginBottom: Spacing.xl,
        gap: Spacing.md,
    },
    premiumFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    premiumFeatureText: {
        ...Typography.body,
    },
    premiumCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.lg,
        width: '100%',
    },
    premiumCTAText: {
        color: '#FFF',
        ...Typography.bodyBold,
        fontSize: 17,
    },
});
