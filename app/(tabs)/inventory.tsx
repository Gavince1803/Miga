import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { InventoryItem, UNIT_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { useInventory } from '@/hooks/useInventory';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';

// Mock inventory removed

function InventoryCard({
    item,
    colors,
    onQuickAdjust,
    onEditQuantity,
}: {
    item: InventoryItem;
    colors: typeof Colors.light;
    onQuickAdjust: (id: string, delta: number) => void;
    onEditQuantity: (item: InventoryItem) => void;
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
                {/* Tap to edit quantity */}
                <TouchableOpacity
                    style={styles.quantitySection}
                    onPress={() => onEditQuantity(item)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.quantity, { color: colors.primary }]}>
                        {item.quantity}
                    </Text>
                    <Text style={[styles.unit, { color: colors.textSecondary }]}>
                        {item.unit}
                    </Text>
                    <FontAwesome name="pencil" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {/* Total Value Display */}
                    {(item.costPerUnit || 0) > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                            <FontAwesome name="tag" size={10} color={colors.textMuted} />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                                Total: ${(item.quantity * (item.costPerUnit || 0)).toFixed(2)}
                            </Text>
                        </View>
                    )}

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
    const { inventory, loading, refreshing, onRefresh, updateStock, setStock, addItem, updateItemDetails, importInventory } = useInventory();
    const [searchQuery, setSearchQuery] = useState('');

    // Add Item Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('u');
    const [newItemMinStock, setNewItemMinStock] = useState('');
    const [newItemCost, setNewItemCost] = useState('');
    const [newItemTotalCost, setNewItemTotalCost] = useState(''); // Calculator helper

    const handleTotalCostChange = (text: string) => {
        setNewItemTotalCost(text);
        const total = parseFloat(text.replace(',', '.'));
        const qty = parseFloat(newItemQuantity.replace(',', '.'));
        if (!isNaN(total) && !isNaN(qty) && qty > 0) {
            setNewItemCost((total / qty).toFixed(2));
        }
    };

    const handleQuantityChange = (text: string) => {
        setNewItemQuantity(text);
        const qty = parseFloat(text.replace(',', '.'));
        const total = parseFloat(newItemTotalCost.replace(',', '.'));
        if (!isNaN(total) && !isNaN(qty) && qty > 0) {
            setNewItemCost((total / qty).toFixed(2));
        }
    };
    const [newItemCategory, setNewItemCategory] = useState('');

    // Edit Item Modal State (for quick quantity edit)
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [editQuantity, setEditQuantity] = useState('');
    const [editCost, setEditCost] = useState('');

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

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setEditQuantity(String(item.quantity));
        setEditCost(String(item.costPerUnit || ''));
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        const newQty = parseInt(editQuantity);
        const newCost = parseFloat(editCost.replace(',', '.'));

        if (isNaN(newQty) || newQty < 0) {
            Alert.alert('Error', 'Ingresa una cantidad válida');
            return;
        }

        let success = true;

        // Update Quantity if changed
        if (newQty !== editingItem.quantity) {
            const qtySuccess = await setStock(editingItem.id, newQty);
            if (!qtySuccess) success = false;
        }

        // Update Cost if changed
        if (!isNaN(newCost) && newCost !== editingItem.costPerUnit) {
            const costSuccess = await updateItemDetails(editingItem.id, { costPerUnit: newCost });
            if (!costSuccess) success = false;
        }

        if (success) {
            setShowEditModal(false);
            setEditingItem(null);
        }
    };

    const resetAddForm = () => {
        setNewItemName('');
        setNewItemQuantity('');
        setNewItemUnit('u');
        setNewItemMinStock('');
        setNewItemCost('');
        setNewItemCategory('');
    };

    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            Alert.alert('Error', 'El nombre es obligatorio');
            return;
        }

        const success = await addItem({
            name: newItemName.trim(),
            quantity: parseInt(newItemQuantity) || 0,
            unit: newItemUnit || 'u',
            minStock: parseInt(newItemMinStock) || 5,
            costPerUnit: parseFloat(newItemCost) || 0,
            category: newItemCategory.trim() || 'General',
        });

        if (success) {
            setShowAddModal(false);
            resetAddForm();
            Alert.alert('Éxito', `"${newItemName}" agregado al inventario`);
        }
    };

    const handleImportExcel = async () => {
        try {
            console.log('Opening picker...');
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            const { uri } = result.assets[0];

            // Read file
            const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const workbook = XLSX.read(b64, { type: 'base64' });

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet);

            if (!data || data.length === 0) {
                Alert.alert('Error', 'El archivo parece estar vacío o no es válido.');
                return;
            }

            // Map columns loosely
            const itemsToImport = data.map((row: any) => {
                // Try to find keys
                const name = row['nombre'] || row['Nombre'] || row['producto'] || row['Producto'] || row['item'] || row['Item'] || row['name'];
                const quantity = row['cantidad'] || row['Cantidad'] || row['stock'] || row['Stock'] || row['qty'];
                const unit = row['unidad'] || row['Unidad'] || row['medida'] || row['Medida'] || row['unit'];
                const minStock = row['minimo'] || row['Minimo'] || row['stock_min'] || row['alerta'] || row['min'];
                const category = row['categoria'] || row['Categoria'] || row['category'];

                if (!name) return null;

                return {
                    name: String(name),
                    quantity: quantity ? Number(quantity) : 0,
                    unit: unit ? String(unit) : undefined,
                    minStock: minStock ? Number(minStock) : undefined,
                    category: category ? String(category) : undefined
                };
            }).filter(i => i !== null) as Partial<InventoryItem>[];

            if (itemsToImport.length === 0) {
                Alert.alert('Error', 'No se encontraron columnas válidas (Nombre, Cantidad).');
                return;
            }

            Alert.alert(
                'Confirmar Importación',
                `Se encontraron ${itemsToImport.length} items. ¿Deseas importarlos?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Importar',
                        onPress: async () => {
                            const result = await importInventory(itemsToImport);
                            if (result) {
                                Alert.alert('Éxito', `Inventario actualizado. Agregados: ${result.added}, Actualizados: ${result.updated}`);
                            }
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('Import error:', error);
            Alert.alert('Error', 'Hubo un problema al leer el archivo Excel.');
        }
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
                        onEditQuantity={openEditModal}
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
                onPress={() => setShowAddModal(true)}
            >
                <FontAwesome name="plus" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Add Item Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowAddModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                Nuevo Ingrediente
                            </Text>
                            <TouchableOpacity onPress={() => { setShowAddModal(false); resetAddForm(); }}>
                                <FontAwesome name="times" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre *</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="Ej: Harina de trigo"
                                placeholderTextColor={colors.textMuted}
                                value={newItemName}
                                onChangeText={setNewItemName}
                            />

                            <View style={styles.inputRow}>
                                <View style={styles.inputHalf}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cantidad</Text>
                                    <TextInput
                                        style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        placeholder="0"
                                        placeholderTextColor={colors.textMuted}
                                        value={newItemQuantity}
                                        onChangeText={handleQuantityChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Unidad</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                    {UNIT_OPTIONS.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() => setNewItemUnit(opt.value)}
                                            style={[
                                                styles.statChip,
                                                {
                                                    backgroundColor: newItemUnit === opt.value ? colors.primary : colors.surfaceSecondary,
                                                    paddingVertical: 8,
                                                    paddingHorizontal: 12
                                                }
                                            ]}
                                        >
                                            <Text style={{ color: newItemUnit === opt.value ? '#FFF' : colors.text, fontWeight: '600' }}>
                                                {opt.value}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.inputRow}>
                                <View style={styles.inputHalf}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Stock mínimo</Text>
                                    <TextInput
                                        style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        placeholder="5"
                                        placeholderTextColor={colors.textMuted}
                                        value={newItemMinStock}
                                        onChangeText={setNewItemMinStock}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.inputHalf}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Categoría</Text>
                                    <TextInput
                                        style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        placeholder="General"
                                        placeholderTextColor={colors.textMuted}
                                        value={newItemCategory}
                                        onChangeText={setNewItemCategory}
                                    />
                                </View>
                            </View>

                            <View style={[styles.inputRow, { alignItems: 'flex-end' }]}>
                                <View style={styles.inputHalf}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Costo Total Compra ($)</Text>
                                    <TextInput
                                        style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        placeholder="Ej: 5.00"
                                        placeholderTextColor={colors.textMuted}
                                        value={newItemTotalCost}
                                        onChangeText={handleTotalCostChange}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.inputHalf}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Costo Unitario ($)</Text>
                                    <TextInput
                                        style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                                        placeholder="Calculado..."
                                        placeholderTextColor={colors.textMuted}
                                        value={newItemCost}
                                        onChangeText={setNewItemCost}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.primary }]}
                            onPress={handleAddItem}
                        >
                            <FontAwesome name="check" size={18} color="#FFFFFF" />
                            <Text style={styles.addButtonText}>Agregar Ingrediente</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Edit Quantity Modal */}
            <Modal
                visible={showEditModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowEditModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.editModalContent, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: Spacing.md }]}>
                            {editingItem?.name}
                        </Text>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                            Nueva cantidad ({editingItem?.unit})
                        </Text>
                        <TextInput
                            style={[styles.modalInput, styles.editQuantityInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={editQuantity}
                            onChangeText={setEditQuantity}
                            keyboardType="numeric"
                            autoFocus={true}
                            selectTextOnFocus={true}
                        />

                        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>
                            Costo Unitario ($)
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={editCost}
                            onChangeText={setEditCost}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                        />
                        <View style={styles.editModalButtons}>
                            <TouchableOpacity
                                style={[styles.editModalButton, { backgroundColor: colors.border }]}
                                onPress={() => { setShowEditModal(false); setEditingItem(null); }}
                            >
                                <Text style={[styles.addButtonText, { color: colors.text }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.editModalButton, { backgroundColor: colors.primary }]}
                                onPress={handleSaveEdit}
                            >
                                <Text style={styles.addButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View >
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.xxl,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        ...Typography.title,
    },
    modalBody: {
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        ...Typography.small,
        marginBottom: Spacing.xs,
        marginTop: Spacing.md,
    },
    modalInput: {
        fontSize: 16, // Explicit font size, NO spread of Typography.body (avoids lineHeight conflict)
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        height: 48,
        paddingVertical: 0,
        textAlignVertical: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    inputHalf: {
        flex: 1,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
    },
    addButtonText: {
        color: '#FFFFFF',
        ...Typography.bodyBold,
    },
    // Edit Quantity Modal
    editModalContent: {
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
    },
    editQuantityInput: {
        fontSize: 20,
        paddingVertical: Spacing.sm,
        height: 48,
    },
    editModalButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.lg,
    },
    editModalButton: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
});
