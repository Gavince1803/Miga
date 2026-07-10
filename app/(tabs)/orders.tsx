import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { Order, ORDER_STATUS_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useOrders } from '@/hooks/useOrders';

type FilterType = 'todos' | 'pendiente' | 'pagado' | 'cancelado';

function OrderCard({
    order,
    colors
}: {
    order: Order;
    colors: typeof Colors.light;
}) {
    const statusOption = ORDER_STATUS_OPTIONS.find(s => s.value === order.status);
    const statusColor = statusOption?.color || colors.textMuted;

    // Calculate urgency based on delivery date
    const today = new Date();
    const deliveryDate = new Date(order.deliveryDate);
    const daysUntil = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let urgencyColor = colors.urgentFuture;
    if (daysUntil <= 0) urgencyColor = colors.urgentToday;
    else if (daysUntil <= 2) urgencyColor = colors.urgentSoon;
    else if (daysUntil <= 7) urgencyColor = colors.urgentWeek;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const formatTime12hr = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    return (
        <Link href={`/orders/${order.id}`} asChild>
            <TouchableOpacity
                style={{
                    backgroundColor: colors.surface,
                    borderLeftWidth: 4,
                    borderLeftColor: urgencyColor,
                    marginBottom: 24, // Guaranteed separation
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border || '#E8DDD4',
                    ...Shadows.md
                }}
            >
                <View style={styles.orderCardHeader}>
                    <View style={styles.orderNumberBadge}>
                        <Text style={[styles.orderNumber, { color: colors.primary }]}>
                            #{order.orderNumber}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {statusOption?.label}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.clientName, { color: colors.text }]}>
                    {order.clientName}
                </Text>

                <Text style={[styles.orderDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                    {order.description || `${order.size} - ${order.servings}`}
                </Text>

                <View style={styles.orderFooter}>
                    <View style={styles.orderDateRow}>
                        <FontAwesome name="calendar" size={12} color={colors.textMuted} />
                        <Text style={[styles.orderDate, { color: colors.textMuted }]}>
                            {formatDate(order.deliveryDate)} • {formatTime12hr(order.deliveryTime)}
                        </Text>
                    </View>
                    <Text style={[styles.orderPrice, { color: colors.primary }]}>
                        ${order.totalPrice.toFixed(2)}
                    </Text>
                </View>
            </TouchableOpacity>
        </Link >
    );
}

export default function OrdersScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { orders, loading, refreshing, onRefresh } = useOrders();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('todos');

    const filters: { key: FilterType; label: string }[] = [
        { key: 'todos', label: 'Todos' },
        { key: 'pendiente', label: 'Pendientes' },
        { key: 'pagado', label: 'Pagados' },
        { key: 'cancelado', label: 'Cancelados' },
    ];

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.orderNumber.toString().includes(searchQuery);
        const matchesFilter = activeFilter === 'todos' || order.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <FontAwesome name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Buscar por cliente o descripción..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <FontAwesome name="times-circle" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Chips - Scrollable */}
            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContainer}
                >
                    {filters.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            onPress={() => setActiveFilter(filter.key)}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: activeFilter === filter.key ? colors.primary : colors.surface,
                                    borderColor: activeFilter === filter.key ? colors.primary : colors.border,
                                },
                                Shadows.sm
                            ]}
                        >
                            <Text style={[
                                styles.filterText,
                                { color: activeFilter === filter.key ? '#FFFFFF' : colors.textSecondary }
                            ]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Orders List */}
            <FlatList
                data={filteredOrders}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <OrderCard order={item} colors={colors} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FontAwesome name="inbox" size={48} color={loading ? colors.primary : colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            {loading ? 'Cargando pedidos...' : 'No hay pedidos que mostrar'}
                        </Text>
                    </View>
                }
            />


        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        ...Typography.body,
        paddingVertical: 4,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md, // Allow space for shadows
        gap: Spacing.sm,
    },
    filterChip: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        // Ensure shadows are visible
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    filterText: {
        ...Typography.caption,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: Spacing.md,
        paddingBottom: 100,
    },
    orderCard: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderLeftWidth: 4,
    },
    orderCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    orderNumberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderNumber: {
        ...Typography.caption,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    statusText: {
        ...Typography.small,
        fontWeight: '600',
    },
    clientName: {
        ...Typography.bodyBold,
        marginBottom: 4,
    },
    orderDescription: {
        ...Typography.body,
        marginBottom: Spacing.xs,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    orderDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    orderDate: {
        ...Typography.small,
    },
    orderPrice: {
        ...Typography.bodyBold,
        fontSize: 17,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxl,
    },
    emptyText: {
        ...Typography.body,
        marginTop: Spacing.md,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    fabLabel: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
