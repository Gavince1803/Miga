import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { InventoryItem } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useInventory } from '@/hooks/useInventory';

// Mock inventory removed

function InventoryCard({
    item,
    colors,
    onQuickAdjust,
}: {
    item: InventoryItem;
    colors: typeof Colors.light;
    onQuickAdjust: (id: string, delta: number) => void;
}) {
    const isLowStock = item.minStock && item.quantity < item.minStock;
    const stockPercentage = item.minStock ? (item.quantity / item.minStock) * 100 : 100;

    let stockColor = colors.success;
    if (stockPercentage < 50) stockColor = colors.error;
    else if (stockPercentage < 100) stockColor = colors.warning;

    return (
        <View
            style={[
                styles.itemCard,
                { backgroundColor: colors.surface },
                Shadows.sm
            ]}
        >
            <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.text }]}>
                        {item.name}
                    </Text>
                    {item.category && (
                        <Text style={[styles.itemCategory, { color: colors.textMuted }]}>
                            {item.category}
                        </Text>
                    )}
                </View>

                {isLowStock && (
                    <View style={[styles.lowStockBadge, { backgroundColor: colors.error + '20' }]}>
                        <FontAwesome name="exclamation-triangle" size={12} color={colors.error} />
                        <Text style={[styles.lowStockText, { color: colors.error }]}>
                            Bajo
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.itemBody}>
                <View style={styles.quantitySection}>
                    <Text style={[styles.quantity, { color: colors.text }]}>
                        {item.quantity}
                    </Text>
                    <Text style={[styles.unit, { color: colors.textSecondary }]}>
                        {item.unit}
                    </Text>
                </View>

                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={[styles.quickButton, { backgroundColor: colors.error + '20' }]}
                        onPress={() => onQuickAdjust(item.id, -1)}
                    >
                        <FontAwesome name="minus" size={14} color={colors.error} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickButton, { backgroundColor: colors.success + '20' }]}
                        onPress={() => onQuickAdjust(item.id, 1)}
                    >
                        <FontAwesome name="plus" size={14} color={colors.success} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stock Level Indicator */}
            {item.minStock && (
                <View style={styles.stockIndicator}>
                    <View style={[styles.stockBar, { backgroundColor: colors.border }]}>
                        <View
                            style={[
                                styles.stockFill,
                                {
                                    width: `${Math.min(stockPercentage, 100)}%`,
                                    backgroundColor: stockColor
                                }
                            ]}
                        />
                    </View>
                    <Text style={[styles.stockText, { color: colors.textMuted }]}>
                        Mín: {item.minStock} {item.unit}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function InventoryScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { inventory, loading, refreshing, onRefresh, updateStock } = useInventory();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const lowStockCount = inventory.filter(
        item => item.minStock && item.quantity < item.minStock
    ).length;

    const handleQuickAdjust = (id: string, delta: number) => {
        updateStock(id, delta);
    };

    const handleImportExcel = () => {
        Alert.alert(
            'Importar Inventario',
            'Selecciona un archivo Excel (.xlsx) o CSV para importar tu inventario.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Seleccionar Archivo', onPress: () => {
                        // TODO: Implement file picker and xlsx parsing
                        Alert.alert('Próximamente', 'Esta función estará disponible pronto.');
                    }
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                    <FontAwesome name="cubes" size={14} color={colors.primary} />
                    <Text style={[styles.statText, { color: colors.text }]}>
                        {inventory.length} items
                    </Text>
                </View>
                {lowStockCount > 0 && (
                    <View style={[styles.statChip, { backgroundColor: colors.error + '15' }]}>
                        <FontAwesome name="exclamation-triangle" size={14} color={colors.error} />
                        <Text style={[styles.statText, { color: colors.error }]}>
                            {lowStockCount} bajo stock
                        </Text>
                    </View>
                )}
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <FontAwesome name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Buscar ingrediente..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.importButton, { backgroundColor: colors.primary }]}
                    onPress={handleImportExcel}
                >
                    <FontAwesome name="file-excel-o" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Inventory List */}
            <FlatList
                data={filteredInventory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <InventoryCard
                        item={item}
                        colors={colors}
                        onQuickAdjust={handleQuickAdjust}
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FontAwesome name="inbox" size={48} color={loading ? colors.primary : colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            {loading ? 'Cargando inventario...' : 'No hay ingredientes'}
                        </Text>
                    </View>
                }
            />

            {/* Floating Add Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }, Shadows.lg]}
                activeOpacity={0.85}
                onPress={() => Alert.alert('Agregar Ingrediente', 'Próximamente')}
            >
                <FontAwesome name="plus" size={24} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        gap: Spacing.sm,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        gap: 6,
    },
    statText: {
        ...Typography.caption,
        fontWeight: '500',
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
    },
    searchBar: {
        flex: 1,
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
    importButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: Spacing.md,
        paddingBottom: 100,
    },
    itemCard: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        ...Typography.bodyBold,
    },
    itemCategory: {
        ...Typography.small,
        marginTop: 2,
    },
    lowStockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    lowStockText: {
        ...Typography.small,
        fontWeight: '600',
    },
    itemBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quantitySection: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    quantity: {
        ...Typography.title,
        fontSize: 28,
    },
    unit: {
        ...Typography.body,
    },
    quickActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    quickButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stockIndicator: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    stockBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    stockFill: {
        height: '100%',
        borderRadius: 2,
    },
    stockText: {
        ...Typography.small,
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
        display: 'none',
    },
    fabLabel: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
