import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { RecipeIngredient, useRecipeIngredients } from '@/hooks/useRecipeIngredients';
import { Recipe, useRecipes } from '@/hooks/useRecipes';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
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

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [linkedIngredients, setLinkedIngredients] = useState<RecipeIngredient[]>([]);
    const [loading, setLoading] = useState(true);

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

    const handleDelete = () => {
        Alert.alert(
            'Eliminar Receta',
            '¿Estás seguro que quieres eliminar esta receta?',
            [
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
        );
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
                        {recipe.category && (
                            <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.badgeText, { color: colors.primary }]}>{recipe.category.toUpperCase()}</Text>
                            </View>
                        )}
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
});
