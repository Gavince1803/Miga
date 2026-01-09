import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { PAYMENT_METHOD_OPTIONS, PaymentMethod, SIZE_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

function FormSection({
    title,
    children,
    colors
}: {
    title: string;
    children: React.ReactNode;
    colors: typeof Colors.light;
}) {
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {title}
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                {children}
            </View>
        </View>
    );
}

function FormField({
    label,
    required,
    children,
    colors,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    colors: typeof Colors.light;
}) {
    return (
        <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {label}
                {required && <Text style={{ color: colors.error }}> *</Text>}
            </Text>
            {children}
        </View>
    );
}

function ChipSelector({
    options,
    selected,
    onSelect,
    colors,
}: {
    options: readonly string[];
    selected: string;
    onSelect: (value: string) => void;
    colors: typeof Colors.light;
}) {
    return (
        <View style={styles.chipContainer}>
            {options.map((option) => (
                <TouchableOpacity
                    key={option}
                    onPress={() => onSelect(option)}
                    style={[
                        styles.chip,
                        {
                            backgroundColor: selected === option ? colors.primary : colors.surfaceSecondary,
                            borderColor: selected === option ? colors.primary : colors.border,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.chipText,
                            { color: selected === option ? '#FFFFFF' : colors.text },
                        ]}
                    >
                        {option}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

import { useOrders } from '@/hooks/useOrders';

export default function NewOrderScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // Form state
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [address, setAddress] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');
    const [size, setSize] = useState('20 cm');
    const [servings, setServings] = useState('');
    const [filling, setFilling] = useState('');
    const [cover, setCover] = useState('');
    const [occasion, setOccasion] = useState('');
    const [description, setDescription] = useState('');
    const [totalPrice, setTotalPrice] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pendiente');

    const { createOrder } = useOrders();
    const [submitting, setSubmitting] = useState(false);

    const handleSave = async () => {
        // Validate required fields
        if (!clientName.trim()) {
            Alert.alert('Error', 'El nombre del cliente es requerido');
            return;
        }
        if (!clientPhone.trim()) {
            Alert.alert('Error', 'El teléfono es requerido');
            return;
        }
        if (!deliveryDate.trim()) {
            Alert.alert('Error', 'La fecha de entrega es requerida');
            return;
        }
        if (!deliveryTime.trim()) {
            Alert.alert('Error', 'La hora de entrega es requerida');
            return;
        }

        setSubmitting(true);

        try {
            // Parse partial date
            const [day, month, year] = deliveryDate.split('/').map(Number);
            // Simple date parsing assuming DD/MM/YYYY or similar inputs
            // For production, a DatePicker is better. Here we try to construct a valid date.
            // If year is missing or short, assume current/next year logic or full year input.
            // For this MVP, let's assume user enters Valid ISO or readable format handled by new Date() 
            // OR strictly DD/MM/YYYY. Let's try to be robust.

            // Actually, let's just use string parsing if it's DD/MM/YYYY
            let parsedDeliveryDate = new Date();
            if (day && month && year) {
                parsedDeliveryDate = new Date(year, month - 1, day);
            } else {
                // Fallback try
                parsedDeliveryDate = new Date(deliveryDate);
            }

            if (isNaN(parsedDeliveryDate.getTime())) {
                Alert.alert('Error', 'Formato de fecha inválido. Use DD/MM/AAAA');
                setSubmitting(false);
                return;
            }

            const newOrder = await createOrder({
                clientName,
                clientPhone,
                address,
                orderDate: new Date(),
                deliveryDate: parsedDeliveryDate,
                deliveryTime,
                size,
                servings: servings ? parseInt(servings) : 0,
                filling,
                cover,
                occasion,
                description,
                totalPrice: totalPrice ? parseFloat(totalPrice) : 0,
                paymentMethod,
            });

            if (newOrder) {
                Alert.alert(
                    '¡Pedido Guardado!',
                    `Pedido para ${clientName} creado exitosamente.`,
                    [
                        { text: 'OK', onPress: () => router.back() }
                    ]
                );
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Ocurrió un error al guardar el pedido');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={[styles.container, { backgroundColor: colors.background }]}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Client Information */}
                <FormSection title="INFORMACIÓN DEL CLIENTE" colors={colors}>
                    <FormField label="Nombre del Cliente" required colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Ej: María García"
                            placeholderTextColor={colors.textMuted}
                            value={clientName}
                            onChangeText={setClientName}
                            autoCapitalize="words"
                        />
                    </FormField>

                    <FormField label="Teléfono" required colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Ej: +58 412 123 4567"
                            placeholderTextColor={colors.textMuted}
                            value={clientPhone}
                            onChangeText={setClientPhone}
                            keyboardType="phone-pad"
                        />
                    </FormField>

                    <FormField label="Domicilio / Dirección" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Dirección de entrega (opcional)"
                            placeholderTextColor={colors.textMuted}
                            value={address}
                            onChangeText={setAddress}
                        />
                    </FormField>
                </FormSection>

                {/* Delivery Information */}
                <FormSection title="ENTREGA" colors={colors}>
                    <FormField label="Fecha de Entrega" required colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="DD/MM/AAAA"
                            placeholderTextColor={colors.textMuted}
                            value={deliveryDate}
                            onChangeText={setDeliveryDate}
                            keyboardType="numbers-and-punctuation"
                        />
                    </FormField>

                    <FormField label="Hora de Entrega" required colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Ej: 14:00"
                            placeholderTextColor={colors.textMuted}
                            value={deliveryTime}
                            onChangeText={setDeliveryTime}
                        />
                    </FormField>
                </FormSection>

                {/* Product Details */}
                <FormSection title="DETALLES DEL PRODUCTO" colors={colors}>
                    <FormField label="Medida / Tamaño" colors={colors}>
                        <ChipSelector
                            options={SIZE_OPTIONS}
                            selected={size}
                            onSelect={setSize}
                            colors={colors}
                        />
                    </FormField>

                    <FormField label="Cantidad de Personas" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Ej: 20"
                            placeholderTextColor={colors.textMuted}
                            value={servings}
                            onChangeText={setServings}
                            keyboardType="number-pad"
                        />
                    </FormField>

                    <FormField label="Relleno" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Ej: Arequipe, Frutos Rojos, Chocolate"
                            placeholderTextColor={colors.textMuted}
                            value={filling}
                            onChangeText={setFilling}
                        />
                    </FormField>

                    <FormField label="Cubierta" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Ej: Buttercream, Fondant, Crema"
                            placeholderTextColor={colors.textMuted}
                            value={cover}
                            onChangeText={setCover}
                        />
                    </FormField>

                    <FormField label="Motivo / Ocasión" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Ej: Cumpleaños, Boda, Baby Shower"
                            placeholderTextColor={colors.textMuted}
                            value={occasion}
                            onChangeText={setOccasion}
                        />
                    </FormField>

                    <FormField label="Descripción" colors={colors}>
                        <TextInput
                            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                            placeholder="Describe los detalles del pedido, decoración, colores, etc."
                            placeholderTextColor={colors.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </FormField>
                </FormSection>

                {/* Decoration Sketch */}
                <FormSection title="DECORACIÓN" colors={colors}>
                    <TouchableOpacity
                        style={[styles.imageUpload, { borderColor: colors.border }]}
                        onPress={() => Alert.alert('Próximamente', 'Podrás agregar fotos o bocetos de la decoración')}
                    >
                        <FontAwesome name="camera" size={32} color={colors.textMuted} />
                        <Text style={[styles.imageUploadText, { color: colors.textMuted }]}>
                            Agregar foto o boceto
                        </Text>
                        <Text style={[styles.imageUploadHint, { color: colors.textMuted }]}>
                            Toca para subir imagen
                        </Text>
                    </TouchableOpacity>
                </FormSection>

                {/* Payment */}
                <FormSection title="PAGO" colors={colors}>
                    <FormField label="Precio Total" colors={colors}>
                        <View style={styles.priceInput}>
                            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                            <TextInput
                                style={[styles.input, styles.priceField, { color: colors.text }]}
                                placeholder="0.00"
                                placeholderTextColor={colors.textMuted}
                                value={totalPrice}
                                onChangeText={setTotalPrice}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </FormField>

                    <FormField label="Forma de Pago" colors={colors}>
                        <View style={styles.paymentOptions}>
                            {PAYMENT_METHOD_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => setPaymentMethod(option.value)}
                                    style={[
                                        styles.paymentOption,
                                        {
                                            backgroundColor: paymentMethod === option.value ? colors.primary : colors.surfaceSecondary,
                                            borderColor: paymentMethod === option.value ? colors.primary : colors.border,
                                        },
                                    ]}
                                >
                                    <FontAwesome
                                        name={option.value === 'efectivo' ? 'money' : option.value === 'transferencia' ? 'exchange' : 'clock-o'}
                                        size={16}
                                        color={paymentMethod === option.value ? '#FFFFFF' : colors.text}
                                    />
                                    <Text
                                        style={[
                                            styles.paymentOptionText,
                                            { color: paymentMethod === option.value ? '#FFFFFF' : colors.text },
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </FormField>
                </FormSection>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }, Shadows.md]}
                    onPress={handleSave}
                    disabled={submitting}
                >
                    {submitting ? (
                        <Text style={styles.saveButtonText}>Guardando...</Text>
                    ) : (
                        <>
                            <FontAwesome name="check" size={20} color="#FFFFFF" />
                            <Text style={styles.saveButtonText}>Guardar Pedido</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.small,
        fontWeight: '600',
        letterSpacing: 1,
        marginLeft: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    sectionCard: {
        marginHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    field: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    fieldLabel: {
        ...Typography.caption,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    input: {
        ...Typography.body,
        paddingVertical: 4,
    },
    textArea: {
        ...Typography.body,
        borderWidth: 1,
        borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
        minHeight: 100,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: 4,
    },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    chipText: {
        ...Typography.caption,
        fontWeight: '500',
    },
    imageUpload: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        margin: Spacing.md,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: BorderRadius.md,
    },
    imageUploadText: {
        ...Typography.body,
        marginTop: Spacing.sm,
    },
    imageUploadHint: {
        ...Typography.small,
        marginTop: 4,
    },
    priceInput: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencySymbol: {
        ...Typography.subtitle,
        marginRight: Spacing.sm,
    },
    priceField: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
    },
    paymentOptions: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginTop: 4,
    },
    paymentOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xs,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        gap: 4,
        minHeight: 44,
    },
    paymentOptionText: {
        fontSize: 11,
        fontWeight: '600',
        flexShrink: 1,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
    },
    saveButtonText: {
        color: '#FFFFFF',
        ...Typography.bodyBold,
        fontSize: 17,
    },
});
