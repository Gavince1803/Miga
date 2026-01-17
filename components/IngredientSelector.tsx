import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useInventory } from '@/hooks/useInventory';
import { InventoryItem, UNIT_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
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
    View,
} from 'react-native';

export type SelectedIngredient = {
    inventoryItemId: string;
    inventoryItemName: string;
    quantity: number;
    unit: string;
};

type Props = {
    selectedIngredients: SelectedIngredient[];
    onIngredientsChange: (ingredients: SelectedIngredient[]) => void;
};

export function IngredientSelector({ selectedIngredients, onIngredientsChange }: Props) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { inventory } = useInventory();
    const { showAlert } = useAlert();

    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('g');

    // For creating new ingredient
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newIngredientName, setNewIngredientName] = useState('');

    const haptics = useHaptics();

    // Filter inventory items not already selected
    const availableItems = inventory.filter(
        item => !selectedIngredients.some(sel => sel.inventoryItemId === item.id)
    );

    const filteredItems = searchQuery
        ? availableItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : availableItems;

    const handleSelectItem = (item: InventoryItem) => {
        haptics.selection();
        setSelectedItem(item);
        setUnit(item.unit);
        setQuantity('');
    };

    const handleAddIngredient = () => {
        if (!quantity || parseFloat(quantity) <= 0) {
            haptics.error();
            showAlert({ title: 'Error', message: 'Ingresa una cantidad válida', type: 'error' });
            return;
        }

        if (selectedItem) {
            // Adding from existing inventory
            const newIngredient: SelectedIngredient = {
                inventoryItemId: selectedItem.id,
                inventoryItemName: selectedItem.name,
                quantity: parseFloat(quantity),
                unit: unit
            };
            onIngredientsChange([...selectedIngredients, newIngredient]);
            haptics.success();
        } else if (newIngredientName.trim()) {
            // Create new ingredient (will be created when recipe is saved)
            const normalizedName = newIngredientName.trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

            // Check if this name already exists in inventory (case insensitive)
            const existsInInventory = inventory.find(
                item => item.name.toLowerCase() === normalizedName.toLowerCase()
            );

            if (existsInInventory) {
                haptics.warning();
                showAlert({
                    title: 'Ya existe',
                    message: `"${normalizedName}" ya está en tu inventario. Selecciónalo de la lista.`,
                    type: 'warning'
                });
                setSearchQuery(normalizedName);
                setShowCreateForm(false);
                return;
            }

            // Check if already in selected list
            const alreadySelected = selectedIngredients.find(
                ing => ing.inventoryItemName.toLowerCase() === normalizedName.toLowerCase()
            );

            if (alreadySelected) {
                haptics.error();
                showAlert({ title: 'Error', message: `"${normalizedName}" ya está agregado a esta receta.`, type: 'error' });
                return;
            }

            const newIngredient: SelectedIngredient = {
                inventoryItemId: `new:${normalizedName}`,
                inventoryItemName: normalizedName,
                quantity: parseFloat(quantity),
                unit: unit
            };
            onIngredientsChange([...selectedIngredients, newIngredient]);
            haptics.success();
        }

        // Reset and close modal
        setSelectedItem(null);
        setQuantity('');
        setSearchQuery('');
        setShowCreateForm(false);
        setNewIngredientName('');
        setShowModal(false);
    };

    const handleRemoveIngredient = (index: number) => {
        haptics.warning();
        const updated = [...selectedIngredients];
        updated.splice(index, 1);
        onIngredientsChange(updated);
    };

    const handleQuantityChange = (index: number, newQty: string) => {
        haptics.light();
        const updated = [...selectedIngredients];
        updated[index].quantity = parseFloat(newQty) || 0;
        onIngredientsChange(updated);
    };

    return (
        <View style={styles.container}>
            {/* Selected Ingredients List */}
            {selectedIngredients.length > 0 && (
                <View style={styles.selectedList}>
                    {selectedIngredients.map((ing, index) => (
                        <View
                            key={ing.inventoryItemId + '-' + index}
                            style={[styles.ingredientChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                            <View style={styles.ingredientInfo}>
                                <Text style={[styles.ingredientName, { color: colors.text }]} numberOfLines={1}>
                                    {ing.inventoryItemName}
                                </Text>
                                <View style={styles.quantityRow}>
                                    <TextInput
                                        style={[styles.quantityInput, { color: colors.primary, backgroundColor: colors.background, borderColor: colors.border }]}
                                        value={String(ing.quantity)}
                                        onChangeText={(val) => handleQuantityChange(index, val)}
                                        keyboardType="numeric"
                                    />
                                    <Text style={[styles.unitText, { color: colors.textSecondary }]}>
                                        {ing.unit}
                                    </Text>
                                    {ing.inventoryItemId.startsWith('new:') && (
                                        <View style={[styles.newBadge, { backgroundColor: colors.warning + '20' }]}>
                                            <Text style={[styles.newBadgeText, { color: colors.warning }]}>NUEVO</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleRemoveIngredient(index)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={styles.removeBtn}
                            >
                                <FontAwesome name="times-circle" size={22} color={colors.error} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* Add Button */}
            <TouchableOpacity
                style={[styles.addButton, { borderColor: colors.primary }]}
                onPress={() => setShowModal(true)}
            >
                <FontAwesome name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>
                    Agregar Ingrediente
                </Text>
            </TouchableOpacity>

            {/* Selection Modal */}
            <Modal
                visible={showModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {selectedItem ? 'Cantidad' : showCreateForm ? 'Nuevo Ingrediente' : 'Seleccionar Ingrediente'}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                setShowModal(false);
                                setSelectedItem(null);
                                setShowCreateForm(false);
                                setSearchQuery('');
                            }}>
                                <FontAwesome name="times" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* If item selected, show quantity input */}
                        {(selectedItem || showCreateForm) ? (
                            <ScrollView
                                style={styles.quantityForm}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {showCreateForm && (
                                    <>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                            Nombre del ingrediente
                                        </Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                            value={newIngredientName}
                                            onChangeText={setNewIngredientName}
                                            placeholder="Ej: Extracto de Vainilla"
                                            placeholderTextColor={colors.textMuted}
                                            autoFocus
                                        />
                                    </>
                                )}

                                {selectedItem && (
                                    <Text style={[styles.selectedItemLabel, { color: colors.text }]}>
                                        {selectedItem.name}
                                    </Text>
                                )}

                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                    Cantidad para la receta
                                </Text>
                                <View style={styles.quantityInputRow}>
                                    <TextInput
                                        style={[styles.input, styles.quantityInputLarge, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        value={quantity}
                                        onChangeText={setQuantity}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={colors.textMuted}
                                        autoFocus={!!selectedItem}
                                    />
                                    <View style={[styles.unitPicker, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                        {UNIT_OPTIONS.slice(0, 5).map(opt => (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[
                                                    styles.unitOption,
                                                    unit === opt.value && { backgroundColor: colors.primary + '20' }
                                                ]}
                                                onPress={() => setUnit(opt.value)}
                                            >
                                                <Text style={[
                                                    styles.unitOptionText,
                                                    { color: unit === opt.value ? colors.primary : colors.textSecondary }
                                                ]}>
                                                    {opt.value}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                                    onPress={handleAddIngredient}
                                    disabled={!quantity || parseFloat(quantity) <= 0}
                                >
                                    <Text style={styles.confirmButtonText}>Agregar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => {
                                        setSelectedItem(null);
                                        setShowCreateForm(false);
                                    }}
                                >
                                    <Text style={[styles.backButtonText, { color: colors.textMuted }]}>
                                        ← Volver a buscar
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        ) : (
                            <>
                                {/* Search */}
                                <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <FontAwesome name="search" size={16} color={colors.textMuted} />
                                    <TextInput
                                        style={[styles.searchInput, { color: colors.text }]}
                                        placeholder="Buscar en inventario..."
                                        placeholderTextColor={colors.textMuted}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        autoFocus
                                    />
                                </View>

                                {/* Inventory List */}
                                <FlatList
                                    keyboardShouldPersistTaps="handled"
                                    data={filteredItems}
                                    keyExtractor={item => item.id}
                                    style={styles.list}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.inventoryItem, { borderBottomColor: colors.border }]}
                                            onPress={() => handleSelectItem(item)}
                                        >
                                            <Text style={[styles.inventoryName, { color: colors.text }]}>
                                                {item.name}
                                            </Text>
                                            <Text style={[styles.inventoryStock, { color: colors.textMuted }]}>
                                                {item.quantity} {item.unit} disponibles
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                                {searchQuery ? 'No encontrado' : 'Inventario vacío'}
                                            </Text>
                                        </View>
                                    }
                                />

                                {/* Create New Option */}
                                <TouchableOpacity
                                    style={[styles.createNewButton, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
                                    onPress={() => {
                                        setNewIngredientName(searchQuery);
                                        setShowCreateForm(true);
                                    }}
                                >
                                    <FontAwesome name="plus-circle" size={20} color={colors.primary} />
                                    <Text style={[styles.createNewText, { color: colors.primary }]}>
                                        Crear "{searchQuery || 'nuevo ingrediente'}"
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: Spacing.sm,
    },
    selectedList: {
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    ingredientChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    ingredientInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    ingredientName: {
        ...Typography.bodyBold,
        fontSize: 15,
        marginBottom: 2,
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    quantityInput: {
        width: 55,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderWidth: 1,
        borderRadius: BorderRadius.sm,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    unitText: {
        ...Typography.body,
        fontSize: 14,
    },
    newBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        marginLeft: Spacing.xs,
    },
    newBadgeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    removeBtn: {
        padding: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        borderStyle: 'dashed',
        gap: Spacing.sm,
    },
    addButtonText: {
        ...Typography.bodyBold,
    },
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
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    modalTitle: {
        ...Typography.title,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    searchInput: {
        flex: 1,
        ...Typography.body,
    },
    list: {
        maxHeight: 250,
    },
    inventoryItem: {
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    inventoryName: {
        ...Typography.bodyBold,
    },
    inventoryStock: {
        ...Typography.small,
        marginTop: 2,
    },
    emptyState: {
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
    },
    createNewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    createNewText: {
        ...Typography.bodyBold,
    },
    quantityForm: {
        paddingVertical: Spacing.md,
    },
    inputLabel: {
        ...Typography.small,
        marginBottom: Spacing.xs,
        marginTop: Spacing.md,
    },
    input: {
        ...Typography.body,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        height: 44,
        textAlignVertical: 'center',
    },
    selectedItemLabel: {
        ...Typography.title,
        marginBottom: Spacing.md,
    },
    quantityInputRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    quantityInputLarge: {
        flex: 1,
        fontSize: 24,
        textAlign: 'center',
    },
    unitPicker: {
        flexDirection: 'row',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        overflow: 'hidden',
    },
    unitOption: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        minWidth: 40,
        alignItems: 'center',
    },
    unitOptionText: {
        ...Typography.bodyBold,
    },
    confirmButton: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        ...Typography.bodyBold,
    },
    backButton: {
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    backButtonText: {
        ...Typography.body,
    },
});
