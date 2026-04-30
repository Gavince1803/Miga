import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DISMISSED_KEY = 'reengagement_banner_dismissed';
const DAYS_THRESHOLD = 7;
const ORDERS_THRESHOLD = 3;

interface Props {
    ordersCount: number;
    inventoryCount: number;
}

export default function ReEngagementBanner({ ordersCount, inventoryCount }: Props) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const router = useRouter();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        async function evaluate() {
            try {
                // Already dismissed?
                const dismissed = await AsyncStorage.getItem(DISMISSED_KEY);
                if (dismissed === 'true') return;

                // User registered less than 7 days ago?
                if (!user?.created_at) return;
                const registeredAt = new Date(user.created_at);
                const daysSinceRegistration =
                    (Date.now() - registeredAt.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceRegistration < DAYS_THRESHOLD) return;

                // Less than 3 orders?
                if (ordersCount < ORDERS_THRESHOLD) return;

                // Already has inventory items?
                if (inventoryCount > 0) return;

                // Already has recipes?
                const { count } = await supabase
                    .from('recipes')
                    .select('id', { count: 'exact', head: true });
                if ((count ?? 0) > 0) return;

                setVisible(true);
            } catch (e) {
                // Silently fail — non-critical UI
            }
        }

        evaluate();
    }, [user, ordersCount, inventoryCount]);

    const handleDismiss = async () => {
        setVisible(false);
        await AsyncStorage.setItem(DISMISSED_KEY, 'true');
    };

    const handleCTA = () => {
        router.push('/(tabs)/recipes' as any);
    };

    if (!visible) return null;

    return (
        <View
            style={[
                styles.banner,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary + '40',
                },
                Shadows.md,
            ]}
        >
            {/* Dismiss button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <FontAwesome name="times" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Icon */}
            <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '18' }]}>
                <Text style={styles.emoji}>🍰</Text>
            </View>

            {/* Copy */}
            <Text style={[styles.title, { color: colors.text }]}>
                ¿Ya conoces el recetario?
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
                Calcula el costo exacto de tus tortas y gestiona tu inventario 🍰
            </Text>

            {/* CTA */}
            <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary }]}
                onPress={handleCTA}
                activeOpacity={0.8}
            >
                <FontAwesome name="book" size={14} color="#FFF" />
                <Text style={styles.ctaText}>Ver Recetario</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        alignItems: 'flex-start',
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        padding: 4,
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    emoji: {
        fontSize: 22,
    },
    title: {
        ...Typography.bodyBold,
        marginBottom: 4,
        paddingRight: Spacing.lg,
    },
    body: {
        ...Typography.body,
        lineHeight: 22,
        marginBottom: Spacing.md,
        paddingRight: Spacing.xs,
    },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.sm,
    },
    ctaText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
