import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useInventory } from '@/hooks/useInventory';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useState } from 'react';
import {
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
import * as XLSX from 'xlsx';

// Unit Options for selection
const UNIT_OPTIONS = [
    { label: 'Kilogramo', value: 'kg' },
    { label: 'Gramo', value: 'g' },
    { label: 'Litro', value: 'l' },
    { label: 'Mililitro', value: 'ml' },
    { label: 'Unidad', value: 'u' },
];

// InventoryCard component
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
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.quantity, { color: colors.primary }]}>
                            {item.quantity}
                        </Text>
                        <Text style={[styles.unit, { color: colors.textSecondary }]}>
                            {item.unit}
                        </Text>
                        <FontAwesome name="pencil" size={12} color={colors.textMuted} style={{ marginLeft: 6 }} />
                    </View>
                    {(item.costPerUnit || 0) > 0 && (
                        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                            ${item.costPerUnit?.toFixed(2)}/{item.unit}
                        </Text>
                    )}
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
            {
                item.minStock && (
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
                )
            }
        </View >
    );
}

export default function InventoryScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { inventory, loading, refreshing, onRefresh, fetchInventory, updateStock, setStock, addItem, updateItemDetails, importInventory, exportInventory, archiveItem, unarchiveItem } = useInventory();
    const [searchQuery, setSearchQuery] = useState('');
    const { showAlert } = useAlert();
    const { isPremium } = useSubscription();

    // Add Item Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('u');
    const [newItemMinStock, setNewItemMinStock] = useState('');
    const [newItemCost, setNewItemCost] = useState('');
    const [newItemTotalCost, setNewItemTotalCost] = useState(''); // Calculator helper

    // Purchase Logic State (Decoupled from Stock)
    const [buyingQty, setBuyingQty] = useState('');
    const [buyingPrice, setBuyingPrice] = useState('');
    const [buyingUnit, setBuyingUnit] = useState('kg'); // Default to larger unit

    // Auto-calculate Unit Cost when purchase params change
    const calculateUnitCost = (price: string, qty: string, bUnit: string, sUnit: string) => {
        const p = parseFloat(price.replace(',', '.'));
        const q = parseFloat(qty.replace(',', '.'));

        if (!isNaN(p) && !isNaN(q) && q > 0) {
            let conversion = 1;
            // Kg -> g
            if (bUnit === 'kg' && sUnit === 'g') conversion = 1000;
            // L -> ml
            else if (bUnit === 'l' && sUnit === 'ml') conversion = 1000;
            // g -> kg
            else if (bUnit === 'g' && sUnit === 'kg') conversion = 0.001;
            // ml -> l
            else if (bUnit === 'ml' && sUnit === 'l') conversion = 0.001;

            // Cost Per Storage Unit = Total Price / (Attributes * Conversion)
            const totalUnits = q * conversion;
            const cost = p / totalUnits;
            setNewItemCost(cost.toFixed(4));
        }
    };

    const handleBuyingChange = (field: 'qty' | 'price' | 'unit', value: string) => {
        let q = buyingQty;
        let p = buyingPrice;
        let b = buyingUnit;

        if (field === 'qty') { setBuyingQty(value); q = value; }
        if (field === 'price') { setBuyingPrice(value); p = value; }
        if (field === 'unit') { setBuyingUnit(value); b = value; }

        calculateUnitCost(p, q, b, newItemUnit);
    };

    // Keep this for compatibility if needed, but we rely on calculateUnitCost now
    const handleTotalCostChange = (text: string) => {
        setNewItemTotalCost(text);
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

    // Edit Item Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [editQuantity, setEditQuantity] = useState('');
    const [editUnit, setEditUnit] = useState('u');
    const [editCategory, setEditCategory] = useState('');
    const [editBoughtQty, setEditBoughtQty] = useState('');
    const [editBoughtPrice, setEditBoughtPrice] = useState('');

    // Archived Items State
    const [archivedItems, setArchivedItems] = useState<InventoryItem[]>([]);
    const [showArchived, setShowArchived] = useState(false);

    const fetchArchivedItems = async () => {
        try {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .eq('is_archived', true)
                .order('name', { ascending: true });
            if (error) throw error;
            setArchivedItems((data || []).map((item: any) => ({
                id: item.id,
                userId: item.user_id,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                minStock: item.min_stock,
                costPerUnit: item.cost_per_unit,
                category: item.category,
                isArchived: true,
                createdAt: item.created_at,
            })));
        } catch (error) {
            console.error('Error fetching archived items:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchInventory();
            fetchArchivedItems();
        }, [])
    );

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
        setEditUnit(item.unit || 'u');
        setEditCategory(item.category || '');
        setEditBoughtQty('');
        setEditBoughtPrice('');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        const newQty = parseInt(editQuantity);

        if (isNaN(newQty) || newQty < 0) {
            showAlert({ title: 'Error', message: 'Ingresa una cantidad válida', type: 'error' });
            return;
        }

        let success = true;
        const updates: any = {};

        // Check for changes
        if (newQty !== editingItem.quantity) {
            const qtySuccess = await setStock(editingItem.id, newQty);
            if (!qtySuccess) success = false;
        }

        if (editUnit !== editingItem.unit) {
            updates.unit = editUnit;
        }

        if (editCategory !== (editingItem.category || '')) {
            updates.category = editCategory;
        }

        // Calculate cost if purchase info was provided
        const boughtQty = parseFloat(editBoughtQty.replace(',', '.'));
        const boughtPrice = parseFloat(editBoughtPrice.replace(',', '.'));

        if (!isNaN(boughtQty) && !isNaN(boughtPrice) && boughtQty > 0) {
            updates.costPerUnit = boughtPrice / boughtQty;
        }

        // Save all updates together
        if (Object.keys(updates).length > 0) {
            const updateSuccess = await updateItemDetails(editingItem.id, updates);
            if (!updateSuccess) success = false;
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
        setBuyingQty('');
        setBuyingPrice('');
        setBuyingUnit('kg');
    };

    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            showAlert({ title: 'Error', message: 'El nombre es obligatorio', type: 'error' });
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
            showAlert({ title: 'Éxito', message: `"${newItemName}" agregado al inventario`, type: 'success' });
        }
    };

    const handleImportExcel = async () => {
        // Premium gate
        if (!isPremium) {
            showAlert({
                title: 'Función Premium',
                message: 'La importación desde Excel es exclusiva para usuarios Premium.\n\nSuscríbete para gestionar tu inventario de forma avanzada.',
                type: 'warning',
                buttons: [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Premium', onPress: () => router.push('/premium') }
                ]
            });
            return;
        }
        try {

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
                showAlert({ title: 'Error', message: 'El archivo parece estar vacío o no es válido.', type: 'error' });
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
                const cost = row['costo'] || row['Costo'] || row['precio'] || row['Precio'] || row['cost'] || row['price'] || row['costo_unitario'] || row['Costo Unitario'];

                if (!name) return null;

                return {
                    name: String(name),
                    quantity: quantity ? Number(quantity) : 0,
                    unit: unit ? String(unit) : undefined,
                    minStock: minStock ? Number(minStock) : undefined,
                    category: category ? String(category) : undefined,
                    costPerUnit: cost ? Number(cost) : undefined
                };
            }).filter(i => i !== null) as Partial<InventoryItem>[];

            if (itemsToImport.length === 0) {
                showAlert({ title: 'Error', message: 'No se encontraron columnas válidas (Nombre, Cantidad).', type: 'error' });
                return;
            }

            showAlert({
                title: 'Confirmar Importación',
                message: `Se encontraron ${itemsToImport.length} items. ¿Deseas importarlos?`,
                buttons: [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Importar',
                        onPress: async () => {
                            const result = await importInventory(itemsToImport);
                            if (result) {
                                showAlert({ title: 'Éxito', message: `Inventario actualizado. Agregados: ${result.added}, Actualizados: ${result.updated}`, type: 'success' });
                            }
                        }
                    }
                ]
            });

        } catch (error) {
            console.error('Import error:', error);
            showAlert({ title: 'Error', message: 'Hubo un problema al leer el archivo Excel.', type: 'error' });
        }
    };

    const handleExportExcel = async () => {
        // Premium gate
        if (!isPremium) {
            showAlert({
                title: 'Función Premium',
                message: 'La exportación a Excel es exclusiva para usuarios Premium.\n\nSuscríbete para exportar y analizar tu inventario.',
                type: 'warning',
                buttons: [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Premium', onPress: () => router.push('/premium') }
                ]
            });
            return;
        }
        try {
            const data = exportInventory();
            if (data.length === 0) {
                showAlert({ title: 'Info', message: 'No hay items para exportar.', type: 'info' });
                return;
            }

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

            const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
            const uri = FileSystem.documentDirectory + 'inventario.xlsx';
            await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Exportar Inventario',
                    UTI: 'com.microsoft.excel.xlsx',
                });
            } else {
                showAlert({ title: 'Éxito', message: `Se exportaron ${data.length} items.`, type: 'success' });
            }
        } catch (error) {
            console.error('Export error:', error);
            showAlert({ title: 'Error', message: 'Hubo un problema al exportar.', type: 'error' });
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statChip, { backgroundColor: showArchived ? colors.primary + '20' : colors.surface }]}>
                    <FontAwesome name="cubes" size={14} color={showArchived ? colors.textMuted : colors.primary} />
                    <Text style={[styles.statText, { color: showArchived ? colors.textMuted : colors.text }]}>
                        {inventory.length} items
                    </Text>
                </View>
                {lowStockCount > 0 && !showArchived && (
                    <View style={[styles.statChip, { backgroundColor: colors.error + '15' }]}>
                        <FontAwesome name="exclamation-triangle" size={14} color={colors.error} />
                        <Text style={[styles.statText, { color: colors.error }]}>
                            {lowStockCount} bajo stock
                        </Text>
                    </View>
                )}
                {archivedItems.length > 0 && (
                    <TouchableOpacity
                        style={[styles.statChip, { backgroundColor: showArchived ? colors.primary : colors.surface }]}
                        onPress={() => {
                            setShowArchived(!showArchived);
                        }}
                        activeOpacity={0.7}
                    >
                        <FontAwesome name="archive" size={12} color={showArchived ? '#FFF' : colors.textMuted} />
                        <Text style={[styles.statText, { color: showArchived ? '#FFF' : colors.textMuted }]}>
                            {archivedItems.length} archivado{archivedItems.length !== 1 ? 's' : ''}
                        </Text>
                    </TouchableOpacity>
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
                    style={[styles.importButton, { backgroundColor: colors.success, marginRight: 8 }]}
                    onPress={handleExportExcel}
                >
                    <FontAwesome name="download" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.importButton, { backgroundColor: colors.primary }]}
                    onPress={handleImportExcel}
                >
                    <FontAwesome name="file-excel-o" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Inventory List */}
            <FlatList
                data={showArchived ? archivedItems : filteredInventory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => showArchived ? (
                    <View style={[styles.archivedCard, { backgroundColor: colors.surface }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: '500', fontSize: 15 }}>{item.name}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{item.quantity} {item.unit}{item.category ? ` · ${item.category}` : ''}</Text>
                        </View>
                        <TouchableOpacity
                            style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.md }}
                            onPress={async () => {
                                const success = await unarchiveItem(item.id);
                                if (success) fetchArchivedItems();
                            }}
                        >
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Restaurar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
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
                onRefresh={() => {
                    onRefresh();
                    fetchArchivedItems();
                }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FontAwesome name={showArchived ? 'archive' : 'inbox'} size={48} color={loading ? colors.primary : colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            {loading ? 'Cargando...' : showArchived ? 'No hay productos archivados' : 'No hay ingredientes'}
                        </Text>
                    </View>
                }
            />



            {/* Floating Add Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }, Shadows.lg]}
                activeOpacity={0.85}
                onPress={() => router.push('/inventory/add')}
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
                    behavior={Platform.OS === 'ios' ? 'position' : undefined}
                    style={styles.modalOverlay}
                    keyboardVerticalOffset={-100}
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

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Name + Category Row */}
                            <View style={styles.inputRow}>
                                <View style={{ flex: 2 }}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre *</Text>
                                    <TextInput
                                        style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        placeholder="Ej: Harina de trigo"
                                        placeholderTextColor={colors.textMuted}
                                        value={newItemName}
                                        onChangeText={setNewItemName}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
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

                            {/* Purchase Section - THE MAIN INPUT */}
                            <View style={{ marginTop: 12, padding: 16, backgroundColor: colors.surfaceSecondary, borderRadius: 12 }}>
                                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>
                                    💰 Compré...
                                </Text>

                                {/* Quantity + Unit Row */}
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 0, marginBottom: 6 }]}>Cantidad</Text>
                                        <TextInput
                                            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                            placeholder="Ej: 1"
                                            placeholderTextColor={colors.textMuted}
                                            value={buyingQty}
                                            onChangeText={(t) => {
                                                setBuyingQty(t);
                                                // Also set the actual inventory quantity
                                                setNewItemQuantity(t);
                                            }}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 1.5 }}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 0, marginBottom: 6 }]}>Unidad</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                            {['kg', 'g', 'l', 'ml', 'u'].map((u) => (
                                                <TouchableOpacity
                                                    key={u}
                                                    onPress={() => {
                                                        setBuyingUnit(u);
                                                        setNewItemUnit(u);
                                                    }}
                                                    style={{
                                                        backgroundColor: buyingUnit === u ? colors.primary : colors.background,
                                                        paddingHorizontal: 14,
                                                        paddingVertical: 10,
                                                        borderRadius: 20,
                                                        borderWidth: 1,
                                                        borderColor: buyingUnit === u ? colors.primary : colors.border
                                                    }}
                                                >
                                                    <Text style={{ color: buyingUnit === u ? '#FFF' : colors.text, fontSize: 14, fontWeight: '600' }}>{u.toUpperCase()}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                {/* Price Row */}
                                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 0, marginBottom: 6 }]}>Pagué ($)</Text>
                                        <TextInput
                                            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                            placeholder="Ej: 5.00"
                                            placeholderTextColor={colors.textMuted}
                                            value={buyingPrice}
                                            onChangeText={(t) => {
                                                setBuyingPrice(t);
                                                // Calculate cost per unit
                                                const price = parseFloat(t.replace(',', '.'));
                                                const qty = parseFloat(buyingQty.replace(',', '.'));
                                                if (!isNaN(price) && !isNaN(qty) && qty > 0) {
                                                    setNewItemCost((price / qty).toFixed(4));
                                                }
                                            }}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'center', paddingTop: 20 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Costo por {buyingUnit.toUpperCase()}</Text>
                                        <Text style={{ color: colors.primary, fontSize: 22, fontWeight: 'bold' }}>
                                            ${buyingQty && buyingPrice ? (parseFloat(buyingPrice.replace(',', '.')) / parseFloat(buyingQty.replace(',', '.'))).toFixed(2) : '0.00'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Optional: Min Stock */}
                            <View style={{ marginTop: 12 }}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Stock mínimo (alerta)</Text>
                                <TextInput
                                    style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    placeholder="5"
                                    placeholderTextColor={colors.textMuted}
                                    value={newItemMinStock}
                                    onChangeText={setNewItemMinStock}
                                    keyboardType="numeric"
                                />
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.primary, flexDirection: 'row', gap: 8, marginTop: 12 }]}
                            onPress={handleAddItem}
                        >
                            <FontAwesome name="check" size={18} color="#FFFFFF" />
                            <Text style={styles.addButtonText}>Agregar</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Edit Item Modal */}
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
                        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 8 }]}>
                            {editingItem?.name}
                        </Text>

                        {/* Row 1: Cantidad + Unidad + Categoría */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            <View style={{ width: 80 }}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cant.</Text>
                                <TextInput
                                    style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlign: 'center', fontWeight: '600' }]}
                                    value={editQuantity}
                                    onChangeText={setEditQuantity}
                                    keyboardType="numeric"
                                    autoFocus={true}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Unidad</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                                    {UNIT_OPTIONS.map(opt => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[styles.unitPill, { backgroundColor: editUnit === opt.value ? colors.primary : colors.border }]}
                                            onPress={() => setEditUnit(opt.value)}
                                        >
                                            <Text style={{ color: editUnit === opt.value ? '#FFF' : colors.text, fontSize: 12 }}>{opt.value}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Categoría */}
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginBottom: 8 }]}
                            value={editCategory}
                            onChangeText={setEditCategory}
                            placeholder="Categoría"
                            placeholderTextColor={colors.textMuted}
                        />

                        {/* Actualizar costo - más compacto */}
                        <View style={{ padding: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 6, marginBottom: 8 }}>
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12, marginBottom: 4 }}>
                                💰 Costo: Compré ___ {editUnit} por $___
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                    style={[styles.modalInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, paddingVertical: 6 }]}
                                    value={editBoughtQty}
                                    onChangeText={setEditBoughtQty}
                                    keyboardType="numeric"
                                    placeholder="Cantidad"
                                    placeholderTextColor={colors.textMuted}
                                />
                                <TextInput
                                    style={[styles.modalInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, paddingVertical: 6 }]}
                                    value={editBoughtPrice}
                                    onChangeText={setEditBoughtPrice}
                                    keyboardType="numeric"
                                    placeholder="Precio $"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </View>

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

                        {/* Archive Button */}
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 8, borderRadius: BorderRadius.md, backgroundColor: colors.error + '15' }}
                            onPress={() => {
                                if (!editingItem) return;
                                const itemToArchive = editingItem;
                                // Close the edit modal FIRST so the alert is visible
                                setShowEditModal(false);
                                setEditingItem(null);
                                setTimeout(() => {
                                    showAlert({
                                        title: 'Archivar Producto',
                                        message: `¿Seguro que quieres archivar "${itemToArchive.name}"? Las recetas que lo usan mantendrán su costo. Podrás restaurarlo después.`,
                                        type: 'warning',
                                        buttons: [
                                            { text: 'Cancelar', style: 'cancel' },
                                            {
                                                text: 'Archivar',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    await archiveItem(itemToArchive.id);
                                                }
                                            }
                                        ]
                                    });
                                }, 300);
                            }}
                        >
                            <FontAwesome name="archive" size={14} color={colors.error} style={{ marginRight: 8 }} />
                            <Text style={{ color: colors.error, fontWeight: '600', fontSize: 14 }}>Archivar Producto</Text>
                        </TouchableOpacity>
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
        flexWrap: 'wrap',
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
        padding: Spacing.md,
        alignItems: 'center',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        height: 48,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontSize: 16,
    },
    importButton: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: Spacing.md,
        paddingTop: 0,
        paddingBottom: 100,
    },
    itemCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        ...Typography.bodyBold,
        marginBottom: 2,
    },
    itemCategory: {
        ...Typography.caption,
    },
    lowStockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 4,
    },
    lowStockText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    itemBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: Spacing.md,
    },
    quantitySection: {
        // padding: 4,
    },
    quantity: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    unit: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 4,
    },
    quickActions: {
        flexDirection: 'row',
        gap: 8,
    },
    quickButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stockIndicator: {
        gap: 4,
    },
    stockBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    stockFill: {
        height: '100%',
        borderRadius: 2,
    },
    stockText: {
        fontSize: 10,
        textAlign: 'right',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: Spacing.md,
    },
    emptyText: {
        ...Typography.body,
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
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: Spacing.lg,
        maxHeight: '90%',
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
        //
    },
    inputRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    inputLabel: {
        ...Typography.caption,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        height: 44,
        fontSize: 16,
    },
    addButton: {
        height: 50,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#FFFFFF',
        ...Typography.bodyBold,
        fontSize: 16,
    },
    editModalContent: {
        margin: 20,
        padding: 20,
        borderRadius: 20,
        // elevation: 5
    },
    unitPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    editModalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8
    },
    editModalButton: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    archivedCard: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        padding: Spacing.md,
        marginHorizontal: Spacing.md,
        marginBottom: 8,
        borderRadius: BorderRadius.lg,
    },
});
