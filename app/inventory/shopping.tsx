import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/Colors';
import { useInventory } from '@/hooks/useInventory';
import { useOrders } from '@/hooks/useOrders';
import { buildShoppingList, formatAmount, ShoppingItem, shoppingListText } from '@/lib/shoppingList';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ShoppingListScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { inventory } = useInventory();
    const { orders } = useOrders();
    const [items, setItems] = useState<ShoppingItem[] | null>(null);
    const [error, setError] = useState(false);
    const [checked, setChecked] = useState<Set<string>>(new Set());

    useEffect(() => {
        buildShoppingList(inventory, orders)
            .then(list => { setItems(list); setError(false); })
            .catch(() => setError(true));
    }, [inventory, orders]);

    const toggle = (id: string) => setChecked(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const pending = (items ?? []).filter(i => !checked.has(i.inventoryItemId));

    const share = async () => {
        const text = shoppingListText(pending);
        const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
        const canOpen = await Linking.canOpenURL(url).catch(() => false);
        if (canOpen) Linking.openURL(url);
        else Share.share({ message: text });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Volver">
                    <FontAwesome name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Lista de compras</Text>
                <View style={{ width: 44 }} />
            </View>

            {items === null && !error ? (
                <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No se pudo armar la lista. Revisa tu conexión.</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={i => i.inventoryItemId}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Lo que está bajo tu mínimo y lo que piden tus pedidos pendientes de los próximos 7 días.
                        </Text>
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <FontAwesome name="check-circle" size={48} color={colors.success} />
                            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No te falta nada por ahora 🎉</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const done = checked.has(item.inventoryItemId);
                        return (
                            <TouchableOpacity
                                style={[styles.row, { backgroundColor: colors.surface, opacity: done ? 0.5 : 1 }, Shadows.sm]}
                                onPress={() => toggle(item.inventoryItemId)}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: done }}
                                accessibilityLabel={`${item.name}, comprar ${formatAmount(item.toBuy, item.unit)}`}
                            >
                                <FontAwesome name={done ? 'check-square' : 'square-o'} size={22} color={colors.primary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.name, { color: colors.text, textDecorationLine: done ? 'line-through' : 'none' }]}>
                                        {item.name}
                                    </Text>
                                    <Text style={[styles.reason, { color: item.reason === 'pedidos' ? colors.warning : colors.textSecondary }]}>
                                        {item.reason === 'pedidos'
                                            ? `Para ${item.forOrders.join(', ') || 'tus pedidos'}`
                                            : 'Bajo tu mínimo'}
                                    </Text>
                                </View>
                                <Text style={[styles.amount, { color: colors.primary }]}>{formatAmount(item.toBuy, item.unit)}</Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {pending.length > 0 && (
                <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.success }]} onPress={share}>
                        <FontAwesome name="whatsapp" size={20} color="#FFF" />
                        <Text style={styles.shareText}>Compartir por WhatsApp</Text>
                    </TouchableOpacity>
                    <Text style={[styles.hint, { color: colors.textMuted }]}>
                        Cuando compres, usa "Registrar compra" en Inventario para sumar el stock.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
    },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 160 },
    subtitle: { fontSize: 14, marginBottom: Spacing.sm, lineHeight: 20 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    name: { fontSize: 16, fontWeight: '600' },
    reason: { fontSize: 13, marginTop: 2 },
    amount: { fontSize: 16, fontWeight: '700' },
    center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md, flex: 1 },
    emptyText: { fontSize: 15, textAlign: 'center' },
    footer: { padding: Spacing.md, borderTopWidth: 1, gap: Spacing.sm },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: 14,
        borderRadius: BorderRadius.lg,
    },
    shareText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    hint: { fontSize: 12, textAlign: 'center' },
});
