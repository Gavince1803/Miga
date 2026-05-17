import BackButton from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { useClientDetail } from '@/hooks/useClientDetail';
import { Order, ORDER_STATUS_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ClientDetailScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { name } = useLocalSearchParams<{ name: string }>();
    const { orders, stats, loading, refreshing, onRefresh } = useClientDetail(name || '');
    const { currency } = useSettings();
    const currencySymbol = CURRENCIES[currency]?.symbol || '$';

    const formatCurrency = (amount: number) => {
        if (currency === 'VES') {
            return `${currencySymbol}${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getStatusColor = (status: string) => ORDER_STATUS_OPTIONS.find(s => s.value === status)?.color || colors.textMuted;
    const getStatusLabel = (status: string) => ORDER_STATUS_OPTIONS.find(s => s.value === status)?.label || status;

    const lastOrder = orders[0];
    const phone = lastOrder?.clientPhone || '';

    const handleCall = () => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`);
    };

    const handleWhatsApp = () => {
        if (!phone) return;
        const clean = phone.replace(/[\s\-\(\)]/g, '');
        Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() => { });
    };

    const handleNewOrder = () => {
        if (!lastOrder) {
            router.push({ pathname: '/orders/new', params: { clientName: name } });
            return;
        }
        router.push({
            pathname: '/orders/new',
            params: {
                clientName: lastOrder.clientName || '',
                clientPhone: lastOrder.clientPhone || '',
                address: lastOrder.address || '',
                cakeType: lastOrder.cakeType || '',
                size: lastOrder.size || '',
                filling: lastOrder.filling || '',
                cover: lastOrder.cover || '',
                totalPrice: String(lastOrder.totalPrice || ''),
            }
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                headerShown: true,
                title: name || 'Cliente',
                headerLeft: () => <BackButton />,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
            }} />

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header card */}
                <View style={[styles.headerCard, { backgroundColor: colors.surface }, Shadows.md]}>
                    <View style={[styles.bigAvatar, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.bigAvatarText, { color: colors.primary }]}>
                            {name?.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={[styles.clientName, { color: colors.text }]}>{name}</Text>
                    {phone ? (
                        <Text style={[styles.phone, { color: colors.textSecondary }]}>{phone}</Text>
                    ) : null}

                    {/* Contact actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
                            onPress={handleCall}
                            disabled={!phone}
                        >
                            <FontAwesome name="phone" size={17} color={phone ? colors.success : colors.textMuted} />
                            <Text style={[styles.actionText, { color: phone ? colors.success : colors.textMuted }]}>Llamar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#25D36615' }]}
                            onPress={handleWhatsApp}
                            disabled={!phone}
                        >
                            <FontAwesome name="whatsapp" size={17} color={phone ? '#25D366' : colors.textMuted} />
                            <Text style={[styles.actionText, { color: phone ? '#25D366' : colors.textMuted }]}>WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                            onPress={handleNewOrder}
                        >
                            <FontAwesome name="plus" size={17} color={colors.primary} />
                            <Text style={[styles.actionText, { color: colors.primary }]}>Nuevo pedido</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats 2×2 */}
                {loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.lg }} />
                ) : (
                    <>
                        <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
                            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                                <View style={[styles.statCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.primary + '15' }]}>
                                        <FontAwesome name="shopping-bag" size={13} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total pedidos</Text>
                                    <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalOrders}</Text>
                                </View>
                                <View style={[styles.statCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.success + '15' }]}>
                                        <FontAwesome name="money" size={13} color={colors.success} />
                                    </View>
                                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total gastado</Text>
                                    <Text style={[styles.statValue, { color: colors.success }]} numberOfLines={1}>
                                        {formatCurrency(stats.totalSpent)}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                                <View style={[styles.statCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.success + '15' }]}>
                                        <FontAwesome name="check-circle" size={13} color={colors.success} />
                                    </View>
                                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pag. / Pend.</Text>
                                    <Text style={[styles.statValue, { color: colors.text }]}>{stats.paidCount} / {stats.pendingCount}</Text>
                                </View>
                                <View style={[styles.statCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                    <View style={[styles.statIcon, { backgroundColor: colors.secondary + '20' }]}>
                                        <FontAwesome name="birthday-cake" size={13} color={colors.primary} />
                                    </View>
                                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Torta favorita</Text>
                                    <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{stats.favoriteCake}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Order history */}
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Historial ({orders.length})
                        </Text>
                        {orders.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin pedidos</Text>
                            </View>
                        ) : (
                            orders.map((order: Order) => {
                                const statusColor = getStatusColor(order.status);
                                return (
                                    <TouchableOpacity
                                        key={order.id}
                                        style={[styles.orderCard, { backgroundColor: colors.surface, borderLeftColor: statusColor }, Shadows.sm]}
                                        onPress={() => router.push(`/orders/${order.id}`)}
                                    >
                                        <View style={styles.orderCardHeader}>
                                            <Text style={[styles.orderNumber, { color: colors.text }]}>
                                                #{order.orderNumber}
                                            </Text>
                                            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                                                <Text style={[styles.statusText, { color: statusColor }]}>
                                                    {getStatusLabel(order.status)}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.orderDesc, { color: colors.text }]} numberOfLines={1}>
                                            {order.description || order.cakeType || order.size || 'Sin descripción'}
                                        </Text>
                                        <View style={styles.orderMeta}>
                                            <Text style={[styles.orderDate, { color: colors.textMuted }]}>
                                                {formatDate(order.deliveryDate)}
                                            </Text>
                                            <Text style={[styles.orderPrice, { color: colors.text }]}>
                                                {formatCurrency(order.totalPrice)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        padding: Spacing.md,
    },
    headerCard: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    bigAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    bigAvatarText: {
        fontSize: 30,
        fontWeight: '700',
    },
    clientName: {
        ...Typography.title,
        textAlign: 'center',
        marginBottom: 4,
    },
    phone: {
        ...Typography.body,
        marginBottom: Spacing.md,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignSelf: 'stretch',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        gap: 5,
    },
    actionText: {
        ...Typography.small,
        fontWeight: '600',
    },
    statCard: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    statIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    statLabel: {
        ...Typography.small,
        marginBottom: 2,
    },
    statValue: {
        ...Typography.bodyBold,
        fontSize: 18,
    },
    sectionTitle: {
        ...Typography.subtitle,
        fontSize: 18,
        marginBottom: Spacing.sm,
    },
    orderCard: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderLeftWidth: 3,
    },
    orderCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    orderNumber: {
        ...Typography.bodyBold,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    statusText: {
        ...Typography.small,
        fontWeight: '600',
    },
    orderDesc: {
        ...Typography.body,
        marginBottom: 6,
    },
    orderMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    orderDate: {
        ...Typography.small,
    },
    orderPrice: {
        ...Typography.bodyBold,
    },
    emptyState: {
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        fontStyle: 'italic',
    },
});
