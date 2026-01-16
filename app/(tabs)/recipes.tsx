import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { Recipe, useRecipes } from '@/hooks/useRecipes';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

function RecipeCard({
    recipe,
    colors
}: {
    recipe: Recipe;
    colors: typeof Colors.light;
}) {
    return (
        <Link href={`/recipes/${recipe.id}`} asChild>
            <TouchableOpacity
                style={[
                    styles.card,
                    { backgroundColor: colors.surface },
                    Shadows.sm
                ]}
            >
                {recipe.imageUrl ? (
                    <Image source={{ uri: recipe.imageUrl }} style={styles.cardImage} />
                ) : (
                    <View style={[styles.cardPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                        <FontAwesome name="book" size={32} color={colors.textMuted} />
                    </View>
                )}

                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                        {recipe.title}
                    </Text>
                    {recipe.category && (
                        <Text style={[styles.cardCategory, { color: colors.primary }]}>
                            {recipe.category}
                        </Text>
                    )}

                    {/* Price Badges */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                        {recipe.suggestedPrice && recipe.suggestedPrice > 0 && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: colors.success + '20',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                gap: 4
                            }}>
                                <FontAwesome name="tag" size={10} color={colors.success} />
                                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.success }}>
                                    Venta: ${recipe.suggestedPrice.toFixed(2)}
                                </Text>
                            </View>
                        )}
                        {recipe.costPerPortion && recipe.costPerPortion > 0 && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: colors.warning + '20',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                gap: 4
                            }}>
                                <FontAwesome name="pie-chart" size={10} color={colors.warning} />
                                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.warning }}>
                                    Costo: ${recipe.costPerPortion.toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.cardSnippet, { color: colors.textSecondary }]} numberOfLines={2}>
                        {(() => {
                            const textIngredients = recipe.ingredients;
                            const linkedIngredients = recipe.recipeIngredients?.map(r => r.inventoryItem.name).join(', ');
                            const content = textIngredients || linkedIngredients || recipe.steps || 'Sin contenido';
                            return content.substring(0, 100).replace(/\n/g, ', ');
                        })()}
                        {/* Ellipsis handled by numberOfLines, but strict length check logic: */}
                        {((recipe.ingredients || '').length + (recipe.recipeIngredients?.length || 0) * 10) > 100 ? '...' : ''}
                    </Text>
                </View>
            </TouchableOpacity>
        </Link>
    );
}

export default function RecipesScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { recipes, loading, onRefresh, refreshing, refreshSilent } = useRecipes();
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        React.useCallback(() => {
            refreshSilent();
        }, [])
    );

    const filteredRecipes = recipes.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.category && r.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Configure Header Buttons via Tabs.Screen options logic or Stack logic if nested.
                Since this is a Tab Screen, we can use navigation.setOptions or similar, 
                but keeping it simple (no headerRight here, moving to _layout for cleanliness 
                or keeping it if it works).
                
                Actually, Stack.Screen works if the Tab Navigator is inside a Stack 
                or if we use Tabs.Screen from inside? No.
                
                Simplest: Render buttons in the view if Header is not customized dynamically enough.
                But let's try to set options on the parent navigator. 
                Using <Tabs.Screen /> from expo-router is possible here too or just relying on _layout.
            */}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <FontAwesome name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Buscar receta..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <FlatList
                data={filteredRecipes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <RecipeCard recipe={item} colors={colors} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FontAwesome name="book" size={48} color={loading ? colors.primary : colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            {loading ? 'Cargando recetario...' : 'No hay recetas guardadas'}
                        </Text>
                    </View>
                }
            />


        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        padding: Spacing.md,
    },
    searchBar: {
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
    listContent: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    card: {
        width: '100%',
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginBottom: Spacing.lg, // More spacing for full cards
    },
    cardImage: {
        width: '100%',
        height: 180, // Taller image for full card
        backgroundColor: '#eee',
    },
    cardPlaceholder: {
        width: '100%',
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        padding: Spacing.sm,
    },
    cardTitle: {
        ...Typography.bodyBold,
        marginBottom: 2,
    },
    cardCategory: {
        ...Typography.small,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardSnippet: {
        ...Typography.small,
        fontSize: 10,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxl,
        marginTop: Spacing.xxl,
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
    },
});
