import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

// Validation message right under the field that caused it (instead of an "Error" modal)
export function FieldError({ message, colors }: { message?: string; colors: typeof Colors.light }) {
    if (!message) return null;
    return (
        <Text style={[styles.text, { color: colors.statusText.cancelado }]} accessibilityLiveRegion="polite">
            {message}
        </Text>
    );
}

const styles = StyleSheet.create({
    text: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 6,
    },
});
