import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/lib/supabase';
import { PAYMENT_METHOD_OPTIONS, PaymentMethod, SIZE_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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

function FormSection({ title, children, colors }: { title: string; children: React.ReactNode; colors: typeof Colors.light }) {
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                {children}
            </View>
        </View>
    );
}

function FormField({ label, required, children, colors }: { label: string; required?: boolean; children: React.ReactNode; colors: typeof Colors.light }) {
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

function ChipSelector({ options, selected, onSelect, colors }: { options: readonly string[]; selected: string; onSelect: (value: string) => void; colors: typeof Colors.light }) {
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
                    <Text style={[styles.chipText, { color: selected === option ? '#FFFFFF' : colors.text }]}>
                        {option}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

export default function EditOrderScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { id } = useLocalSearchParams();
    const { updateOrder } = useOrders();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

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

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (data) {
                    setClientName(data.client_name);
                    setClientPhone(data.client_phone);
                    setAddress(data.address || '');
                    // Format date to DD/MM/YYYY for input
                    const dateObj = new Date(data.delivery_date);
                    // Adjust because data.delivery_date is YYYY-MM-DD string often
                    // Actually, if it comes as string YYYY-MM-DD from DB:
                    const parts = data.delivery_date.split('-');
                    if (parts.length === 3) {
                        setDeliveryDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
                    }

                    setDeliveryTime(data.delivery_time);
                    setSize(data.size || '20 cm');
                    setServings(data.servings ? data.servings.toString() : '');
                    setFilling(data.filling || '');
                    setCover(data.cover || '');
                    setOccasion(data.occasion || '');
                    setDescription(data.description || '');
                    setTotalPrice(data.total_price.toString());
                    setPaymentMethod(data.payment_method);
                }
            } catch (error) {
                Alert.alert('Error', 'No se pudo cargar el pedido');
                router.back();
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const handleSave = async () => {
        if (!clientName.trim() || !clientPhone.trim() || !deliveryDate.trim() || !deliveryTime.trim()) {
            Alert.alert('Error', 'Por favor completa los campos obligatorios');
            return;
        }

        setSubmitting(true);

        try {
            // Parse partial date
            const [day, month, year] = deliveryDate.split('/').map(Number);
            let parsedDeliveryDate = new Date();
            if (day && month && year) {
                parsedDeliveryDate = new Date(year, month - 1, day);
            } else {
                // Fallback
                parsedDeliveryDate = new Date();
            }

            if (isNaN(parsedDeliveryDate.getTime())) {
                Alert.alert('Error', 'Formato de fecha inválido. Use DD/MM/AAAA');
                setSubmitting(false);
                return;
            }

            const updated = await updateOrder(id as string, {
                clientName,
                clientPhone,
                address,
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

            if (updated) {
                Alert.alert('Éxito', 'Pedido actualizado correctamente', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo actualizar');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

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
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Editar Pedido</Text>
                </View>

                {/* Client Information */}
                <FormSection title="INFORMACIÓN DEL CLIENTE" colors={colors}>
                    <FormField label="Nombre del Cliente" required colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={clientName}
                            onChangeText={setClientName}
                        />
                    </FormField>

                    <FormField label="Teléfono" required colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={clientPhone}
                            onChangeText={setClientPhone}
                            keyboardType="phone-pad"
                        />
                    </FormField>

                    <FormField label="Domicilio / Dirección" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={address}
                            onChangeText={setAddress}
                        />
                    </FormField>
                </FormSection>

                {/* Delivery Information */}
                <FormSection title="ENTREGA" colors={colors}>
                    <FormField label="Fecha de Entrega (DD/MM/AAAA)" required colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={deliveryDate}
                            onChangeText={setDeliveryDate}
                        />
                    </FormField>

                    <FormField label="Hora de Entrega" required colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
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
                            value={servings}
                            onChangeText={setServings}
                            keyboardType="number-pad"
                        />
                    </FormField>

                    <FormField label="Relleno" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={filling}
                            onChangeText={setFilling}
                        />
                    </FormField>

                    <FormField label="Cubierta" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={cover}
                            onChangeText={setCover}
                        />
                    </FormField>

                    <FormField label="Motivo / Ocasión" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={occasion}
                            onChangeText={setOccasion}
                        />
                    </FormField>

                    <FormField label="Descripción" colors={colors}>
                        <TextInput
                            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </FormField>
                </FormSection>

                {/* Payment */}
                <FormSection title="PAGO" colors={colors}>
                    <FormField label="Precio Total" colors={colors}>
                        <View style={styles.priceInput}>
                            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                            <TextInput
                                style={[styles.input, styles.priceField, { color: colors.text }]}
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
                            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
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
    header: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    title: {
        ...Typography.title,
    },
    contentContainer: {
        paddingTop: Spacing.sm,
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
