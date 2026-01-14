import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing } from '@/constants/Colors';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function ExchangeRateTicker() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { bcv, parallel, loading, error, refreshRates } = useExchangeRates();

    if (error) {
        return (
            <TouchableOpacity onPress={refreshRates} style={styles.errorContainer}>
                <Text style={styles.errorText}>Error tasas ↻</Text>
            </TouchableOpacity>
        );
    }

    if (loading && bcv === 0) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
        );
    }

    return (
        <TouchableOpacity onPress={refreshRates} style={styles.container}>
            <View style={styles.rateGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>BCV:</Text>
                <Text style={[styles.value, { color: colors.text }]}>{bcv.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.rateGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Par:</Text>
                <Text style={[styles.value, { color: colors.text }]}>{parallel.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.rateGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Eur:</Text>
                <Text style={[styles.value, { color: colors.text }]}>{euro ? euro.toFixed(2) : '--'}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        gap: Spacing.sm,
    },
    rateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
    },
    value: {
        fontSize: 10,
        fontWeight: '700',
    },
    divider: {
        width: 1,
        height: 10,
        backgroundColor: '#ccc',
    },
    errorContainer: {
        padding: 4,
    },
    errorText: {
        fontSize: 10,
        color: 'red',
    },
});
