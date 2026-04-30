import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useInventory } from '@/hooks/useInventory';
import { useSubscription } from '@/hooks/useSubscription';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const UNIT_OPTIONS = [
    { label: 'Kilogramo', value: 'kg' },
    { label: 'Gramo', value: 'g' },
    { label: 'Litro', value: 'l' },
    { label: 'Mililitro', value: 'ml' },
    { label: 'Unidad', value: 'u' },
];

export default function AddItemScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { addItem, inventory } = useInventory(); // Destructure inventory to check count
    const { showAlert } = useAlert();
    const { isPremium } = useSubscription();

    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('kg');
    const [price, setPrice] = useState('');
    const [minStock, setMinStock] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const costPerUnit = (() => {
        const q = parseFloat(quantity.replace(',', '.'));
        const p = parseFloat(price.replace(',', '.'));
        if (!isNaN(q) && !isNaN(p) && q > 0) {
            return p / q;
        }
        return 0;
    })();

    const handleSave = async () => {
        if (isSubmitting) return;

        if (!name.trim()) {
            showAlert({ title: 'Error', message: 'El nombre es requerido', type: 'error' });
            return;
        }

        // Check Premium Limit (Max 20 inventory items)
        if (!isPremium && inventory.length >= 20) {
            showAlert({
                title: 'Límite Alcanzado',
                message: 'Has alcanzado el límite de 20 ingredientes gratuitos.\n\nSuscríbete a Premium para inventario ilimitado y control de costos avanzado.',
                type: 'warning',
                buttons: [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Premium', onPress: () => router.push('/premium') }
                ]
            });
            return;
        }

        const q = parseFloat(quantity.replace(',', '.')) || 0;
        const min = parseFloat(minStock.replace(',', '.')) || undefined;

        setIsSubmitting(true);
        const success = await addItem({
            name: name.trim(),
            quantity: q,
            unit,
            category: category.trim() || 'General',
            minStock: min || 0,
            costPerUnit: costPerUnit || 0,
        });

        if (success) {
            router.back();
        } else {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <FontAwesome name="arrow-left" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Nuevo Ingrediente</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Nombre */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej: Harina de trigo"
                            placeholderTextColor={colors.textMuted}
                            autoFocus
                        />
                    </View>

                    {/* Categoría */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Categoría</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            value={category}
                            onChangeText={setCategory}
                            placeholder="General"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>

                    {/* Compré... */}
                    <View style={[styles.purchaseCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.purchaseTitle, { color: colors.primary }]}>
                            💰 Compré...
                        </Text>

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Cantidad</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    placeholder="1"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Pagué ($)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={price}
                                    onChangeText={setPrice}
                                    placeholder="5.00"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Unit pills */}
                        <View style={styles.unitRow}>
                            {UNIT_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.unitPill,
                                        { backgroundColor: unit === opt.value ? colors.primary : colors.border }
                                    ]}
                                    onPress={() => setUnit(opt.value)}
                                >
                                    <Text style={{ color: unit === opt.value ? '#FFF' : colors.text, fontWeight: '600' }}>
                                        {opt.value.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Cost display */}
                        {costPerUnit > 0 && (
                            <View style={styles.costDisplay}>
                                <Text style={{ color: colors.textSecondary }}>Costo por {unit}:</Text>
                                <Text style={[styles.costValue, { color: colors.success }]}>
                                    ${costPerUnit.toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Stock mínimo */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Stock mínimo (alerta)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                            value={minStock}
                            onChangeText={setMinStock}
                            placeholder="5"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                        />
                    </View>
                </ScrollView>

                {/* Save Button */}
                <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: isSubmitting ? colors.border : colors.primary }]}
                        onPress={handleSave}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <FontAwesome name="check" size={20} color="#FFF" />
                                <Text style={styles.saveButtonText}>Agregar Ingrediente</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        ...Typography.title,
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        ...Typography.caption,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        height: 50,
        textAlignVertical: 'center', // Android
        ...Typography.body,
    },
    purchaseCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.md,
    },
    purchaseTitle: {
        fontWeight: '600',
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    unitRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    unitPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    costDisplay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    costValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    footer: {
        padding: Spacing.md,
        borderTopWidth: 1,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
});
