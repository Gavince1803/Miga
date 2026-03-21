import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Parses both query string and hash fragment from a URL into a flat object
function parseUrlTokens(url: string): Record<string, string> {
    const result: Record<string, string> = {};
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');

    if (queryIndex !== -1) {
        const queryStr = url.slice(queryIndex + 1, hashIndex > queryIndex ? hashIndex : undefined);
        new URLSearchParams(queryStr).forEach((v, k) => { result[k] = v; });
    }
    if (hashIndex !== -1) {
        const hashStr = url.slice(hashIndex + 1);
        new URLSearchParams(hashStr).forEach((v, k) => { if (!result[k]) result[k] = v; });
    }
    return result;
}

export default function ResetPasswordScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert();
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState(false);
    const params = useLocalSearchParams();
    const resolved = useRef(false);
    // Store tokens without creating a session yet — session is only set on save
    const pendingTokens = useRef<{ code?: string; access_token?: string; refresh_token?: string }>({});

    useEffect(() => {
        if (resolved.current) return;

        const establish = async () => {
            let tokens: Record<string, string> = {};
            Object.entries(params).forEach(([k, v]) => {
                if (typeof v === 'string') tokens[k] = v;
            });

            if (!tokens.code && !tokens.access_token) {
                try {
                    const url = await Linking.getInitialURL();
                    if (url) tokens = { ...parseUrlTokens(url), ...tokens };
                } catch {}
            }


            const { code, access_token, refresh_token, error_code } = tokens;

            if (error_code) {
                resolved.current = true;
                setSessionError(true);
                return;
            }

            if (code) {
                resolved.current = true;
                pendingTokens.current = { code };
                setSessionReady(true);
                return;
            }

            if (access_token && refresh_token) {
                resolved.current = true;
                pendingTokens.current = { access_token, refresh_token };
                setSessionReady(true);
                return;
            }

            if (Object.keys(params).length === 0) return;

            resolved.current = true;
            setSessionError(true);
        };

        establish();

        const timeout = setTimeout(() => {
            if (!resolved.current) {
                resolved.current = true;
                setSessionError(true);
            }
        }, 3000);
        return () => clearTimeout(timeout);
    }, [params]);

    const handleSave = async () => {
        if (loading) return;
        if (!password || !confirmPassword) {
            showAlert({ title: 'Campos requeridos', message: 'Por favor completa ambos campos.', type: 'warning' });
            return;
        }
        if (password !== confirmPassword) {
            showAlert({ title: 'Error', message: 'Las contraseñas no coinciden.', type: 'error' });
            return;
        }
        if (password.length < 6) {
            showAlert({ title: 'Contraseña muy corta', message: 'Debe tener al menos 6 caracteres.', type: 'warning' });
            return;
        }

        setLoading(true);

        // Establish session now (deferred until user actually submits)
        const { code, access_token, refresh_token } = pendingTokens.current;
        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
                setLoading(false);
                showAlert({ title: 'Error', message: 'El enlace expiró. Solicita uno nuevo.', type: 'error' });
                return;
            }
        } else if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
                setLoading(false);
                showAlert({ title: 'Error', message: 'El enlace expiró. Solicita uno nuevo.', type: 'error' });
                return;
            }
        }

        const { error } = await supabase.auth.updateUser({ password });

        // Sign out immediately so the user lands on login, not the app
        await supabase.auth.signOut();
        setLoading(false);

        if (error) {
            showAlert({ title: 'Error', message: error.message, type: 'error' });
        } else {
            showAlert({
                title: '¡Listo!',
                message: 'Tu contraseña ha sido actualizada.',
                type: 'success',
                buttons: [{ text: 'Iniciar Sesión', onPress: () => router.replace('/auth/login') }],
            });
        }
    };

    if (!sessionReady && !sessionError) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: Spacing.md }}>Verificando enlace...</Text>
            </SafeAreaView>
        );
    }

    if (sessionError) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg }}>
                <FontAwesome name="exclamation-circle" size={48} color={colors.error} />
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: Spacing.lg, textAlign: 'center' }}>
                    Enlace inválido o expirado
                </Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm }}>
                    Solicita un nuevo enlace de recuperación.
                </Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary, marginTop: Spacing.xl }]}
                    onPress={() => router.replace('/auth/forgot-password')}
                >
                    <Text style={styles.buttonText}>Volver a intentar</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <FontAwesome name="key" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Nueva Contraseña</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Elige una contraseña segura.
                        </Text>
                    </View>

                    <View style={[styles.formContainer, { backgroundColor: colors.surface }, Shadows.md]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Nueva Contraseña</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                onChangeText={setPassword}
                                value={password}
                                secureTextEntry
                                placeholder="Mínimo 6 caracteres"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
                                autoFocus
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Confirmar Contraseña</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                onChangeText={setConfirmPassword}
                                value={confirmPassword}
                                secureTextEntry
                                placeholder="Repite la contraseña"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
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
                            onPress={handleSave}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Guardando...' : 'GUARDAR CONTRASEÑA'}
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
