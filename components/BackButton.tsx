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
    const iconColor = color || colors.text;

    return (
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.surface }]}>
            <FontAwesome name="chevron-left" size={16} color={iconColor} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});
