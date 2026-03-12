import Confetti from '@/components/Confetti';
import { useColorScheme } from '@/components/useColorScheme';
import { useAlert } from '@/context/AlertContext';
import { FREE_TIER_LIMITS, useSubscription } from '@/hooks/useSubscription';
import { restorePurchases } from '@/lib/revenuecat';
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
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
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
    whatsapp: '34652522076',
    pagoMovil: {
        banco: 'BNC',
        telefono: '0424-5796664',
        cedula: 'V-30221439'
    },
    paypal: 'sonicvincenzo@gmail.com',
    precio: '$3.99/mes'
};

export default function PremiumScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { isPremium, premiumUntil, redeemCode, refreshStatus, loading: subLoading } = useSubscription();
    const { showAlert } = useAlert();

    const [purchasing, setPurchasing] = useState(false);
    const [isPresenting, setIsPresenting] = useState(false);

    const [code, setCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Easter egg for testers: 7 quick taps to show code input
    const [tapCount, setTapCount] = useState(0);
    const [showDevMenu, setShowDevMenu] = useState(false);
    const tapTimeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const handleSecretTap = () => {
        setTapCount(prev => {
            const next = prev + 1;
            if (next >= 7) {
                setShowDevMenu(true);
                return 0;
            }
            return next;
        });

        if (tapTimeout.current) clearTimeout(tapTimeout.current);
        tapTimeout.current = setTimeout(() => setTapCount(0), 1000);
    };

    const handlePresentPaywall = async () => {
        if (isPresenting) return;
        setIsPresenting(true);
        try {
            const paywallResult = await RevenueCatUI.presentPaywall();

            if (paywallResult === PAYWALL_RESULT.PURCHASED || paywallResult === PAYWALL_RESULT.RESTORED) {
                await refreshStatus(); // Refresh local hook state
                setShowConfetti(true);
                setTimeout(() => {
                    showAlert({
                        title: '🎉 ¡Premium Activado!',
                        message: '¡Felicidades! Tu suscripción Premium ha sido activada con éxito.',
                        type: 'success',
                        buttons: [{ text: '¡Genial!', onPress: () => router.back() }]
                    });
                }, 500);
            }
        } catch (e: any) {
            console.error('Error presenting paywall', e);
        } finally {
            setIsPresenting(false);
        }
    };

    const handleManageSubscription = async () => {
        try {
            await RevenueCatUI.presentCustomerCenter();
        } catch (e) {
            console.error('Error presenting Customer Center', e);
            showAlert({ title: 'Aviso', message: 'No se pudo abrir el centro de clientes.', type: 'info' });
        }
    };

    const handleRestore = async () => {
        setPurchasing(true);
        const restored = await restorePurchases();
        setPurchasing(false);

        if (restored) {
            await refreshStatus();
            showAlert({ title: 'Compras Restauradas', message: 'Tus compras han sido restauradas con éxito.', type: 'success' });
        } else {
            showAlert({ title: 'Aviso', message: 'No se encontraron compras anteriores para restaurar.', type: 'info' });
        }
    };

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

    if (subLoading) {
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
                        <Text style={[styles.premiumUntil, { marginTop: 4, fontStyle: 'italic' }]}>
                            (Las suscripciones de Apple App Store se renuevan automáticamente)
                        </Text>
                    </View>

                    <View style={[styles.featuresCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tus beneficios activos:</Text>
                        {PREMIUM_FEATURES.map((feature, index) => (
                            <View key={index} style={styles.featureRow}>
                                <FontAwesome name={feature.icon as any} size={18} color={colors.success} />
                                <Text style={[styles.featureLabel, { color: colors.text }]}>{feature.label}</Text>
                                <FontAwesome name="check" size={16} color={colors.success} />
                            </View>
                        ))}
                    </View>

                    {/* Add Manage/Restore Buttons */}
                    <View style={{ gap: Spacing.md, marginTop: Spacing.xl }}>
                        {Platform.OS === 'ios' && (
                            <TouchableOpacity
                                style={[styles.iapButton, { backgroundColor: colors.surfaceSecondary }]}
                                onPress={handleManageSubscription}
                            >
                                <View style={styles.iapButtonContent}>
                                    <Text style={[styles.iapButtonTitle, { color: colors.text }]}>Administrar Suscripción de Apple</Text>
                                    <FontAwesome name="apple" size={20} color={colors.text} />
                                </View>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={{ padding: 16, alignItems: 'center' }} onPress={handleRestore}>
                            <Text style={{ color: colors.textSecondary, textDecorationLine: 'underline' }}>Forzar Sincronización de Compras</Text>
                        </TouchableOpacity>
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
                {/* Header with Secret Gesture on the Icon */}
                <View style={styles.header}>
                    <TouchableOpacity activeOpacity={0.8} onPress={handleSecretTap} style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                        <FontAwesome name="star" size={32} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Miga Premium</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Desbloquea todo el potencial de tu negocio
                    </Text>
                </View>

                {/* Features */}
                <View style={[styles.featuresCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>¿Qué obtienes?</Text>
                    {PREMIUM_FEATURES.map((feature, index) => (
                        <View key={index} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                            <FontAwesome name={feature.icon as any} size={18} color={colors.primary} />
                            <View style={styles.featureText}>
                                <Text style={[styles.featureLabel, { color: colors.text }]}>{feature.label}</Text>
                                <Text style={[styles.freeLimit, { color: colors.textMuted }]}>Gratis: {feature.free}</Text>
                            </View>
                            <FontAwesome name="check-circle" size={20} color={colors.success} />
                        </View>
                    ))}
                </View>

                {/* Official In-App Purchases (RevenueCat Paywall) */}
                <View style={[styles.paymentCard, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text, textAlign: 'center', marginBottom: Spacing.lg }]}>
                        Ofertas y Planes
                    </Text>

                    <TouchableOpacity
                        style={[styles.iapButton, { backgroundColor: colors.primary, opacity: isPresenting ? 0.7 : 1 }]}
                        onPress={handlePresentPaywall}
                        disabled={isPresenting}
                    >
                        <View style={styles.iapButtonContent}>
                            <Text style={styles.iapButtonTitle}>Ver Planes y Suscribirse</Text>
                            {isPresenting ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <FontAwesome name="chevron-right" size={16} color="#FFF" />
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.restoreButton}
                        onPress={handleRestore}
                        disabled={purchasing}
                    >
                        <Text style={[styles.restoreButtonText, { color: colors.primary }]}>¿Ya la compraste? Restaurar Compras</Text>
                    </TouchableOpacity>
                </View>

                {/* Alternative Payments (Hidden behind developer gesture) */}
                {showDevMenu && (
                    <>
                        <View style={[styles.paymentCard, { backgroundColor: colors.surfaceSecondary }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Medios Alternativos (Solo Venezuela)</Text>
                            {/* ... (Payment info similar to before) */}
                            <View style={styles.step}>
                                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}><Text style={styles.stepNumberText}>1</Text></View>
                                <Text style={[styles.stepText, { color: colors.textSecondary }]}>Realiza el pago por Pago Móvil o PayPal:</Text>
                            </View>

                            <View style={[styles.paymentDetails, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.paymentLabel, { color: colors.textMuted }]}>Pago Móvil:</Text>
                                <Text style={[styles.paymentValue, { color: colors.text }]}>{PAYMENT_INFO.pagoMovil.banco} | {PAYMENT_INFO.pagoMovil.telefono}</Text>
                                <Text style={[styles.paymentValue, { color: colors.text }]}>C.I.: {PAYMENT_INFO.pagoMovil.cedula}</Text>
                                <Text style={[styles.paymentLabel, { color: colors.textMuted, marginTop: Spacing.sm }]}>PayPal:</Text>
                                <Text style={[styles.paymentValue, { color: colors.text }]}>{PAYMENT_INFO.paypal}</Text>
                            </View>

                            <TouchableOpacity style={[styles.contactButton, { borderColor: colors.primary }]} onPress={handleContactSupport}>
                                <FontAwesome name="whatsapp" size={18} color={colors.primary} />
                                <Text style={[styles.contactButtonText, { color: colors.primary }]}>Contactar por WhatsApp</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.codeCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>¿Tienes un código?</Text>
                            <TextInput
                                style={[styles.codeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                placeholder="XXXX-XXXX-XXXX"
                                placeholderTextColor={colors.textMuted}
                                value={code}
                                onChangeText={setCode}
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                            <TouchableOpacity style={[styles.redeemButton, { backgroundColor: colors.primary }]} onPress={handleRedeemCode} disabled={redeeming}>
                                {redeeming ? <ActivityIndicator color="#FFF" /> : <><FontAwesome name="unlock" size={18} color="#FFF" /><Text style={styles.redeemButtonText}>Activar Código</Text></>}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                {/* Legal Links (Apple Guideline 3.1.2 Requirement) */}
                <View style={{ marginTop: 24, paddingHorizontal: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 }}>
                        El pago se cargará a tu cuenta de Apple ID en la confirmación de la compra. La suscripción se renueva automáticamente a menos que se cancele al menos 24 horas antes del final del período actual.
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                            <Text style={{ fontSize: 13, color: colors.primary, textDecorationLine: 'underline' }}>Términos de Uso (EULA)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/privacy/')}>
                            <Text style={{ fontSize: 13, color: colors.primary, textDecorationLine: 'underline' }}>Política de Privacidad</Text>
                        </TouchableOpacity>
                    </View>
                </View>

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
    iapButton: {
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 60,
    },
    iapButtonContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
    },
    iapButtonTitle: {
        color: '#FFF',
        ...Typography.bodyBold,
        fontSize: 16,
    },
    iapButtonPrice: {
        color: '#FFF',
        ...Typography.title,
        fontSize: 18,
    },
    restoreButton: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        marginTop: Spacing.sm,
    },
    restoreButtonText: {
        ...Typography.body,
        textDecorationLine: 'underline',
    }
});


