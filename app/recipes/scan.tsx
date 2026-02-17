import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useInventory } from '@/hooks/useInventory';
import { useSubscription } from '@/hooks/useSubscription';
import { extractTextFromImage } from '@/lib/ocr';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ScanRecipeScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { showAlert } = useAlert();
    const { isPremium } = useSubscription();
    const { inventory, fetchInventory } = useInventory();

    const [image, setImage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchInventory();
    }, []);

    const pickImage = async (source: 'camera' | 'library') => {
        try {
            let result: ImagePicker.ImagePickerResult;

            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            };

            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    showAlert({ title: 'Permiso denegado', message: 'Necesitamos acceso a la cámara para escanear.', type: 'error' });
                    return;
                }
                result = await ImagePicker.launchCameraAsync(options);
            } else {
                result = await ImagePicker.launchImageLibraryAsync(options);
            }

            if (!result.canceled && result.assets && result.assets[0].uri) {
                // Resize image to max 600 width to be extremely safe with payload limits
                const manipulatedResult = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 600 } }],
                    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
                );
                setImage(manipulatedResult.uri);
            }
        } catch (error) {
            console.error(error);
            showAlert({ title: 'Error', message: 'No se pudo cargar la imagen', type: 'error' });
        }
    };

    const processImage = async () => {
        if (!image) return;

        // Premium gate: OCR is a Premium-only feature
        if (!isPremium) {
            showAlert({
                title: 'Función Premium',
                message: 'El escaneo de recetas con IA es exclusivo para usuarios Premium.\n\nSuscríbete para convertir fotos en recetas automáticamente.',
                type: 'warning',
                buttons: [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Premium', onPress: () => router.push('/premium') }
                ]
            });
            return;
        }

        setProcessing(true);

        try {
            // Call real OCR via Supabase Edge Function
            // Pass inventory to allow matching
            const simplifiedInventory = inventory.map(item => ({
                id: item.id,
                name: item.name,
                unit: item.unit
            }));

            const extractedText = await extractTextFromImage(image, simplifiedInventory);

            if (!extractedText) {
                showAlert({
                    title: 'Error de Escaneo',
                    message: 'No se pudo extraer texto de la imagen. Intenta con una foto más clara.',
                    type: 'error',
                    buttons: [{ text: 'OK' }]
                });
                setProcessing(false);
                return;
            }

            showAlert({
                title: 'Escaneo Completado',
                message: 'Se ha extraído el texto de la receta con éxito.',
                type: 'success',
                buttons: [
                    {
                        text: 'Crear Receta',
                        onPress: () => {
                            router.push({
                                pathname: '/recipes/new',
                                params: {
                                    scannedText: extractedText,
                                    scannedImage: image
                                }
                            });
                        }
                    }
                ]
            });
        } catch (error) {
            console.error('OCR error:', error);
            showAlert({ title: 'Error', message: 'Ocurrió un error al procesar la imagen.', type: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ title: 'Escanear Receta' }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Foto de la Receta
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Toma una foto clara de los ingredientes y pasos.
                    </Text>
                </View>

                {/* Image Preview */}
                <View style={[styles.previewContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.previewImage} resizeMode="contain" />
                    ) : (
                        <View style={styles.placeholder}>
                            <FontAwesome name="camera" size={48} color={colors.textMuted} />
                            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                                Sin imagen seleccionada
                            </Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.surfaceSecondary }]}
                        onPress={() => pickImage('camera')}
                        disabled={processing}
                    >
                        <FontAwesome name="camera" size={20} color={colors.primary} />
                        <Text style={[styles.buttonText, { color: colors.primary }]}>Cámara</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.surfaceSecondary }]}
                        onPress={() => pickImage('library')}
                        disabled={processing}
                    >
                        <FontAwesome name="image" size={20} color={colors.primary} />
                        <Text style={[styles.buttonText, { color: colors.primary }]}>Galería</Text>
                    </TouchableOpacity>
                </View>

                {/* Process Button */}
                {image && (
                    <TouchableOpacity
                        style={[styles.processButton, { backgroundColor: colors.primary }, Shadows.md]}
                        onPress={processImage}
                        disabled={processing}
                    >
                        {processing ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <FontAwesome name="magic" size={20} color="#FFF" />
                                <Text style={styles.processButtonText}>Procesar Receta</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.lg,
    },
    header: {
        marginBottom: Spacing.xl,
        alignItems: 'center',
    },
    title: {
        ...Typography.title,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        ...Typography.body,
        textAlign: 'center',
    },
    previewContainer: {
        width: '100%',
        aspectRatio: 3 / 4,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderStyle: 'dashed',
        marginBottom: Spacing.xl,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        alignItems: 'center',
        gap: Spacing.md,
    },
    placeholderText: {
        ...Typography.body,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
    },
    buttonText: {
        ...Typography.bodyBold,
    },
    processButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        gap: Spacing.md,
    },
    processButtonText: {
        ...Typography.title,
        fontSize: 18,
        color: '#FFFFFF',
    },
});
