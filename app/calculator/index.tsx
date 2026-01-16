import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useRecipes } from '@/hooks/useRecipes';
import { CostIngredient, RecipeCostConfig, UNIT_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Alert,
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

export default function CostCalculatorScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const params = useLocalSearchParams();

    // State for Recipe Name
    const [recipeName, setRecipeName] = useState(params.recipeName as string || '');
    const recipeId = params.recipeId as string | undefined;
    const [saving, setSaving] = useState(false);
    const { updateRecipePrice } = useRecipes();

    // State for Ingredients
    const [ingredients, setIngredients] = useState<CostIngredient[]>([]);
    const [isAddIngredientVisible, setIsAddIngredientVisible] = useState(false);

    // Load initial ingredients from params
    React.useEffect(() => {
        if (params.initialIngredients) {
            try {
                const initial = JSON.parse(params.initialIngredients as string);
                if (Array.isArray(initial)) {
                    setIngredients(initial);
                }
            } catch (e) {
                console.error("Failed to parse initial ingredients", e);
            }
        }
    }, [params.initialIngredients]);

    // New Ingredient Form State
    const [newIngName, setNewIngName] = useState('');
    const [newIngUsed, setNewIngUsed] = useState('');
    const [newIngBought, setNewIngBought] = useState('');
    const [newIngPrice, setNewIngPrice] = useState('');
    const [newIngUnit, setNewIngUnit] = useState('g');
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

    // State for Config
    const [config, setConfig] = useState<RecipeCostConfig>({
        laborPercentage: 30,
        utilityCost: 0,
        packagingCost: 0,
        wastePercentage: 5,
        profitPercentage: 30,
        portions: 12,
    });

    // Helper to calculate cost for a single ingredient
    const calculateIngredientCost = (ing: CostIngredient) => {
        if (ing.quantityBought === 0) return 0;
        const pricePerUnit = ing.priceBought / ing.quantityBought;
        return pricePerUnit * ing.quantityUsed;
    };

    // Calculate Totals
    const totals = useMemo(() => {
        const ingredientsCost = ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0);

        // Waste (Merma) is often applied to ingredients cost
        const wasteCost = ingredientsCost * (config.wastePercentage / 100);

        // Labor is often % of ingredients (or fixed, but prompt said % in screenshot analysis)
        // Let's assume % of ingredients + waste for now as per typical bakery logic
        // Or it could be % of TOTAL production cost. 
        // Based on "Casi Trozos" style simplocity, let's apply Labor % to (Ingredients + Waste)
        const productionBase = ingredientsCost + wasteCost;
        const laborCost = productionBase * (config.laborPercentage / 100);

        const subtotal = productionBase + laborCost + Number(config.utilityCost) + Number(config.packagingCost);

        const profitAmount = subtotal * (config.profitPercentage / 100);
        const totalSuggestedPrice = subtotal + profitAmount;
        const pricePerPortion = config.portions > 0 ? totalSuggestedPrice / config.portions : 0;

        return {
            ingredientsCost,
            wasteCost,
            laborCost,
            subtotal, // Total Cost
            profitAmount,
            totalSuggestedPrice,
            pricePerPortion
        };
    }, [ingredients, config]);

    const handleAddIngredient = () => {
        if (!newIngName || !newIngUsed || !newIngBought || !newIngPrice) {
            Alert.alert('Error', 'Por favor completa todos los campos del ingrediente');
            return;
        }

        const newIngredient: CostIngredient = {
            id: Date.now().toString(),
            name: newIngName,
            quantityUsed: parseFloat(newIngUsed),
            quantityBought: parseFloat(newIngBought),
            priceBought: parseFloat(newIngPrice),
            unit: newIngUnit,
        };

        setIngredients([...ingredients, newIngredient]);

        // Reset form
        setNewIngName('');
        setNewIngUsed('');
        setNewIngBought('');
        setNewIngPrice('');
        setIsAddIngredientVisible(false);
    };

    const handleSavePrice = async () => {
        if (!recipeId) {
            Alert.alert('Info', 'Este cálculo no está vinculado a una receta guardada.');
            return;
        }
        setSaving(true);
        const success = await updateRecipePrice(
            recipeId,
            totals.totalSuggestedPrice,
            totals.pricePerPortion
        );
        setSaving(false);
        if (success) {
            Alert.alert('Éxito', 'Precio guardado en la receta');
        }
    };

    const handleDeleteIngredient = (id: string) => {
        setIngredients(ingredients.filter(i => i.id !== id));
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Calculadora de Costos',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

                    {/* Header Input */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.text }]}>Nombre de la Receta</Text>
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: colors.surface,
                                color: colors.text,
                                borderColor: colors.border
                            }]}
                            placeholder="Ej. Torta de Chocolate"
                            placeholderTextColor={colors.textMuted}
                            value={recipeName}
                            onChangeText={setRecipeName}
                        />
                    </View>

                    {/* Ingredients Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Ingredientes</Text>
                            <TouchableOpacity onPress={() => setIsAddIngredientVisible(true)}>
                                <Text style={[styles.actionText, { color: colors.primary }]}>+ Agregar</Text>
                            </TouchableOpacity>
                        </View>

                        {ingredients.length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                    No hay ingredientes agregados
                                </Text>
                            </View>
                        ) : (
                            ingredients.map((ing) => (
                                <View key={ing.id} style={[styles.ingredientRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.ingredientName, { color: colors.text }]}>{ing.name}</Text>
                                        <Text style={[styles.ingredientDetail, { color: colors.textSecondary }]}>
                                            Uso: {ing.quantityUsed} {ing.unit} | Compra: {ing.quantityBought} {ing.unit} (${ing.priceBought})
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', marginRight: Spacing.sm }}>
                                        <Text style={[styles.ingredientCost, { color: colors.text }]}>
                                            ${calculateIngredientCost(ing).toFixed(2)}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteIngredient(ing.id)} style={{ padding: 4 }}>
                                        <FontAwesome name="trash" size={16} color={colors.error} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Additional Costs Grid */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Costos Adicionales</Text>
                        <View style={styles.gridContainer}>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Mano de Obra (%)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.laborPercentage.toString()}
                                    onChangeText={(t) => setConfig({ ...config, laborPercentage: parseFloat(t) || 0 })}
                                />
                            </View>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Merma (%)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.wastePercentage.toString()}
                                    onChangeText={(t) => setConfig({ ...config, wastePercentage: parseFloat(t) || 0 })}
                                />
                            </View>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Servicios ($)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.utilityCost.toString()}
                                    onChangeText={(t) => setConfig({ ...config, utilityCost: parseFloat(t) || 0 })}
                                />
                            </View>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Empaque ($)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.packagingCost.toString()}
                                    onChangeText={(t) => setConfig({ ...config, packagingCost: parseFloat(t) || 0 })}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Pricing Config */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Configuración de Precio</Text>
                        <View style={styles.gridContainer}>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Ganancia Deseada (%)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.profitPercentage.toString()}
                                    onChangeText={(t) => setConfig({ ...config, profitPercentage: parseFloat(t) || 0 })}
                                />
                            </View>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Porciones</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.portions.toString()}
                                    onChangeText={(t) => setConfig({ ...config, portions: parseFloat(t) || 0 })}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Sticky Summary */}
                <View style={[styles.summaryContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }, Shadows.md]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Costo Total</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>${totals.subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ganancia ({config.profitPercentage}%)</Text>
                        <Text style={[styles.summaryValue, { color: colors.success }]}>${totals.profitAmount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRowMain}>
                        <View>
                            <Text style={[styles.summaryMainLabel, { color: colors.textSecondary }]}>Precio Sugerido</Text>
                            <Text style={[styles.summarySubLabel, { color: colors.textMuted }]}>por porción</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.summaryMainValue, { color: colors.primary }]}>${totals.totalSuggestedPrice.toFixed(2)}</Text>
                            <Text style={[styles.summarySubValue, { color: colors.text }]}>${totals.pricePerPortion.toFixed(2)} / ud</Text>
                        </View>
                    </View>
                    {recipeId && (
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.success }]}
                            onPress={handleSavePrice}
                            disabled={saving}
                        >
                            <FontAwesome name="save" size={18} color="#FFF" />
                            <Text style={styles.saveButtonText}>
                                {saving ? 'Guardando...' : 'Guardar en Receta'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Add Ingredient Modal */}
            <Modal
                visible={isAddIngredientVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsAddIngredientVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Agregar Ingrediente</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, marginBottom: 16 }]}
                            placeholder="Nombre (ej. Harina)"
                            placeholderTextColor={colors.textMuted}
                            value={newIngName}
                            onChangeText={setNewIngName}
                            autoFocus
                        />

                        {/* Quantity & Unit Row */}
                        <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Cantidad Usada</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textMuted}
                                        value={newIngUsed}
                                        onChangeText={setNewIngUsed}
                                    />
                                </View>
                                <View style={{ flex: 1, zIndex: 10 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Unidad</Text>
                                    <TouchableOpacity
                                        style={[styles.input, {
                                            backgroundColor: colors.surface,
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }]}
                                        onPress={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                                    >
                                        <Text style={{ color: colors.text }}>{newIngUnit}</Text>
                                        <FontAwesome name={isUnitDropdownOpen ? "chevron-up" : "chevron-down"} size={12} color={colors.textMuted} />
                                    </TouchableOpacity>

                                    {isUnitDropdownOpen && (
                                        <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                                {UNIT_OPTIONS.map((opt) => (
                                                    <TouchableOpacity
                                                        key={opt.value}
                                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                                        onPress={() => {
                                                            setNewIngUnit(opt.value);
                                                            setIsUnitDropdownOpen(false);
                                                        }}
                                                    >
                                                        <Text style={{ color: colors.text }}>{opt.label} ({opt.value})</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, zIndex: 1 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Cant. Compra ({newIngUnit})</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textMuted}
                                        value={newIngBought}
                                        onChangeText={setNewIngBought}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Precio Compra ($)</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textMuted}
                                        value={newIngPrice}
                                        onChangeText={setNewIngPrice}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.surface }]}
                                onPress={() => setIsAddIngredientVisible(false)}
                            >
                                <Text style={{ color: colors.text }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleAddIngredient}
                            >
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Agregar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.md,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    label: {
        ...Typography.caption,
        marginBottom: Spacing.xs,
        marginLeft: 4,
    },
    input: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: 'transparent',
        fontSize: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        ...Typography.bodyBold,
        fontSize: 18,
    },
    actionText: {
        ...Typography.body,
        fontWeight: '600',
    },
    emptyState: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        fontStyle: 'italic',
    },
    ingredientRow: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    ingredientName: {
        ...Typography.bodyBold,
    },
    ingredientDetail: {
        ...Typography.caption,
        marginTop: 2,
    },
    ingredientCost: {
        ...Typography.bodyBold,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    gridItem: {
        flex: 1,
        minWidth: '45%',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    gridLabel: {
        ...Typography.caption,
        marginBottom: 4,
    },
    gridInput: {
        ...Typography.bodyBold,
        fontSize: 18,
        padding: 0,
    },
    summaryContainer: {
        padding: Spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
        borderTopWidth: 1,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        ...Typography.body,
    },
    summaryValue: {
        ...Typography.bodyBold,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: Spacing.sm,
    },
    summaryRowMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryMainLabel: {
        ...Typography.subtitle,
        fontSize: 20,
    },
    summarySubLabel: {
        ...Typography.caption,
    },
    summaryMainValue: {
        ...Typography.title,
        fontSize: 28,
    },
    summarySubValue: {
        ...Typography.body,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
    },
    modalTitle: {
        ...Typography.subtitle,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.xl,
    },
    modalButton: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        marginTop: 4,
        zIndex: 1000,
        elevation: 5,
    },
    dropdownItem: {
        padding: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: Spacing.md,
        marginTop: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
});
