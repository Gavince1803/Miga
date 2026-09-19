import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function MoreRow({
    icon,
    label,
    onPress,
    colors,
}: {
    icon: string;
    label: string;
    onPress: () => void;
    colors: typeof Colors.light;
}) {
    return (
        <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={onPress}
        >
            <View style={[styles.rowIcon, { backgroundColor: colors.primary + '15' }]}>
                <FontAwesome name={icon as any} size={16} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
            <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>
    );
}

export default function MoreScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
                <MoreRow icon="line-chart" label="Finanzas" colors={colors} onPress={() => router.push('/finances')} />
                <MoreRow icon="bar-chart" label="Analytics" colors={colors} onPress={() => router.push('/analytics')} />
                <MoreRow icon="cog" label="Ajustes" colors={colors} onPress={() => router.push('/settings')} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingTop: Spacing.md,
    },
    card: {
        marginHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    rowLabel: {
        ...Typography.body,
        fontWeight: '500',
        flex: 1,
    },
});
