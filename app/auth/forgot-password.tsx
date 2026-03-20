import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleResetPassword() {
        if (loading) return;
        if (!email.trim()) {
            showAlert({ title: 'Campo requerido', message: 'Por favor ingresa tu correo electrónico.', type: 'warning' });
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: 'miga://auth/reset-password',
        });
        setLoading(false);

        if (error) {
            showAlert({ title: 'Error', message: error.message, type: 'error' });
        } else {
            showAlert({
                title: 'Correo enviado',
                message: 'Revisa tu correo y haz clic en el enlace para restablecer tu contraseña.',
                type: 'success',
                buttons: [{ text: 'OK', onPress: () => router.back() }],
            });
        }
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
                            <FontAwesome name="lock" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Recuperar Contraseña</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                        </Text>
                    </View>

                    <View style={[styles.formContainer, { backgroundColor: colors.surface }, Shadows.md]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Correo Electrónico</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                onChangeText={setEmail}
                                value={email}
                                placeholder="correo@ejemplo.com"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoFocus
                            />
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
                                    opacity: loading ? 0.7 : 1,
                                },
                            ]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Enviando...' : 'ENVIAR ENLACE'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ alignItems: 'center', padding: Spacing.sm, marginTop: Spacing.sm }}
                            onPress={() => router.back()}
                        >
                            <Text style={{ color: colors.textSecondary }}>
                                Volver a <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Iniciar Sesión</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: Spacing.md,
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
});
