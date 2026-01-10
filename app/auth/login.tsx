import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) Alert.alert('Error', error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) Alert.alert('Error', error.message);
        else Alert.alert('Registro exitoso', 'Por favor verifica tu correo electrónico (si aplica) o inicia sesión.');
        setLoading(false);
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <ScrollView
                contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <FontAwesome name="birthday-cake" size={48} color={colors.primary} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Agenda Repostera</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Gestiona tus pedidos e inventario
                    </Text>
                </View>

                <View style={[styles.formContainer, { backgroundColor: colors.surface }, Shadows.md]}>
                    <View style={styles.modeToggle}>
                        <Text style={[styles.formTitle, { color: colors.text }]}>
                            {isRegistering ? 'Crear Nueva Cuenta' : 'Bienvenido de Nuevo'}
                        </Text>
                        <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
                            {isRegistering ? 'Ingresa tus datos para registrarte' : 'Ingresa tus credenciales para continuar'}
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
                                backgroundColor: isRegistering ? colors.secondary : colors.primary,
                                // Add shadow/elevation distinction
                                shadowColor: isRegistering ? colors.secondary : colors.primary,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 5,
                                elevation: 5,
                            }
                        ]}
                        onPress={isRegistering ? signUpWithEmail : signInWithEmail}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Procesando...' : (isRegistering ? 'REGISTRARME' : 'INICIAR SESIÓN')}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        <Text style={[styles.dividerText, { color: colors.textMuted }]}>O</Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    </View>

                    <TouchableOpacity
                        style={[styles.switchButton, { borderColor: colors.primary }]}
                        onPress={() => setIsRegistering(!isRegistering)}
                    >
                        <Text style={[styles.switchText, { color: colors.primary }]}>
                            {isRegistering
                                ? '¿Ya tienes cuenta? Volver al inicio'
                                : '¿No tienes cuenta? Regístrate aquí'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
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
        backgroundColor: '#FAF5EF', // Light cream bg for logo
        padding: Spacing.lg,
        borderRadius: BorderRadius.full,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        fontFamily: 'Nunito', // Assuming standard font if Nunito fail, but style is nice
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
