import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { RecipeIngredient, useRecipeIngredients } from '@/hooks/useRecipeIngredients';
import { Recipe, useRecipes } from '@/hooks/useRecipes';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function RecipeDetailScreen() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { getRecipeById, deleteRecipe } = useRecipes();
    const { getIngredientsForRecipe } = useRecipeIngredients();
    const { showAlert } = useAlert();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [linkedIngredients, setLinkedIngredients] = useState<RecipeIngredient[]>([]);
    const [loading, setLoading] = useState(true);

    // Scaling calculator state
    const [scalingActive, setScalingActive] = useState(false);
    const [basePortions, setBasePortions] = useState('12');
    const [targetPortions, setTargetPortions] = useState('12');

    useEffect(() => {
        if (id) {
            loadRecipe();
        }
    }, [id]);

    const loadRecipe = async () => {
        if (typeof id !== 'string') return;
        setLoading(true);
        const data = await getRecipeById(id);
        setRecipe(data);

        // Also load linked ingredients
        const ingredients = await getIngredientsForRecipe(id);
        setLinkedIngredients(ingredients);

        setLoading(false);
    };

    const handleShare = async () => {
        if (!recipe) return;
        try {
            let message = `🧁 ${recipe.title.toUpperCase()}\n`;
            if (recipe.category) message += `${recipe.category}\n`;

            message += `\n📋 INGREDIENTES:\n`;

            if (linkedIngredients.length > 0) {
                linkedIngredients.forEach(ing => {
                    message += `• ${ing.quantity} ${ing.unit} ${ing.inventoryItem?.name || 'Ingrediente'}\n`;
                });
            }

            if (recipe.ingredients) {
                if (linkedIngredients.length > 0) message += `\nNotas:\n`;
                message += `${recipe.ingredients}\n`;
            }

            message += `\n👨‍🍳 PREPARACIÓN:\n`;
            message += recipe.steps ? recipe.steps : 'Sin instrucciones';

            await Share.share({
                message,
                title: `Receta: ${recipe.title}`
            });
        } catch (error: any) {
            showAlert({ title: 'Error', message: error.message, type: 'error' });
        }
    };

    const handleDelete = () => {
        showAlert({
            title: 'Eliminar Receta',
            message: '¿Estás seguro que quieres eliminar esta receta?',
            type: 'warning',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        if (recipe) {
                            await deleteRecipe(recipe.id);
                            router.back();
                        }
                    }
                }
            ]
        });
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!recipe) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.text }}>No se encontró la receta</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    headerTitle: '',
                    headerTransparent: true,
                    headerTintColor: recipe.imageUrl ? '#FFF' : colors.tint,
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    // Serialize ingredients for URL
                                    const initialIngredients = linkedIngredients.map(ing => {
                                        let quantityUsed = ing.quantity;
                                        let recipeUnit = ing.unit;

                                        const inventoryItem = ing.inventoryItem;
                                        let costPerUnit = inventoryItem?.costPerUnit || 0;
                                        let inventoryUnit = inventoryItem?.unit || 'u';

                                        // Normalize Cost to match Recipe Unit logic
                                        // Calculator: (priceBought / quantityBought) * quantityUsed
                                        // We set quantityBought = 1.
                                        // So we need priceBought to be "Price per 1 Recipe Unit".

                                        let effectivePrice = costPerUnit;

                                        // Basic Conversion KG <-> G, L <-> ML
                                        if (recipeUnit !== inventoryUnit) {
                                            if ((inventoryUnit === 'kg' && recipeUnit === 'g') || (inventoryUnit === 'l' && recipeUnit === 'ml')) {
                                                // Cost is per kg. We need cost per g.
                                                effectivePrice = costPerUnit / 1000;
                                            } else if ((inventoryUnit === 'g' && recipeUnit === 'kg') || (inventoryUnit === 'ml' && recipeUnit === 'l')) {
                                                // Cost is per g. We need cost per kg.
                                                effectivePrice = costPerUnit * 1000;
                                            }
                                            // Other conversions ignored for MVP
                                        }

                                        // Smart Scaling for Small Units (g, ml)
                                        // Instead of showing "1 g for $0.005", show "1000 g for $5.00"
                                        // This solves the $0.00 display issue and is more intuitive (thinking in KG/L).
                                        let displayQuantityBought = 1;
                                        let displayPriceBought = effectivePrice;

                                        if (recipeUnit === 'g' || recipeUnit === 'ml') {
                                            displayQuantityBought = 1000;
                                            displayPriceBought = effectivePrice * 1000;
                                        }

                                        return {
                                            id: Date.now().toString() + Math.random(),
                                            name: inventoryItem?.name || 'Ingrediente',
                                            quantityUsed: quantityUsed,
                                            quantityBought: displayQuantityBought,
                                            priceBought: displayPriceBought,
                                            unit: recipeUnit
                                        };
                                    });

                                    router.push({
                                        pathname: '/calculator',
                                        params: {
                                            recipeId: recipe.id,
                                            recipeName: recipe.title,
                                            initialIngredients: JSON.stringify(initialIngredients)
                                        }
                                    });
                                }}
                                style={styles.headerBtn}
                            >
                                <FontAwesome name="calculator" size={20} color={recipe.imageUrl ? '#FFF' : colors.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
                                <FontAwesome name="share-alt" size={20} color={recipe.imageUrl ? '#FFF' : colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push(`/recipes/edit?id=${recipe.id}`)} style={styles.headerBtn}>
                                <FontAwesome name="pencil" size={20} color={recipe.imageUrl ? '#FFF' : colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
                                <FontAwesome name="trash" size={20} color={recipe.imageUrl ? '#FFF' : colors.error} />
                            </TouchableOpacity>
                        </View>
                    )
                }}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Hero Image */}
                <View style={styles.imageContainer}>
                    {recipe.imageUrl ? (
                        <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.placeholderHero, { backgroundColor: colors.surfaceSecondary }]}>
                            <FontAwesome name="book" size={64} color={colors.textMuted} />
                        </View>
                    )}
                    {/* Gradient Overlay for text readability if needed, or just design choice */}
                    <View style={styles.imageOverlay} />
                </View>

                {/* Content Card - "The Paper Page" */}
                <View style={[styles.contentCard, { backgroundColor: colors.surface }, Shadows.lg]}>

                    {/* Header Info */}
                    <View style={styles.headerSection}>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            {recipe.category && (
                                <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.badgeText, { color: colors.primary }]}>{recipe.category.toUpperCase()}</Text>
                                </View>
                            )}
                            {recipe.suggestedPrice && recipe.suggestedPrice > 0 && (
                                <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                                    <FontAwesome name="tag" size={10} color={colors.success} />
                                    <Text style={[styles.badgeText, { color: colors.success, marginLeft: 4 }]}>
                                        Venta: ${recipe.suggestedPrice.toFixed(2)}
                                    </Text>
                                </View>
                            )}

                            {recipe.costPerPortion && recipe.costPerPortion > 0 && (
                                <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
                                    <FontAwesome name="pie-chart" size={10} color={colors.warning} />
                                    <Text style={[styles.badgeText, { color: colors.warning, marginLeft: 4 }]}>
                                        Costo: ${recipe.costPerPortion.toFixed(2)}/ud
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>

                        <View style={styles.metaRow}>
                            <FontAwesome name="clock-o" size={14} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>Agregada el {new Date(recipe.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Linked Ingredients from Inventory */}
                    {linkedIngredients.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <FontAwesome name="cubes" size={18} color={colors.success} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredientes del Inventario</Text>
                            </View>
                            <View style={[styles.linkedIngredientsGrid]}>
                                {linkedIngredients.map((ing) => (
                                    <View key={ing.id} style={[styles.linkedIngredientChip, { backgroundColor: colors.surfaceSecondary }]}>
                                        <Text style={[styles.linkedIngredientQty, { color: colors.primary }]}>
                                            {ing.quantity} {ing.unit}
                                        </Text>
                                        <Text style={[styles.linkedIngredientName, { color: colors.text }]}>
                                            {ing.inventoryItem?.name || 'Ingrediente'}
                                        </Text>
                                        {ing.inventoryItem?.isArchived && (
                                            <View style={[styles.lowStockWarning, { backgroundColor: colors.warning + '20' }]}>
                                                <FontAwesome name="archive" size={10} color={colors.warning} />
                                                <Text style={[styles.lowStockText, { color: colors.warning }]}>Archivado</Text>
                                            </View>
                                        )}
                                        {ing.inventoryItem && ing.inventoryItem.quantity < ing.quantity && (
                                            <View style={[styles.lowStockWarning, { backgroundColor: colors.error + '20' }]}>
                                                <FontAwesome name="exclamation-triangle" size={10} color={colors.error} />
                                                <Text style={[styles.lowStockText, { color: colors.error }]}>Bajo stock</Text>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Scaling Calculator */}
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => setScalingActive(!scalingActive)}
                        >
                            <FontAwesome name="balance-scale" size={18} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text, flex: 1 }]}>Calculadora de Escalado</Text>
                            <FontAwesome
                                name={scalingActive ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                color={colors.textMuted}
                            />
                        </TouchableOpacity>

                        {scalingActive && (linkedIngredients.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md }}>
                                <FontAwesome name="cubes" size={36} color={colors.textMuted} />
                                <Text style={{ ...Typography.body, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.sm }}>
                                    Añade ingredientes del inventario a esta receta para usar la calculadora de escalado.
                                </Text>
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginTop: Spacing.md,
                                        backgroundColor: colors.primary + '15',
                                        paddingHorizontal: 16,
                                        paddingVertical: 10,
                                        borderRadius: BorderRadius.md,
                                    }}
                                    onPress={() => router.push(`/recipes/edit?id=${recipe.id}`)}
                                >
                                    <FontAwesome name="pencil" size={14} color={colors.primary} />
                                    <Text style={{ ...Typography.bodyBold, color: colors.primary }}>Editar Receta</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (() => {
                            const base = parseFloat(basePortions) || 1;
                            const target = parseFloat(targetPortions) || 1;
                            const multiplier = target / base;

                            return (
                                <View>
                                    {/* Portion Inputs */}
                                    <View style={[styles.scalingInputRow, { backgroundColor: colors.surfaceSecondary, borderRadius: BorderRadius.md }]}>
                                        <View style={styles.scalingInputColumn}>
                                            <Text style={[styles.scalingInputLabel, { color: colors.textMuted }]}>Receta para</Text>
                                            <View style={[styles.scalingInputBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                                <TextInput
                                                    style={[styles.scalingInput, { color: colors.text }]}
                                                    value={basePortions}
                                                    onChangeText={setBasePortions}
                                                    keyboardType="numeric"
                                                    selectTextOnFocus
                                                />
                                                <Text style={[styles.scalingUnit, { color: colors.textMuted }]}>porc.</Text>
                                            </View>
                                        </View>

                                        <View style={styles.scalingArrow}>
                                            <FontAwesome name="long-arrow-right" size={20} color={colors.primary} />
                                        </View>

                                        <View style={styles.scalingInputColumn}>
                                            <Text style={[styles.scalingInputLabel, { color: colors.textMuted }]}>Necesito para</Text>
                                            <View style={[styles.scalingInputBox, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
                                                <TextInput
                                                    style={[styles.scalingInput, { color: colors.primary, fontWeight: '700' }]}
                                                    value={targetPortions}
                                                    onChangeText={setTargetPortions}
                                                    keyboardType="numeric"
                                                    selectTextOnFocus
                                                />
                                                <Text style={[styles.scalingUnit, { color: colors.primary }]}>porc.</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Multiplier Badge */}
                                    {multiplier !== 1 && (
                                        <View style={[styles.multiplierBadge, { backgroundColor: colors.primary + '15' }]}>
                                            <FontAwesome name="times" size={12} color={colors.primary} />
                                            <Text style={[styles.multiplierText, { color: colors.primary }]}>
                                                {multiplier.toFixed(2)}x
                                            </Text>
                                        </View>
                                    )}

                                    {/* Scaled Ingredients Table */}
                                    <View style={[styles.scaledTable, { borderColor: colors.border }]}>
                                        <View style={[styles.scaledTableHeader, { backgroundColor: colors.surfaceSecondary }]}>
                                            <Text style={[styles.scaledTableHeaderText, { color: colors.textMuted, flex: 2 }]}>Ingrediente</Text>
                                            <Text style={[styles.scaledTableHeaderText, { color: colors.textMuted, flex: 1, textAlign: 'center' }]}>Original</Text>
                                            <Text style={[styles.scaledTableHeaderText, { color: colors.primary, flex: 1, textAlign: 'center', fontWeight: '700' }]}>Escalado</Text>
                                        </View>
                                        {linkedIngredients.map((ing) => {
                                            const scaled = ing.quantity * multiplier;
                                            const displayScaled = scaled >= 1000 && (ing.unit === 'g' || ing.unit === 'ml')
                                                ? `${(scaled / 1000).toFixed(2)} ${ing.unit === 'g' ? 'kg' : 'L'}`
                                                : `${scaled % 1 === 0 ? scaled : scaled.toFixed(1)} ${ing.unit}`;

                                            return (
                                                <View key={ing.id} style={[styles.scaledTableRow, { borderBottomColor: colors.border }]}>
                                                    <Text style={[styles.scaledIngName, { color: colors.text }]} numberOfLines={1}>
                                                        {ing.inventoryItem?.name || 'Ingrediente'}
                                                    </Text>
                                                    <Text style={[styles.scaledIngOriginal, { color: colors.textMuted }]}>
                                                        {ing.quantity} {ing.unit}
                                                    </Text>
                                                    <Text style={[styles.scaledIngScaled, { color: multiplier !== 1 ? colors.primary : colors.text }]}>
                                                        {displayScaled}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* Scaled Cost */}
                                    {linkedIngredients.some(ing => ing.inventoryItem?.costPerUnit) && (() => {
                                        const totalCost = linkedIngredients.reduce((sum, ing) => {
                                            const cost = ing.inventoryItem?.costPerUnit || 0;
                                            return sum + (ing.quantity * cost * multiplier);
                                        }, 0);
                                        return (
                                            <View style={[styles.scaledCostCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
                                                <FontAwesome name="money" size={16} color={colors.success} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.scaledCostLabel, { color: colors.textMuted }]}>Costo estimado de ingredientes</Text>
                                                    <Text style={[styles.scaledCostValue, { color: colors.success }]}>
                                                        ${totalCost.toFixed(2)}
                                                        {target > 1 ? ` ($${(totalCost / target).toFixed(2)}/porción)` : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })()}
                                </View>
                            );
                        })())}
                    </View>

                    {/* Text-based Ingredients Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <FontAwesome name="shopping-basket" size={18} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notas de Ingredientes</Text>
                        </View>
                        <View style={[styles.paperNote, { backgroundColor: colors.surfaceSecondary }]}>
                            {recipe.ingredients ? (
                                recipe.ingredients.split('\n').map((ing, index) => (
                                    <View key={index} style={{ flexDirection: 'row', marginBottom: 8 }}>
                                        <Text style={{ color: colors.primary, marginRight: 8, fontSize: 16 }}>•</Text>
                                        <Text style={[styles.bodyText, { color: colors.text }]}>{ing}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={[styles.bodyText, { color: colors.textMuted }]}>Sin notas adicionales.</Text>
                            )}
                        </View>
                    </View>

                    {/* Steps Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <FontAwesome name="list-ol" size={18} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Preparación</Text>
                        </View>

                        {recipe.steps ? (
                            recipe.steps.split('\n').map((step, index) => (
                                <View key={index} style={{ flexDirection: 'row', marginBottom: 12 }}>
                                    <Text style={{
                                        color: colors.primary,
                                        fontWeight: 'bold',
                                        marginRight: 8,
                                        fontSize: 16,
                                        width: 24 // Fixed width for alignment 
                                    }}>
                                        {index + 1}.
                                    </Text>
                                    <Text style={[styles.bodyText, { color: colors.text, flex: 1 }]}>
                                        {step}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <Text style={[styles.bodyText, { color: colors.text }]}>Sin instrucciones.</Text>
                        )}
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        height: 350,
        width: '100%',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    placeholderHero: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    contentCard: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -40, // Overlap the image
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xxl,
        minHeight: 500,
    },
    headerBtn: {
        marginRight: Spacing.md,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    badge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.md,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    title: {
        fontFamily: 'System', // Use default serif if custom font not avail, or bold sans
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: Spacing.sm,
        letterSpacing: -0.5,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        ...Typography.small,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: Spacing.lg,
        opacity: 0.5,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        ...Typography.subtitle,
        fontWeight: '700',
    },
    paperNote: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: '#D4A574', // Soft Gold manually for now or use colors.primary
    },
    bodyText: {
        ...Typography.body,
        fontSize: 17,
        lineHeight: 28,
    },
    // Linked Ingredients Styles
    linkedIngredientsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    linkedIngredientChip: {
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        minWidth: 100,
    },
    linkedIngredientQty: {
        ...Typography.bodyBold,
        fontSize: 16,
    },
    linkedIngredientName: {
        ...Typography.small,
        marginTop: 2,
    },
    lowStockWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        marginTop: 4,
    },
    lowStockText: {
        fontSize: 10,
        fontWeight: '600',
    },
    // Scaling Calculator Styles
    scalingInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        marginTop: Spacing.md,
    },
    scalingInputColumn: {
        flex: 1,
        alignItems: 'center',
    },
    scalingInputLabel: {
        ...Typography.small,
        marginBottom: 6,
        fontWeight: '600',
    },
    scalingInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: BorderRadius.md,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    scalingInput: {
        ...Typography.subtitle,
        fontSize: 20,
        textAlign: 'center',
        minWidth: 40,
        paddingVertical: 2,
    },
    scalingUnit: {
        ...Typography.small,
        marginLeft: 4,
    },
    scalingArrow: {
        paddingHorizontal: Spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    multiplierBadge: {
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    multiplierText: {
        ...Typography.bodyBold,
        fontSize: 16,
    },
    scaledTable: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginTop: Spacing.sm,
    },
    scaledTableHeader: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 8,
    },
    scaledTableHeaderText: {
        ...Typography.small,
        fontWeight: '600',
    },
    scaledTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    scaledIngName: {
        ...Typography.body,
        flex: 2,
    },
    scaledIngOriginal: {
        ...Typography.small,
        flex: 1,
        textAlign: 'center',
    },
    scaledIngScaled: {
        ...Typography.bodyBold,
        flex: 1,
        textAlign: 'center',
    },
    scaledCostCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    scaledCostLabel: {
        ...Typography.small,
    },
    scaledCostValue: {
        ...Typography.bodyBold,
        fontSize: 16,
        marginTop: 2,
    },
});
