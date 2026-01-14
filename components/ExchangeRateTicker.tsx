import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function ExchangeRateTicker() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { bcv, parallel, euro, loading, error, refreshRates } = useExchangeRates();

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
            <View style={styles.rateColumn}>
                <View style={styles.rateRow}>
                    <Text style={[styles.currencyLabel, { color: colors.primary }]}>$</Text>
                    <Text style={[styles.value, { color: colors.text }]}>{bcv.toFixed(2)}</Text>
                    <Text style={[styles.subLabel, { color: colors.textSecondary }]}>BCV</Text>
                </View>
                <View style={styles.rateRow}>
                    <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>$</Text>
                    <Text style={[styles.value, { color: colors.text }]}>{parallel.toFixed(2)}</Text>
                    <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Par</Text>
                </View>
                <View style={styles.rateRow}>
                    <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>€</Text>
                    <Text style={[styles.value, { color: colors.text }]}>{euro ? euro.toFixed(2) : '--'}</Text>
                    <Text style={[styles.subLabel, { color: colors.textSecondary }]}>EUR</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 2,
        paddingHorizontal: 8,
    },
    rateColumn: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    currencyLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    value: {
        fontSize: 11,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    subLabel: {
        fontSize: 8,
        textTransform: 'uppercase',
        marginLeft: 1,
    },
    errorContainer: {
        padding: 4,
    },
    errorText: {
        fontSize: 10,
        color: 'red',
    },
});
