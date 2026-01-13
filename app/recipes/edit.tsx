import DynamicListInput from '@/components/DynamicListInput';
import { IngredientSelector, SelectedIngredient } from '@/components/IngredientSelector';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/Colors';
import { useRecipeIngredients } from '@/hooks/useRecipeIngredients';
import { useRecipes } from '@/hooks/useRecipes';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function EditRecipeScreen() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { getRecipeById, updateRecipe } = useRecipes();
    const { getIngredientsForRecipe, createAndAddIngredient, setIngredientsForRecipe } = useRecipeIngredients();

    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [ingredientsList, setIngredientsList] = useState<string[]>(['']);
    const [linkedIngredients, setLinkedIngredients] = useState<SelectedIngredient[]>([]);
    const [stepsList, setStepsList] = useState<string[]>(['']);
    const [image, setImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadRecipe();
    }, [id]);

    const loadRecipe = async () => {
        if (typeof id !== 'string') return;
        const recipe = await getRecipeById(id);
        if (recipe) {
            setTitle(recipe.title);
            setCategory(recipe.category || '');
            setImage(recipe.imageUrl);

            // Split multiline text into array for DynamicList
            if (recipe.ingredients) {
                setIngredientsList(recipe.ingredients.split('\n'));
            }
            if (recipe.steps) {
                setStepsList(recipe.steps.split('\n'));
            }

            // Load linked ingredients from database
            const linked = await getIngredientsForRecipe(id);
            const mappedIngredients: SelectedIngredient[] = linked.map(ing => ({
                inventoryItemId: ing.inventoryItemId,
                inventoryItemName: ing.inventoryItem?.name || 'Ingrediente',
                quantity: ing.quantity,
                unit: ing.unit
            }));
            setLinkedIngredients(mappedIngredients);
        } else {
            Alert.alert('Error', 'Receta no encontrada');
            router.back();
        }
        setLoading(false);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
            Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Por favor ingresa un título');
            return;
        }

        if (typeof id !== 'string') return;

        setIsSubmitting(true);

        const ingredientsText = ingredientsList.filter(i => i.trim()).join('\n');
        const stepsText = stepsList.filter(s => s.trim()).join('\n');

        const success = await updateRecipe(id, {
            title,
            category,
            ingredients: ingredientsText,
            steps: stepsText,
            imageUrl: image || undefined
        });

        // Save linked ingredients
        if (success && linkedIngredients.length > 0) {
            // First handle new ingredients (with 'new:' prefix)
            const finalIngredients = [];
            for (const ing of linkedIngredients) {
                if (ing.inventoryItemId.startsWith('new:')) {
                    const name = ing.inventoryItemId.replace('new:', '');
                    const created = await createAndAddIngredient(id, name, ing.quantity, ing.unit);
                    if (created) {
                        finalIngredients.push({
                            inventoryItemId: created.inventoryItemId,
                            quantity: ing.quantity,
                            unit: ing.unit
                        });
                    }
                } else {
                    finalIngredients.push({
                        inventoryItemId: ing.inventoryItemId,
                        quantity: ing.quantity,
                        unit: ing.unit
                    });
                }
            }
            await setIngredientsForRecipe(id, finalIngredients);
        } else if (success) {
            // Clear linked ingredients if none selected
            await setIngredientsForRecipe(id, []);
        }

        setIsSubmitting(false);
        if (success) {
            router.back();
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Title Section */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Título</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Photo Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Foto de Referencia</Text>
                    </View>

                    {image ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
                            <TouchableOpacity
                                style={[styles.removeImageBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
                                onPress={() => setImage(null)}
                            >
                                <FontAwesome name="times" size={12} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.photoButtonsRow}>
                            <TouchableOpacity style={[styles.photoBtnSmall, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={takePhoto}>
                                <FontAwesome name="camera" size={14} color={colors.text} />
                                <Text style={[styles.photoBtnTextSmall, { color: colors.text }]}>Cámara</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.photoBtnSmall, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickImage}>
                                <FontAwesome name="image" size={14} color={colors.text} />
                                <Text style={[styles.photoBtnTextSmall, { color: colors.text }]}>Galería</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Linked Ingredients from Inventory */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Ingredientes (del Inventario)</Text>
                    <IngredientSelector
                        selectedIngredients={linkedIngredients}
                        onIngredientsChange={setLinkedIngredients}
                    />
                </View>

                {/* Text notes for ingredients */}
                <View style={styles.section}>
                    <DynamicListInput
                        label="Notas de Ingredientes"
                        icon="shopping-basket"
                        data={ingredientsList.length ? ingredientsList : ['']}
                        onUpdate={setIngredientsList}
                        placeholder="Ej. Tips opcionales..."
                    />
                </View>

                <View style={styles.section}>
                    <DynamicListInput
                        label="Pasos / Instrucciones"
                        icon="list-ol"
                        data={stepsList.length ? stepsList : ['']}
                        onUpdate={setStepsList}
                        placeholder="Ej. Mezclar azúcar y manteca..."
                        numbered
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Categoría</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                        value={category}
                        onChangeText={setCategory}
                        placeholder="Ej. Tortas"
                        placeholderTextColor={colors.textMuted}
                    />
                </View>

            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Guardar Cambios</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md, paddingBottom: 100 },
    section: { marginBottom: Spacing.lg },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    label: { ...Typography.caption, fontWeight: '600', marginBottom: Spacing.sm },
    input: {
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        fontSize: 16,
        height: 48,
        textAlignVertical: 'center',
        paddingVertical: 0,
    },

    photoButtonsRow: { flexDirection: 'row', gap: Spacing.md },
    photoBtnSmall: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, gap: 8 },
    photoBtnTextSmall: { ...Typography.small, fontWeight: '600' },

    imagePreviewContainer: { height: 200, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative' },
    previewImage: { width: '100%', height: '100%' },
    removeImageBtn: { position: 'absolute', top: 8, right: 8, padding: 6, borderRadius: 12 },

    footer: { padding: Spacing.md, borderTopWidth: 1 },
    submitButton: { padding: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center' },
    submitButtonText: { color: '#FFF', ...Typography.bodyBold },
});
