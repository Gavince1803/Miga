import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useHaptics } from '@/hooks/useHaptics';
import { useInventory } from '@/hooks/useInventory';
import { Recipe, useRecipes } from '@/hooks/useRecipes';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

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
    const { inventory } = useInventory();
    const router = useRouter();

    const hasInventory = inventory.length > 0;
    const hasRecipes = recipes.length > 0;

    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [notes, setNotes] = useState('');
    const [addingWithoutRecipe, setAddingWithoutRecipe] = useState(false);

    const haptics = useHaptics();

    const filteredRecipes = searchQuery
        ? recipes.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : recipes;

    const handleSelectRecipe = (recipe: Recipe) => {
        haptics.selection();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedRecipe(recipe);
        setProductName(recipe.title);
    };

    const handleAddProduct = () => {
        if (!productName.trim()) {
            haptics.error();
            return;
        }

        const newProduct: SelectedProduct = {
            productName: productName.trim(),
            recipeId: selectedRecipe?.id,
            recipeName: selectedRecipe?.title,
            quantity: parseInt(quantity) || 1,
            notes: notes.trim() || undefined
        };

        onProductsChange([...products, newProduct]);
        haptics.success();
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
        haptics.warning(); // or light impact
        const updated = [...products];
        updated.splice(index, 1);
        onProductsChange(updated);
    };

    const handleQuantityChange = (index: number, newQty: string) => {
        haptics.light();
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

            {/* Contextual hint */}
            {!hasInventory && !hasRecipes && (
                <View style={[styles.hint, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <FontAwesome name="info-circle" size={16} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.hintTitle, { color: colors.text }]}>
                            Activa el descuento automático de inventario
                        </Text>
                        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                            Para que los ingredientes se descuenten solos necesitas:
                        </Text>
                        <View style={styles.hintSteps}>
                            <Text style={[styles.hintStep, { color: colors.textSecondary }]}>① Agregar ingredientes al inventario</Text>
                            <Text style={[styles.hintStep, { color: colors.textSecondary }]}>② Crear una receta con esos ingredientes</Text>
                            <Text style={[styles.hintStep, { color: colors.textSecondary }]}>③ Vincular la receta a este pedido</Text>
                        </View>
                        <View style={styles.hintActions}>
                            <TouchableOpacity
                                style={[styles.hintBtn, { backgroundColor: colors.primary }]}
                                onPress={() => router.push('/inventory/add' as any)}
                            >
                                <Text style={styles.hintBtnText}>+ Inventario</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.hintBtn, { backgroundColor: colors.primary }]}
                                onPress={() => router.push('/recipes/new' as any)}
                            >
                                <Text style={styles.hintBtnText}>+ Receta</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {hasInventory && !hasRecipes && (
                <View style={[styles.hint, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <FontAwesome name="check-circle" size={16} color={colors.success} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.hintTitle, { color: colors.text }]}>
                            Ya tienes ingredientes cargados
                        </Text>
                        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                            Crea una receta con esos ingredientes para vincularla a este pedido y activar el descuento automático.
                        </Text>
                        <TouchableOpacity
                            style={[styles.hintBtn, { backgroundColor: colors.primary, alignSelf: 'flex-start', marginTop: Spacing.sm }]}
                            onPress={() => router.push('/recipes/new' as any)}
                        >
                            <Text style={styles.hintBtnText}>+ Crear Receta</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {hasRecipes && (
                <View style={[styles.hintSuccess, { backgroundColor: colors.success + '12' }]}>
                    <FontAwesome name="magic" size={13} color={colors.success} />
                    <Text style={[styles.hintSuccessText, { color: colors.success }]}>
                        Vincula una receta y el inventario se descontará automáticamente al marcar el pedido como pagado.
                    </Text>
                </View>
            )}

            {/* Add Button */}
            <TouchableOpacity
                style={[styles.addButton, { borderColor: colors.primary }]}
                onPress={() => setShowModal(true)}
            >
                <FontAwesome name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>
                    Agregar Preparación
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
                                {(selectedRecipe || addingWithoutRecipe) ? 'Detalles de la Preparación' : '¿Qué vas a preparar?'}
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
                                    autoFocus // Keep keyboard up by focusing this immediately
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
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
                                        placeholder="Buscar por nombre (ej: Torta de Chocolate)..."
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
                                        keyboardShouldPersistTaps="handled"
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
                                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                        setAddingWithoutRecipe(true);
                                        setProductName(searchQuery || '');
                                    }}
                                >
                                    <FontAwesome name="plus-circle" size={18} color={colors.textSecondary} />
                                    <Text style={[styles.noRecipeText, { color: colors.textSecondary }]}>
                                        No está en mi recetario (sin descuento automático)
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
        minHeight: 500, // Enforce a minimum height to prevent "jumping" from bottom
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
    hint: {
        flexDirection: 'row',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        marginBottom: Spacing.md,
    },
    hintTitle: {
        ...Typography.bodyBold,
        fontSize: 13,
        marginBottom: 4,
    },
    hintText: {
        fontSize: 12,
        lineHeight: 18,
    },
    hintSteps: {
        marginTop: Spacing.xs,
        gap: 2,
    },
    hintStep: {
        fontSize: 12,
        lineHeight: 20,
    },
    hintActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    hintBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    hintBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    hintSuccess: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
    },
    hintSuccessText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 17,
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
        paddingVertical: 12, // Use padding for vertical centering instead of fixed height
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        // height: 48, // Removed fixed height
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
