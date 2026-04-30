import DynamicListInput from '@/components/DynamicListInput';
import { IngredientSelector, SelectedIngredient } from '@/components/IngredientSelector';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useInventory } from '@/hooks/useInventory';
import { useRecipeIngredients } from '@/hooks/useRecipeIngredients';
import { useRecipes } from '@/hooks/useRecipes';
import { useSubscription } from '@/hooks/useSubscription';
import { parseRecipeText } from '@/lib/ocr';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import BackButton from '@/components/BackButton';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ... imports



type InputMode = 'manual' | 'scan';

export default function NewRecipeScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { createRecipe, recipes } = useRecipes();
    const { isPremium } = useSubscription();
    const { showAlert } = useAlert();

    const [mode, setMode] = React.useState<InputMode>('manual');
    const [title, setTitle] = React.useState('');
    const [category, setCategory] = React.useState('');

    const haptics = useHaptics();

    // Changed to arrays for DynamicListInput
    const [ingredientsList, setIngredientsList] = React.useState<string[]>(['']);

    // Linked ingredients from inventory
    const [linkedIngredients, setLinkedIngredients] = React.useState<SelectedIngredient[]>([]);
    const { createAndAddIngredient, addIngredient } = useRecipeIngredients();
    const [stepsList, setStepsList] = React.useState<string[]>(['']);

    const params = useLocalSearchParams();

    // Inventory for name lookup
    const { inventory, fetchInventory } = useInventory();

    React.useEffect(() => {
        fetchInventory(); // Ensure we have items to match names
    }, []);

    React.useEffect(() => {
        if (params.scannedText) {
            console.log('Parsing scanned text...');
            const { title, ingredients, steps, linkedIngredients: parsedLinked } = parseRecipeText(params.scannedText as string);

            if (title) setTitle(title);
            if (ingredients.length > 0) setIngredientsList(ingredients);
            if (steps.length > 0) setStepsList(steps);

            // Populate linked ingredients from inventory matches
            if (parsedLinked && parsedLinked.length > 0 && inventory.length > 0) {
                const mappedLinked: SelectedIngredient[] = parsedLinked.map(item => {
                    // Find the name from our inventory list to ensure consistency
                    const inventoryItem = inventory.find(inv => inv.id === item.inventoryId);
                    return {
                        inventoryItemId: item.inventoryId,
                        inventoryItemName: inventoryItem?.name || item.originalName || 'Ingrediente Desconocido',
                        quantity: item.quantity,
                        unit: item.unit,
                    };
                });
                setLinkedIngredients(mappedLinked);
            } else if (parsedLinked && parsedLinked.length > 0) {
                // If inventory not loaded yet, just use original names (or wait? useEffect might re-run when inventory loads)
                // Since we added inventory to dependency array below, it should re-run!
                const mappedLinked: SelectedIngredient[] = parsedLinked.map(item => ({
                    inventoryItemId: item.inventoryId,
                    inventoryItemName: item.originalName || 'Ingrediente',
                    quantity: item.quantity,
                    unit: item.unit,
                }));
                setLinkedIngredients(mappedLinked);
            }
        }

        if (params.scannedImage) {
            setImage(params.scannedImage as string);
        }
    }, [params.scannedText, params.scannedImage, inventory]);

    const [image, setImage] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);



    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            haptics.selection();
            setImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
            haptics.warning();
            showAlert({ title: 'Permiso denegado', message: 'Necesitamos acceso a la cámara para tomar fotos.', type: 'error' });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            haptics.success();
            setImage(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            haptics.error();
            showAlert({ title: 'Error', message: 'Por favor ingresa un título para la receta.', type: 'error' });
            return;
        }

        // Check Premium Limit
        if (!isPremium && recipes.length >= 5) {
            haptics.error();
            showAlert({
                title: 'Límite Alcanzado',
                message: 'Has alcanzado el límite de 5 recetas gratuitas.\n\nSuscríbete a Premium para crear recetas ilimitadas.',
                type: 'warning',
                buttons: [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Premium', onPress: () => router.push('/premium') }
                ]
            });
            return;
        }

        setIsSubmitting(true);

        // Join lists into multiline strings (for text-based ingredients)
        const ingredientsText = ingredientsList.filter(i => i.trim()).join('\n');
        const stepsText = stepsList.filter(s => s.trim()).join('\n');

        // Create recipe first
        const newRecipe = await createRecipe({
            title,
            category,
            ingredients: ingredientsText,
            steps: stepsText,
            imageUrl: image || undefined
        });

        // If recipe created and we have linked ingredients, save them
        if (newRecipe && linkedIngredients.length > 0) {
            // Process linked ingredients
            for (const ing of linkedIngredients) {
                if (ing.inventoryItemId.startsWith('new:')) {
                    // Create new inventory item
                    const name = ing.inventoryItemId.replace('new:', '');
                    await createAndAddIngredient(
                        newRecipe.id,
                        name,
                        ing.quantity,
                        ing.unit,
                        {
                            purchaseQuantity: ing.purchaseQuantity,
                            purchaseUnit: ing.purchaseUnit,
                            purchaseCost: ing.purchaseCost
                        }
                    );
                } else {
                    // Use existing inventory item
                    // Use addIngredient to APPEND, not setIngredientsForRecipe which wipes the list
                    await addIngredient(newRecipe.id, {
                        inventoryItemId: ing.inventoryItemId,
                        quantity: ing.quantity,
                        unit: ing.unit
                    });
                }
            }
        }

        haptics.success();
        setIsSubmitting(false);

        if (params.scannedText) {
            // Coming from Scan screen: dismiss both NewRecipe and ScanRecipe to return to list
            router.dismissAll();
        } else {
            router.back();
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <Stack.Screen options={{ headerLeft: () => <BackButton /> }} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Title Section */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Título</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                        placeholder="Ej. Torta de Chocolate"
                        placeholderTextColor={colors.textMuted}
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Photo Attachment (Visible in all modes now, but emphasized) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Foto de Referencia</Text>
                        {/* Optional badge */}
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

                {/* Mode Switch - Mainly for UX preference: Type or "Scan" focus */}
                <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceSecondary }]}>
                    <TouchableOpacity
                        style={[styles.modeButton, mode === 'manual' && { backgroundColor: colors.surface }, mode === 'manual' && styles.shadow]}
                        onPress={() => setMode('manual')}
                    >
                        <Text style={[styles.modeText, { color: mode === 'manual' ? colors.primary : colors.textSecondary }]}>
                            Escribir
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeButton, mode === 'scan' && { backgroundColor: colors.surface }, mode === 'scan' && styles.shadow]}
                        onPress={() => setMode('scan')}
                    >
                        <Text style={[styles.modeText, { color: mode === 'scan' ? colors.primary : colors.textSecondary }]}>
                            Solo Foto / Escanear
                        </Text>
                    </TouchableOpacity>
                </View>

                {mode === 'manual' ? (
                    <>
                        {/* Linked Ingredients from Inventory */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Ingredientes (del Inventario)</Text>
                            <Text style={[styles.sublabel, { color: colors.textMuted }]}>
                                Estos se descontarán automáticamente al completar pedidos
                            </Text>
                            <IngredientSelector
                                selectedIngredients={linkedIngredients}
                                onIngredientsChange={setLinkedIngredients}
                            />
                        </View>

                        {/* Text-based ingredients (legacy/notes) */}
                        <View style={styles.section}>
                            <DynamicListInput
                                label="Notas de Ingredientes"
                                icon="shopping-basket"
                                data={ingredientsList}
                                onUpdate={setIngredientsList}
                                placeholder="Ej. Opcional: Tips o notas adicionales"
                            />
                        </View>

                        <View style={styles.section}>
                            <DynamicListInput
                                label="Pasos / Instrucciones"
                                icon="list-ol"
                                data={stepsList}
                                onUpdate={setStepsList}
                                placeholder="Ej. Mezclar azúcar y manteca..."
                                numbered
                            />
                        </View>
                    </>
                ) : (
                    <View style={styles.scanContainer}>
                        {/* Streamlined scan view - Encourages photo usage */}
                        <View style={[styles.infoBox, { backgroundColor: colors.surfaceSecondary }]}>
                            <FontAwesome name="info-circle" size={16} color={colors.primary} />
                            <Text style={[styles.infoText, { color: colors.text }]}>
                                Toma una foto de tu receta. Se guardará como referencia.
                                {"\n"}Próximamente podrás convertirla a texto automáticamente.
                            </Text>
                        </View>
                        {!image && (
                            <TouchableOpacity style={[styles.bigScanBtn, { backgroundColor: colors.primary }]} onPress={takePhoto}>
                                <FontAwesome name="camera" size={24} color="#FFF" />
                                <Text style={styles.bigScanBtnText}>Tomar Foto Ahora</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Categoría</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                        {[
                            { label: '🎂 Tortas', value: 'Tortas' },
                            { label: '🧁 Cupcakes', value: 'Cupcakes' },
                            { label: '🍪 Galletas', value: 'Galletas' },
                            { label: '🍫 Brownies', value: 'Brownies' },
                            { label: '🍮 Postres Fríos', value: 'Postres Fríos' },
                            { label: '🍞 Panes', value: 'Panes' },
                            { label: '🍬 Dulces', value: 'Dulces' },
                            { label: '✨ Otro', value: 'Otro' },
                        ].map((cat) => (
                            <TouchableOpacity
                                key={cat.value}
                                onPress={() => setCategory(category === cat.value ? '' : cat.value)}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    backgroundColor: category === cat.value ? colors.primary : colors.surface,
                                    borderWidth: 1,
                                    borderColor: category === cat.value ? colors.primary : colors.border,
                                }}
                            >
                                <Text style={{
                                    ...Typography.caption,
                                    color: category === cat.value ? '#FFF' : colors.text,
                                    fontWeight: category === cat.value ? '700' : '500',
                                }}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
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
                        <Text style={styles.submitButtonText}>Guardar Receta</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md, paddingBottom: 100 },
    section: { marginBottom: Spacing.lg },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    label: { ...Typography.caption, fontWeight: '600', marginBottom: Spacing.sm },
    sublabel: { ...Typography.small, marginBottom: Spacing.sm, marginTop: -Spacing.xs },
    input: {
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        fontSize: 16,
        height: 48,
        textAlignVertical: 'center',
        paddingVertical: 0,
    },

    modeSwitch: { flexDirection: 'row', padding: 4, borderRadius: BorderRadius.lg, marginBottom: Spacing.lg },
    modeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md },
    modeText: { ...Typography.bodyBold, fontSize: 14 },
    shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },

    scanContainer: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
    infoBox: { flexDirection: 'row', padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm, alignItems: 'center' },
    infoText: { ...Typography.small, flex: 1 },
    bigScanBtn: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.xl, gap: Spacing.md },
    bigScanBtnText: { color: '#FFF', ...Typography.subtitle },

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
