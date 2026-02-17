import Confetti from '@/components/Confetti';
import { useColorScheme } from '@/components/useColorScheme';
import { useAlert } from '@/context/AlertContext';
import { FREE_TIER_LIMITS, useSubscription } from '@/hooks/useSubscription';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/Colors';

const PREMIUM_FEATURES = [
    { icon: 'plus-circle', label: 'Pedidos ilimitados', free: `Hasta ${FREE_TIER_LIMITS.maxOrders}` },
    { icon: 'cubes', label: 'Inventario ilimitado', free: `Hasta ${FREE_TIER_LIMITS.maxInventoryItems} items` },
    { icon: 'book', label: 'Recetas ilimitadas', free: `Hasta ${FREE_TIER_LIMITS.maxRecipes}` },
    { icon: 'camera', label: 'OCR Escaneo de Recetas', free: 'No disponible' },
    { icon: 'bar-chart', label: 'Estadísticas avanzadas', free: 'Básicas' },
    { icon: 'file-excel-o', label: 'Exportar a Excel', free: 'No disponible' },
];

const PAYMENT_INFO = {
    whatsapp: '34652522076',  // Phone with country code, no +
    pagoMovil: {
        banco: 'BNC',
        telefono: '0424-5796664',
        cedula: 'V-30221439'
    },
    // zelle: 'tu-email@example.com',  // Para más adelante
    paypal: 'sonicvincenzo@gmail.com',
    precio: '$4/mes'
};

export default function PremiumScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { isPremium, premiumUntil, redeemCode, loading } = useSubscription();
    const { showAlert } = useAlert();

    const [code, setCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const handleRedeemCode = async () => {
        if (!code.trim()) {
            showAlert({ title: 'Error', message: 'Ingresa un código de activación', type: 'error' });
            return;
        }

        setRedeeming(true);
        const result = await redeemCode(code);
        setRedeeming(false);

        if (result.success) {
            setShowConfetti(true);
            setCode('');

            // Delay the alert slightly so confetti starts first
            setTimeout(() => {
                showAlert({
                    title: '🎉 ¡Premium Activado!',
                    message: `¡Felicidades! Tu suscripción Premium está activa hasta ${result.premiumUntil?.toLocaleDateString('es-ES')}.\n\nTodas las funciones están desbloqueadas.`,
                    type: 'success',
                    buttons: [{ text: '¡Genial!', onPress: () => router.back() }]
                });
            }, 500);
        } else {
            showAlert({ title: 'Error', message: result.error || 'No se pudo activar el código', type: 'error' });
        }
    };

    const handleContactSupport = () => {
        const message = encodeURIComponent('Hola! Quiero activar Miga Premium. Adjunto mi comprobante de pago.');
        Linking.openURL(`https://wa.me/${PAYMENT_INFO.whatsapp}?text=${message}`);
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'Miga Premium' }} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (isPremium) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'Miga Premium' }} />
                <Confetti active={true} />
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.premiumBadge, { backgroundColor: colors.primary }]}>
                        <FontAwesome name="star" size={48} color="#FFF" />
                        <Text style={styles.premiumBadgeText}>Premium Activo</Text>
                        {premiumUntil && (
                            <Text style={styles.premiumUntil}>
                                Válido hasta: {premiumUntil.toLocaleDateString('es-ES')}
                            </Text>
                        )}
                    </View>

                    <View style={[styles.featuresCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Tus beneficios activos:
                        </Text>
                        {PREMIUM_FEATURES.map((feature, index) => (
                            <View key={index} style={styles.featureRow}>
                                <FontAwesome name={feature.icon as any} size={18} color={colors.success} />
                                <Text style={[styles.featureLabel, { color: colors.text }]}>
                                    {feature.label}
                                </Text>
                                <FontAwesome name="check" size={16} color={colors.success} />
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Stack.Screen options={{ title: 'Miga Premium' }} />
            <Confetti active={showConfetti} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                        <FontAwesome name="star" size={32} color="#FFF" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Miga Premium</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Desbloquea todo el potencial de tu negocio
                    </Text>
                    <Text style={[styles.price, { color: colors.primary }]}>{PAYMENT_INFO.precio}</Text>
                </View>

                {/* Features */}
                <View style={[styles.featuresCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        ¿Qué obtienes?
                    </Text>
                    {PREMIUM_FEATURES.map((feature, index) => (
                        <View key={index} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                            <FontAwesome name={feature.icon as any} size={18} color={colors.primary} />
                            <View style={styles.featureText}>
                                <Text style={[styles.featureLabel, { color: colors.text }]}>
                                    {feature.label}
                                </Text>
                                <Text style={[styles.freeLimit, { color: colors.textMuted }]}>
                                    Gratis: {feature.free}
                                </Text>
                            </View>
                            <FontAwesome name="check-circle" size={20} color={colors.success} />
                        </View>
                    ))}
                </View>


                {/* iOS Compliance: Hide manual payments and codes conform to Guideline 3.1.1 */}
                {Platform.OS === 'ios' ? (
                    <View style={[styles.paymentCard, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            ¿Cómo obtener Premium?
                        </Text>
                        <Text style={[styles.paymentValue, { color: colors.textSecondary, lineHeight: 22 }]}>
                            Para gestionar tu suscripción a Miga Premium, por favor visita nuestra página web o contacta a nuestro soporte técnico.
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Payment Info (Android only) */}
                        <View style={[styles.paymentCard, { backgroundColor: colors.surfaceSecondary }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                Cómo activar Premium
                            </Text>

                            <View style={styles.step}>
                                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.stepNumberText}>1</Text>
                                </View>
                                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                                    Realiza el pago por Pago Móvil o PayPal:
                                </Text>
                            </View>

                            <View style={[styles.paymentDetails, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.paymentLabel, { color: colors.textMuted }]}>Pago Móvil:</Text>
                                <Text style={[styles.paymentValue, { color: colors.text }]}>
                                    {PAYMENT_INFO.pagoMovil.banco} | {PAYMENT_INFO.pagoMovil.telefono}
                                </Text>
                                <Text style={[styles.paymentValue, { color: colors.text }]}>
                                    C.I.: {PAYMENT_INFO.pagoMovil.cedula}
                                </Text>

                                {/* Zelle - habilitado más adelante
                        <Text style={[styles.paymentLabel, { color: colors.textMuted, marginTop: Spacing.sm }]}>
                            Zelle:
                        </Text>
                        <Text style={[styles.paymentValue, { color: colors.text }]}>
                            {PAYMENT_INFO.zelle}
                        </Text>
                        */}

                                <Text style={[styles.paymentLabel, { color: colors.textMuted, marginTop: Spacing.sm }]}>
                                    PayPal:
                                </Text>
                                <Text style={[styles.paymentValue, { color: colors.text }]}>
                                    {PAYMENT_INFO.paypal}
                                </Text>
                            </View>

                            <View style={styles.step}>
                                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.stepNumberText}>2</Text>
                                </View>
                                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                                    Envía el comprobante por WhatsApp
                                </Text>
                            </View>

                            <View style={styles.step}>
                                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.stepNumberText}>3</Text>
                                </View>
                                <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                                    Recibirás un código de activación por email
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.contactButton, { borderColor: colors.primary }]}
                                onPress={handleContactSupport}
                            >
                                <FontAwesome name="whatsapp" size={18} color={colors.primary} />
                                <Text style={[styles.contactButtonText, { color: colors.primary }]}>
                                    Contactar por WhatsApp
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Code Input (Android only) */}
                        <View style={[styles.codeCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                ¿Ya tienes un código?
                            </Text>
                            <TextInput
                                style={[styles.codeInput, {
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    color: colors.text
                                }]}
                                placeholder="XXXX-XXXX-XXXX"
                                placeholderTextColor={colors.textMuted}
                                value={code}
                                onChangeText={setCode}
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                style={[styles.redeemButton, { backgroundColor: colors.primary }]}
                                onPress={handleRedeemCode}
                                disabled={redeeming}
                            >
                                {redeeming ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <FontAwesome name="unlock" size={18} color="#FFF" />
                                        <Text style={styles.redeemButtonText}>Activar Código</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.lg },
    header: { alignItems: 'center', marginBottom: Spacing.xl },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    title: { ...Typography.title, fontSize: 28 },
    subtitle: { ...Typography.body, textAlign: 'center', marginTop: Spacing.xs },
    price: { ...Typography.title, fontSize: 32, marginTop: Spacing.md },
    featuresCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    sectionTitle: { ...Typography.subtitle, marginBottom: Spacing.md },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: Spacing.md,
    },
    featureText: { flex: 1 },
    featureLabel: { ...Typography.body, fontWeight: '500' },
    freeLimit: { ...Typography.small },
    paymentCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, gap: Spacing.sm },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumberText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    stepText: { ...Typography.body, flex: 1 },
    paymentDetails: {
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginVertical: Spacing.sm,
        borderWidth: 1,
    },
    paymentLabel: { ...Typography.small, fontWeight: '600' },
    paymentValue: { ...Typography.body },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    contactButtonText: { ...Typography.bodyBold },
    codeCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
    },
    codeInput: {
        height: 56,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 2,
        marginBottom: Spacing.md,
    },
    redeemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
    },
    redeemButtonText: { color: '#FFF', ...Typography.bodyBold, fontSize: 16 },
    premiumBadge: {
        alignItems: 'center',
        padding: Spacing.xl,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.lg,
    },
    premiumBadgeText: { color: '#FFF', ...Typography.title, marginTop: Spacing.md },
    premiumUntil: { color: 'rgba(255,255,255,0.8)', ...Typography.body, marginTop: Spacing.xs },
});


