import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { CURRENCIES, Currency } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert();
    const router = useRouter();

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [currency, setCurrency] = useState<Currency>('VES');
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [businessNameExists, setBusinessNameExists] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleFullNameChange = (text: string) => {
        setFullName(text);
        setBusinessNameExists(false);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (text.trim().length < 2) return;
        debounceRef.current = setTimeout(async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id')
                .ilike('full_name', text.trim())
                .limit(1);
            setBusinessNameExists(!!data && data.length > 0);
        }, 600);
    };

    async function signUp() {
        if (loading) return;
        setLoading(true);

        if (!email || !password || !fullName) {
            showAlert({ title: 'Campos requeridos', message: 'Por favor completa al menos Nombre, Correo y Contraseña.', type: 'warning' });
            setLoading(false);
            return;
        }
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone,
                    currency: currency,
                }
            }
        });

        if (error) {
            showAlert({ title: 'Error', message: error.message, type: 'error' });
        } else {
            showAlert({
                title: 'Registro exitoso',
                message: 'Cuenta creada correctamente. Por favor verifica tu correo o inicia sesión.',
                type: 'success',
                buttons: [{ text: 'OK', onPress: () => router.push('/auth/login') }]
            });
        }
        setLoading(false);
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <FontAwesome name="arrow-left" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <View style={styles.logoContainer}>
                            <FontAwesome name="user-plus" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Crear Cuenta</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Únete a Miga y gestiona tu negocio
                        </Text>
                    </View>

                    <View style={[styles.formContainer, { backgroundColor: colors.surface }, Shadows.md]}>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Nombre o Negocio *</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: businessNameExists ? colors.warning ?? '#F59E0B' : colors.border }]}
                                onChangeText={handleFullNameChange}
                                value={fullName}
                                placeholder="Ej: Marcela Bollería"
                                placeholderTextColor={colors.textMuted}
                            />
                            {businessNameExists && (
                                <Text style={{ color: colors.warning ?? '#F59E0B', fontSize: 12, marginTop: 4 }}>
                                    Ya existe un negocio con este nombre. ¿Ya tienes cuenta?
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Teléfono (Opcional)</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                onChangeText={setPhone}
                                value={phone}
                                placeholder="+58 412 1234567"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Correo Electrónico *</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                onChangeText={setEmail}
                                value={email}
                                placeholder="correo@ejemplo.com"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Contraseña *</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                onChangeText={setPassword}
                                value={password}
                                secureTextEntry={true}
                                placeholder="Ingresa tu contraseña"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Moneda Principal *</Text>
                            <TouchableOpacity
                                style={[styles.input, { justifyContent: 'center', borderColor: colors.border }]}
                                onPress={() => setShowCurrencyModal(true)}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ fontSize: 16, color: colors.text }}>
                                            {CURRENCIES[currency].label}
                                        </Text>
                                    </View>
                                    <FontAwesome name="chevron-down" size={14} color={colors.textMuted} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                {
                                    backgroundColor: colors.primary,
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 5,
                                    elevation: 5,
                                }
                            ]}
                            onPress={signUp}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Creando cuenta...' : 'REGISTRARME'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        </View>

                        <TouchableOpacity
                            style={{ alignItems: 'center', padding: Spacing.sm }}
                            onPress={() => router.push('/auth/login')}
                        >
                            <Text style={{ color: colors.textSecondary }}>
                                ¿Ya tienes cuenta? <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Inicia Sesión</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Currency Selector Modal */}
            <Modal
                visible={showCurrencyModal}
                transparent={true}
                animationType="slide"
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCurrencyModal(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Selecciona tu moneda</Text>
                            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                                <FontAwesome name="times" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={Object.entries(CURRENCIES)}
                            keyExtractor={([key]) => key}
                            renderItem={({ item: [key, val] }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.currencyOption,
                                        { borderBottomColor: colors.border },
                                        currency === key && { backgroundColor: colors.primary + '15' }
                                    ]}
                                    onPress={() => {
                                        setCurrency(key as Currency);
                                        setShowCurrencyModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.currencyLabel,
                                        { color: colors.text },
                                        currency === key && { color: colors.primary, fontWeight: 'bold' }
                                    ]}>
                                        {val.label}
                                    </Text>
                                    {currency === key && (
                                        <FontAwesome name="check" size={16} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.md,
    },
    header: {
        alignItems: 'center',
        marginVertical: Spacing.xl,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: Spacing.sm,
    },
    logoContainer: {
        marginBottom: Spacing.md,
        backgroundColor: '#FAF5EF',
        padding: Spacing.md,
        borderRadius: BorderRadius.full,
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    formContainer: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        marginBottom: Spacing.xs,
        fontSize: 14,
        fontWeight: '500',
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        fontSize: 16,
    },
    button: {
        height: 52,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5E5',
    },
    modalTitle: {
        ...Typography.bodyBold,
        fontSize: 18,
    },
    currencyOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    currencyLabel: {
        ...Typography.body,
        fontSize: 16,
    },
});
