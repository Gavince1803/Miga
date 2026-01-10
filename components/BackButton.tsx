import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function BackButton({ color }: { color?: string }) {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const iconColor = color || colors.tint;

    return (
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
            <FontAwesome name="chevron-left" size={20} color={iconColor} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingRight: 16,
        paddingVertical: 8,
        position: 'relative',
        zIndex: 10,
        marginLeft: -4, // Align visually with left edge
    },
});
