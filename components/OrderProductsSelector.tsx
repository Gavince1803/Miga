import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { Recipe, useRecipes } from '@/hooks/useRecipes';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import {
    ActivityIndicator,
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

export type SelectedProduct = {
    productName: string;
    recipeId?: string;
    recipeName?: string;
    quantity: number;
    notes?: string;
};

type Props = {
    products: SelectedProduct[];
    onProductsChange: (products: SelectedProduct[]) => void;
};

export function OrderProductsSelector({ products, onProductsChange }: Props) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { recipes, loading: recipesLoading } = useRecipes();

    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [notes, setNotes] = useState('');
    const [addingWithoutRecipe, setAddingWithoutRecipe] = useState(false);

    const filteredRecipes = searchQuery
        ? recipes.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : recipes;

    const handleSelectRecipe = (recipe: Recipe) => {
        setSelectedRecipe(recipe);
        setProductName(recipe.title);
    };

    const handleAddProduct = () => {
        if (!productName.trim()) return;

        const newProduct: SelectedProduct = {
            productName: productName.trim(),
            recipeId: selectedRecipe?.id,
            recipeName: selectedRecipe?.title,
            quantity: parseInt(quantity) || 1,
            notes: notes.trim() || undefined
        };

        onProductsChange([...products, newProduct]);
        resetForm();
        setShowModal(false);
    };

    const resetForm = () => {
        setSelectedRecipe(null);
        setProductName('');
        setQuantity('1');
        setNotes('');
        setSearchQuery('');
        setAddingWithoutRecipe(false);
    };

    const handleRemoveProduct = (index: number) => {
        const updated = [...products];
        updated.splice(index, 1);
        onProductsChange(updated);
    };

    const handleQuantityChange = (index: number, newQty: string) => {
        const updated = [...products];
        updated[index].quantity = parseInt(newQty) || 1;
        onProductsChange(updated);
    };

    return (
        <View style={styles.container}>
            {/* Selected Products List */}
            {products.length > 0 && (
                <View style={styles.productsList}>
                    {products.map((product, index) => (
                        <View
                            key={index}
                            style={[styles.productCard, { backgroundColor: colors.surface }, Shadows.sm]}
                        >
                            <View style={styles.productInfo}>
                                <Text style={[styles.productName, { color: colors.text }]}>
                                    {product.productName}
                                </Text>
                                {product.recipeName && (
                                    <View style={[styles.recipeBadge, { backgroundColor: colors.primary + '15' }]}>
                                        <FontAwesome name="book" size={10} color={colors.primary} />
                                        <Text style={[styles.recipeBadgeText, { color: colors.primary }]}>
                                            Con receta
                                        </Text>
                                    </View>
                                )}
                                {product.notes && (
                                    <Text style={[styles.productNotes, { color: colors.textMuted }]} numberOfLines={1}>
                                        {product.notes}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.productActions}>
                                <View style={styles.quantityControl}>
                                    <TouchableOpacity
                                        onPress={() => handleQuantityChange(index, String(Math.max(1, product.quantity - 1)))}
                                        style={[styles.qtyBtn, { backgroundColor: colors.surfaceSecondary }]}
                                    >
                                        <FontAwesome name="minus" size={12} color={colors.text} />
                                    </TouchableOpacity>
                                    <Text style={[styles.qtyText, { color: colors.text }]}>{product.quantity}</Text>
                                    <TouchableOpacity
                                        onPress={() => handleQuantityChange(index, String(product.quantity + 1))}
                                        style={[styles.qtyBtn, { backgroundColor: colors.surfaceSecondary }]}
                                    >
                                        <FontAwesome name="plus" size={12} color={colors.text} />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveProduct(index)}>
                                    <FontAwesome name="trash-o" size={18} color={colors.error} />
                                </TouchableOpacity>
                            </View>
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
                    Agregar Producto
                </Text>
            </TouchableOpacity>

            <Modal
                visible={showModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => { setShowModal(false); resetForm(); }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {(selectedRecipe || addingWithoutRecipe) ? 'Detalles del Producto' : 'Seleccionar Receta'}
                            </Text>
                            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                                <FontAwesome name="times" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {(selectedRecipe || addingWithoutRecipe) ? (
                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {selectedRecipe && selectedRecipe.id && (
                                    <View style={[styles.selectedRecipeCard, { backgroundColor: colors.primary + '10' }]}>
                                        <FontAwesome name="book" size={20} color={colors.primary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.selectedRecipeName, { color: colors.text }]}>
                                                {selectedRecipe.title}
                                            </Text>
                                            <Text style={[styles.selectedRecipeHint, { color: colors.textMuted }]}>
                                                Los ingredientes se descontarán automáticamente
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {addingWithoutRecipe && (
                                    <View style={[styles.selectedRecipeCard, { backgroundColor: colors.warning + '10' }]}>
                                        <FontAwesome name="warning" size={20} color={colors.warning} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.selectedRecipeName, { color: colors.text }]}>
                                                Producto sin receta
                                            </Text>
                                            <Text style={[styles.selectedRecipeHint, { color: colors.textMuted }]}>
                                                El inventario no se descontará automáticamente
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre del producto</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={productName}
                                    onChangeText={setProductName}
                                    placeholder="Ej: Torta de Chocolate 20 personas"
                                    placeholderTextColor={colors.textMuted}
                                />

                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cantidad</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="numeric"
                                    placeholder="1"
                                    placeholderTextColor={colors.textMuted}
                                />

                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notas (opcional)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholder="Ej: Con decoración de flores"
                                    placeholderTextColor={colors.textMuted}
                                />

                                <TouchableOpacity
                                    style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                                    onPress={handleAddProduct}
                                >
                                    <Text style={styles.confirmButtonText}>Agregar al Pedido</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => {
                                        setSelectedRecipe(null);
                                        setAddingWithoutRecipe(false);
                                        setProductName('');
                                    }}
                                >
                                    <Text style={[styles.backButtonText, { color: colors.textMuted }]}>
                                        ← Volver a buscar
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        ) : (
                            /* Recipe Selection */
                            <>
                                <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <FontAwesome name="search" size={16} color={colors.textMuted} />
                                    <TextInput
                                        style={[styles.searchInput, { color: colors.text }]}
                                        placeholder="Buscar receta..."
                                        placeholderTextColor={colors.textMuted}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        autoFocus
                                    />
                                </View>

                                {recipesLoading ? (
                                    <View style={styles.emptyState}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                        <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: Spacing.sm }]}>
                                            Cargando recetas...
                                        </Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={filteredRecipes}
                                        keyExtractor={item => item.id}
                                        style={styles.list}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[styles.recipeItem, { borderBottomColor: colors.border }]}
                                                onPress={() => handleSelectRecipe(item)}
                                            >
                                                <View style={styles.recipeInfo}>
                                                    <Text style={[styles.recipeTitle, { color: colors.text }]}>
                                                        {item.title}
                                                    </Text>
                                                    {item.category && (
                                                        <Text style={[styles.recipeCategory, { color: colors.textMuted }]}>
                                                            {item.category}
                                                        </Text>
                                                    )}
                                                </View>
                                                <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
                                            </TouchableOpacity>
                                        )}
                                        ListEmptyComponent={
                                            <View style={styles.emptyState}>
                                                <FontAwesome name="book" size={32} color={colors.textMuted} />
                                                <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: Spacing.sm }]}>
                                                    {searchQuery ? 'No se encontraron recetas' : 'No tienes recetas aún'}
                                                </Text>
                                                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                                                    Ve al Recetario para crear una
                                                </Text>
                                            </View>
                                        }
                                    />
                                )}

                                {/* Quick add without recipe */}
                                <TouchableOpacity
                                    style={[styles.noRecipeButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                                    onPress={() => {
                                        setAddingWithoutRecipe(true);
                                        setProductName(searchQuery || '');
                                    }}
                                >
                                    <FontAwesome name="plus-circle" size={18} color={colors.textSecondary} />
                                    <Text style={[styles.noRecipeText, { color: colors.textSecondary }]}>
                                        Agregar producto sin receta
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
    productsList: {
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        ...Typography.bodyBold,
    },
    recipeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    recipeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    productNotes: {
        ...Typography.small,
        marginTop: 4,
    },
    productActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        ...Typography.bodyBold,
        minWidth: 20,
        textAlign: 'center',
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
        maxHeight: '85%',
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
    recipeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    recipeInfo: {
        flex: 1,
    },
    recipeTitle: {
        ...Typography.bodyBold,
    },
    recipeCategory: {
        ...Typography.small,
        marginTop: 2,
    },
    emptyState: {
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        textAlign: 'center',
    },
    emptyHint: {
        ...Typography.small,
        textAlign: 'center',
        marginTop: 4,
    },
    noRecipeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    noRecipeText: {
        ...Typography.body,
    },
    detailsForm: {
        gap: Spacing.sm,
    },
    selectedRecipeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    selectedRecipeName: {
        ...Typography.bodyBold,
    },
    selectedRecipeHint: {
        ...Typography.small,
        marginTop: 2,
    },
    inputLabel: {
        ...Typography.small,
        marginTop: Spacing.sm,
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
