import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Spacing } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { Currency } from '@/context/SettingsContext';
import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getLocales } from 'expo-localization';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Google stays hidden until its client IDs are configured
const GOOGLE_ENABLED = !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (GOOGLE_ENABLED) {
    GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
}

const REGION_CURRENCY: Record<string, Currency> = {
    VE: 'VES', US: 'USD', MX: 'MXN', AR: 'ARS', CO: 'COP', CL: 'CLP',
};

/**
 * Social sign-in skips the register form, so a brand-new account has no
 * currency (the profile falls back to VES). Pick it from the phone's region,
 * and save Apple's name, which Apple only sends on the very first sign-in.
 * Accounts that also have an email login (linked by same email) are left alone.
 */
async function completeNewSocialProfile(user: User, fullName?: string) {
    if (user.user_metadata?.currency) return;
    if (user.identities?.some(i => i.provider === 'email')) return;

    const currency = REGION_CURRENCY[getLocales()[0]?.regionCode ?? ''] ?? 'USD';
    const name = fullName ? { full_name: fullName } : {};

    // Profile first: updateUser fires USER_UPDATED, which makes SettingsContext
    // re-read the profile and pick up this currency
    await supabase.from('profiles').update({ currency, ...name }).eq('id', user.id);
    await supabase.auth.updateUser({ data: { currency, ...name } });
}

export default function SocialSignIn() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showAlert } = useAlert();
    const [appleAvailable, setAppleAvailable] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }, []);

    const showError = (error: unknown) => {
        console.error('Social sign-in error:', error);
        showAlert({ title: 'Error', message: 'No se pudo iniciar sesión. Intenta de nuevo.', type: 'error' });
    };

    async function signInWithApple() {
        setLoading(true);
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });
            if (!credential.identityToken) throw new Error('Apple did not return an identityToken');

            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: credential.identityToken,
            });
            if (error) throw error;

            const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
            await completeNewSocialProfile(data.user, fullName || undefined);
        } catch (error: any) {
            if (error?.code !== 'ERR_REQUEST_CANCELED') showError(error);
        } finally {
            setLoading(false);
        }
    }

    async function signInWithGoogle() {
        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();
            if (!isSuccessResponse(response)) return; // cancelled
            if (!response.data.idToken) throw new Error('Google did not return an idToken');

            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: response.data.idToken,
            });
            if (error) throw error;

            await completeNewSocialProfile(data.user);
        } catch (error) {
            showError(error);
        } finally {
            setLoading(false);
        }
    }

    if (!appleAvailable && !GOOGLE_ENABLED) return null;

    return (
        <View style={styles.container}>
            <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>o continúa con</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {appleAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={colorScheme === 'dark'
                        ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                        : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={BorderRadius.md}
                    style={[styles.button, loading && { opacity: 0.5 }]}
                    onPress={() => { if (!loading) signInWithApple(); }}
                />
            )}

            {GOOGLE_ENABLED && (
                <TouchableOpacity
                    style={[styles.button, styles.googleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={signInWithGoogle}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Continuar con Google"
                >
                    <Ionicons name="logo-google" size={18} color={colors.text} />
                    <Text style={[styles.googleText, { color: colors.text }]}>Continuar con Google</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 13,
    },
    button: {
        height: 48,
        width: '100%',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
    },
    googleText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
