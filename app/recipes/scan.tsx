import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { extractTextFromImage } from '@/lib/ocr';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

    const [image, setImage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const pickImage = async (source: 'camera' | 'library') => {
        try {
            let result;
            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara para escanear.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8,
                });
            }

            if (!result.canceled && result.assets[0].uri) {
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo cargar la imagen');
        }
    };

    const processImage = async () => {
        if (!image) return;
        setProcessing(true);

        try {
            // Call real OCR via Supabase Edge Function
            const extractedText = await extractTextFromImage(image);

            if (!extractedText) {
                Alert.alert(
                    'Error de Escaneo',
                    'No se pudo extraer texto de la imagen. Intenta con una foto más clara.',
                    [{ text: 'OK' }]
                );
                setProcessing(false);
                return;
            }

            Alert.alert(
                'Escaneo Completado',
                'Se ha extraído el texto de la receta con éxito.',
                [
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
            );
        } catch (error) {
            console.error('OCR error:', error);
            Alert.alert('Error', 'Ocurrió un error al procesar la imagen.');
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
