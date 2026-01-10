import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { Recipe, useRecipes } from '@/hooks/useRecipes';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Stack, useFocusEffect } from 'expo-router';
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
                    <Text style={[styles.cardSnippet, { color: colors.textSecondary }]} numberOfLines={2}>
                        {(recipe.ingredients || recipe.steps || 'Sin contenido').substring(0, 100).replace(/\n/g, ', ')}
                        {(recipe.ingredients || recipe.steps || '').length > 100 ? '...' : ''}
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
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <Link href="/recipes/new" asChild>
                            <TouchableOpacity style={{ padding: 8 }}>
                                <FontAwesome name="plus" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </Link>
                    )
                }}
            />

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

            {/* FAB */}
            <Link href="/recipes/new" asChild>
                <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }, Shadows.lg]}>
                    <FontAwesome name="plus" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </Link>
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
