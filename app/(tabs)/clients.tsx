import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { ClientSummary, useClients } from '@/hooks/useClients';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

function ClientCard({ client, colors, currencySymbol }: {
    client: ClientSummary;
    colors: typeof Colors.light;
    currencySymbol: string;
}) {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const initial = client.name.charAt(0).toUpperCase();
    const avatarColors = [
        colors.primary, colors.secondary, colors.success, colors.warning,
    ];
    const avatarColor = avatarColors[client.name.charCodeAt(0) % avatarColors.length];

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}
            onPress={() => router.push({ pathname: '/clients/detail' as any, params: { name: client.name } })}
        >
            <View style={[styles.avatar, { backgroundColor: avatarColor + '25' }]}>
                <Text style={[styles.avatarText, { color: avatarColor }]}>{initial}</Text>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                    <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>
                        {client.name}
                    </Text>
                    <View style={[styles.ordersBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.ordersBadgeText, { color: colors.primary }]}>
                            {client.totalOrders} ped.
                        </Text>
                    </View>
                </View>
                <View style={styles.cardRow}>
                    {client.phone ? (
                        <Text style={[styles.phone, { color: colors.textSecondary }]} numberOfLines={1}>
                            <FontAwesome name="phone" size={11} /> {client.phone}
                        </Text>
                    ) : (
                        <Text style={[styles.phone, { color: colors.textMuted }]}>Sin teléfono</Text>
                    )}
                    {client.totalSpent > 0 && (
                        <Text style={[styles.spent, { color: colors.success }]}>
                            {currencySymbol}{client.totalSpent.toFixed(0)} total
                        </Text>
                    )}
                </View>
                <View style={styles.cardRow}>
                    {client.favoriteCake ? (
                        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                            <FontAwesome name="birthday-cake" size={11} /> {client.favoriteCake}
                        </Text>
                    ) : null}
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                        Último: {formatDate(client.lastOrderDate)}
                    </Text>
                </View>
            </View>
            <FontAwesome name="chevron-right" size={13} color={colors.textMuted} />
        </TouchableOpacity>
    );
}

export default function ClientsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { clients, loading, refreshing, onRefresh } = useClients();
    const { currency } = useSettings();
    const currencySymbol = CURRENCIES[currency]?.symbol || '$';
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return clients;
        return clients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            c.favoriteCake.toLowerCase().includes(q)
        );
    }, [clients, search]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Clientes',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
            }} />

            {/* Search bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <FontAwesome name="search" size={15} color={colors.textMuted} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar por nombre, teléfono o torta..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.name}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    renderItem={({ item }) => (
                        <ClientCard client={item} colors={colors} currencySymbol={currencySymbol} />
                    )}
                    ListHeaderComponent={
                        clients.length > 0 ? (
                            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
                                {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
                                {search ? ` de ${clients.length}` : ''}
                            </Text>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <FontAwesome name="users" size={48} color={colors.textMuted} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>
                                {search ? 'Sin resultados' : 'Sin clientes aún'}
                            </Text>
                            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                                {search ? 'Probá con otro término.' : 'Los clientes aparecen automáticamente cuando creás pedidos.'}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        height: 36,
    },
    list: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    totalLabel: {
        ...Typography.small,
        marginBottom: Spacing.sm,
        marginLeft: 2,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        gap: Spacing.md,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
    },
    cardBody: {
        flex: 1,
        gap: 4,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    clientName: {
        ...Typography.bodyBold,
        flex: 1,
        marginRight: Spacing.sm,
    },
    ordersBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    ordersBadgeText: {
        ...Typography.small,
        fontWeight: '700',
    },
    phone: {
        ...Typography.caption,
        flex: 1,
    },
    spent: {
        ...Typography.small,
        fontWeight: '600',
    },
    meta: {
        ...Typography.small,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    emptyTitle: {
        ...Typography.subtitle,
        textAlign: 'center',
    },
    emptyDesc: {
        ...Typography.body,
        textAlign: 'center',
        lineHeight: 22,
    },
});
