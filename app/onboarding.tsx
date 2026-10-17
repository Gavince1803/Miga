import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Fonts, Shadows, Spacing } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ONBOARDING_KEY = 'miga_onboarding_completed';

export async function markOnboardingComplete() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

// One screen instead of four slides: get to a first win (a real price) as fast as possible
export default function OnboardingScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    const handleTryExample = async () => {
        await markOnboardingComplete();
        router.replace('/(tabs)');
        router.push('/calculator?example=1' as any);
    };

    const handleSkip = async () => {
        await markOnboardingComplete();
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <View style={styles.heroImageWrapper}>
                    <Image
                        source={require('@/assets/images/icon.png')}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>
                    ¿A cuánto deberías{'\n'}vender tus tortas?
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Miga calcula el costo real de cada receta y te sugiere un precio justo. Pruébalo con una torta de ejemplo: toma 10 segundos.
                </Text>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.primaryStrong }, Shadows.md]}
                    onPress={handleTryExample}
                    activeOpacity={0.8}
                >
                    <Ionicons name="calculator-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Calcular una torta de ejemplo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
                    <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                        Ir a mi agenda
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    heroImageWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        marginBottom: Spacing.xl,
        ...Shadows.lg,
    },
    heroImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    title: {
        fontFamily: Fonts.serif,
        fontSize: 30,
        lineHeight: 38,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
    },
    controls: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.xl,
        paddingTop: Spacing.md,
        gap: Spacing.sm,
    },
    primaryButton: {
        height: 54,
        borderRadius: BorderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    secondaryButton: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
