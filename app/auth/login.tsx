import SocialSignIn from '@/components/SocialSignIn';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Fonts, Shadows, Spacing } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) showAlert({ title: 'Error', message: error.message, type: 'error' });
        setLoading(false);
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('@/assets/images/icon.png')}
                                style={{ width: 90, height: 90, borderRadius: 45 }}
                                resizeMode="cover"
                            />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Miga</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Gestiona tus pedidos e inventario
                        </Text>
                    </View>

                    <View style={[styles.formContainer, { backgroundColor: colors.surface }, Shadows.md]}>
                        <View style={styles.modeToggle}>
                            <Text style={[styles.formTitle, { color: colors.text }]}>
                                Bienvenido de Nuevo
                            </Text>
                            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                                Ingresa tus credenciales para continuar
                            </Text>
                        </View>

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
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Contraseña</Text>
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

                        <TouchableOpacity
                            style={[
                                styles.button,
                                {
                                    backgroundColor: colors.primaryStrong,
                                    shadowColor: colors.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 5,
                                    elevation: 5,
                                }
                            ]}
                            onPress={signInWithEmail}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Procesando...' : 'INICIAR SESIÓN'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ alignItems: 'center', paddingTop: Spacing.md }}
                            onPress={() => router.push('/auth/forgot-password')}
                        >
                            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                                ¿Olvidé mi contraseña?
                            </Text>
                        </TouchableOpacity>

                        <SocialSignIn />

                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        </View>

                        <TouchableOpacity
                            style={{ alignItems: 'center', padding: Spacing.sm }}
                            onPress={() => router.push('/auth/register')}
                        >
                            <Text style={{ color: colors.textSecondary }}>
                                ¿No tienes cuenta? <Text style={{ color: colors.primaryText, fontWeight: 'bold' }}>Regístrate aquí</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: Spacing.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
        marginTop: Spacing.xl,
    },
    logoContainer: {
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 28,
        fontFamily: Fonts.serif,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 16,
    },
    formContainer: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginHorizontal: Spacing.sm,
    },
    modeToggle: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    formTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'center',
    },
    formSubtitle: {
        fontSize: 14,
        textAlign: 'center',
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
        textAlignVertical: 'center',
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
    dividerText: {
        paddingHorizontal: Spacing.md,
        fontSize: 14,
        fontWeight: '500',
    },
    switchButton: {
        height: 52,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    switchText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
