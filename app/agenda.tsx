import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useOrders } from '@/hooks/useOrders';
import { ORDER_STATUS_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack } from 'expo-router';
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

const isOrderToday = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const now = new Date();
    return y === now.getFullYear() && m - 1 === now.getMonth() && d === now.getDate();
};

const fmt12 = (time: string) => {
    if (!time) return '—';
    const [h, min] = time.split(':').map(Number);
    return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function AgendaScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { orders, loading, refreshing, onRefresh } = useOrders();

    const todayOrders = orders
        .filter(o => isOrderToday(o.deliveryDate) && o.status !== 'cancelado')
        .sort((a, b) => (a.deliveryTime || '').localeCompare(b.deliveryTime || ''));

    const done = todayOrders.filter(o => o.status === 'pagado' || o.status === 'completado').length;
    const pending = todayOrders.length - done;

    const todayLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Agenda de Hoy',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
            }} />

            <View style={[styles.dateHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <Text style={[styles.dateText, { color: colors.text }]}>{todayLabel}</Text>
                {todayOrders.length > 0 && (
                    <View style={styles.progressRow}>
                        <View style={[styles.pill, { backgroundColor: colors.success + '20' }]}>
                            <Text style={[styles.pillText, { color: colors.success }]}>{done} listas</Text>
                        </View>
                        {pending > 0 && (
                            <View style={[styles.pill, { backgroundColor: colors.warning + '20' }]}>
                                <Text style={[styles.pillText, { color: colors.warning }]}>{pending} pendientes</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    showsVerticalScrollIndicator={false}
                >
                    {todayOrders.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>🎉</Text>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin entregas hoy</Text>
                            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                                Aprovecha para preparar los próximos pedidos.
                            </Text>
                        </View>
                    ) : (
                        todayOrders.map(order => {
                            const statusOption = ORDER_STATUS_OPTIONS.find(s => s.value === order.status);
                            const isDone = order.status === 'pagado' || order.status === 'completado';
                            const phone = order.clientPhone;

                            return (
                                <View
                                    key={order.id}
                                    style={[
                                        styles.card,
                                        { backgroundColor: colors.surface, borderLeftColor: isDone ? colors.success : colors.urgentToday },
                                        isDone && { opacity: 0.65 },
                                        Shadows.sm,
                                    ]}
                                >
                                    <View style={styles.cardTop}>
                                        <View style={[styles.timeChip, { backgroundColor: (isDone ? colors.success : colors.urgentToday) + '20' }]}>
                                            <FontAwesome name="clock-o" size={11} color={isDone ? colors.success : colors.urgentToday} />
                                            <Text style={[styles.timeText, { color: isDone ? colors.success : colors.urgentToday }]}>
                                                {fmt12(order.deliveryTime)}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: (statusOption?.color || colors.textMuted) + '20' }]}>
                                            {isDone && <FontAwesome name="check" size={9} color={statusOption?.color} style={{ marginRight: 3 }} />}
                                            <Text style={[styles.statusText, { color: statusOption?.color || colors.textMuted }]}>
                                                {statusOption?.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.clientName, { color: colors.text }]}>{order.clientName}</Text>

                                    {(order.description || order.cakeType || order.size) ? (
                                        <Text style={[styles.orderDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                                            {order.description || [order.cakeType, order.size].filter(Boolean).join(' · ')}
                                        </Text>
                                    ) : null}

                                    <View style={styles.actions}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                                            onPress={() => router.push(`/orders/${order.id}` as any)}
                                        >
                                            <FontAwesome name="eye" size={12} color={colors.primary} />
                                            <Text style={[styles.actionText, { color: colors.primary }]}>Ver detalle</Text>
                                        </TouchableOpacity>
                                        {phone ? (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
                                                onPress={() => Linking.openURL(`tel:${phone}`)}
                                            >
                                                <FontAwesome name="phone" size={12} color={colors.success} />
                                                <Text style={[styles.actionText, { color: colors.success }]}>Llamar</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                        {phone ? (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: '#25D36615' }]}
                                                onPress={() => Linking.openURL(`whatsapp://send?phone=${phone.replace(/[\s\-\(\)]/g, '')}`).catch(() => { })}
                                            >
                                                <FontAwesome name="whatsapp" size={12} color="#25D366" />
                                                <Text style={[styles.actionText, { color: '#25D366' }]}>WhatsApp</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })
                    )}
                    <View style={{ height: 60 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    dateHeader: {
        padding: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: Spacing.sm,
    },
    dateText: {
        ...Typography.bodyBold,
        textTransform: 'capitalize',
        fontSize: 17,
    },
    progressRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    pill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    pillText: {
        ...Typography.small,
        fontWeight: '600',
    },
    list: {
        padding: Spacing.md,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 70,
        gap: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: {
        ...Typography.subtitle,
        textAlign: 'center',
    },
    emptyDesc: {
        ...Typography.body,
        textAlign: 'center',
        lineHeight: 22,
    },
    card: {
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderLeftWidth: 4,
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    timeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    timeText: {
        ...Typography.small,
        fontWeight: '700',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    statusText: {
        ...Typography.small,
        fontWeight: '600',
    },
    clientName: {
        ...Typography.bodyBold,
        marginBottom: 3,
    },
    orderDesc: {
        ...Typography.caption,
        marginBottom: Spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        flexWrap: 'wrap',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
    },
    actionText: {
        ...Typography.small,
        fontWeight: '600',
    },
});
