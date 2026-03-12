import { DateTimePickerField } from '@/components/DateTimePickerField';
import { EditableDropdown } from '@/components/EditableDropdown';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/lib/supabase';
import { PAYMENT_METHOD_OPTIONS, PaymentMethod, SIZE_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

const DEFAULT_CAKE_TYPES = ['Vainilla', 'Chocolate', 'Red Velvet', 'Marmolada', 'Zanahoria'];

export default function EditOrderScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { id } = useLocalSearchParams();
    const { updateOrder } = useOrders();
    const { bcv, parallel, euro } = useExchangeRates();
    const { currency } = useSettings();
    const currencySymbol = CURRENCIES[currency]?.symbol || '$';

    const [selectedRateType, setSelectedRateType] = useState<'bcv' | 'parallel' | 'euro'>('bcv');
    const { showAlert } = useAlert();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [address, setAddress] = useState('');
    const [deliveryDateObj, setDeliveryDateObj] = useState(new Date());
    const [deliveryTimeObj, setDeliveryTimeObj] = useState(new Date());

    // Kept for other fields
    const [size, setSize] = useState('20 cm');
    const [servings, setServings] = useState('');
    const [filling, setFilling] = useState('');
    const [cakeType, setCakeType] = useState('');
    const [cover, setCover] = useState('');
    const [occasion, setOccasion] = useState('');
    const [description, setDescription] = useState('');
    const [totalPrice, setTotalPrice] = useState('');
    const [deposit, setDeposit] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('zelle');

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
                    setClientPhone(data.client_phone || '');
                    setAddress(data.address || '');

                    // Parse Date
                    if (data.delivery_date) {
                        // Append T12:00:00 to force Local Time parsing at Noon.
                        // This prevents backward shifts (from UTC Midnight) and forward shifts (from late night).
                        setDeliveryDateObj(new Date(`${data.delivery_date}T12:00:00`));
                    }

                    // Parse Time (HH:MM:SS)
                    if (data.delivery_time) {
                        const [hours, minutes] = data.delivery_time.split(':').map(Number);
                        const timeDate = new Date();
                        timeDate.setHours(hours, minutes, 0, 0);
                        setDeliveryTimeObj(timeDate);
                    }

                    setSize(data.size || '20 cm');
                    setServings(data.servings ? data.servings.toString() : '');
                    setFilling(data.filling || '');
                    setCakeType(data.cake_type || '');
                    setCover(data.cover || '');
                    setOccasion(data.occasion || '');
                    setDescription(data.description || '');
                    setTotalPrice(data.total_price ? data.total_price.toString() : '');
                    setDeposit(data.deposit_amount ? data.deposit_amount.toString() : '');
                    setPaymentMethod(data.payment_method);
                }
            } catch (error) {
                console.error(error);
                showAlert({ title: 'Error', message: 'No se pudo cargar el pedido', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id]);

    const handleSave = async () => {
        // Validate required fields
        if (!clientName.trim() || !clientPhone.trim()) {
            showAlert({ title: 'Error', message: 'Por favor completa todos los campos requeridos (*)', type: 'error' });
            return;
        }

        setSubmitting(true);

        try {
            // Format time string HH:MM
            const formattedTime = deliveryTimeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            const updated = await updateOrder(id as string, {
                clientName,
                clientPhone,
                address,
                deliveryDate: deliveryDateObj,
                deliveryTime: formattedTime,
                size,
                servings: servings ? parseInt(servings) : 0,
                filling,
                cakeType,
                cover,
                occasion,
                description,
                totalPrice: totalPrice ? parseFloat(totalPrice) : 0,
                depositAmount: deposit ? parseFloat(deposit) : 0,
                paymentMethod,
            });

            if (updated) {
                showAlert({
                    title: 'Éxito',
                    message: 'Pedido actualizado correctamente',
                    type: 'success',
                    buttons: [{ text: 'OK', onPress: () => router.back() }]
                });
            }
        } catch (error) {
            console.error(error);
            showAlert({ title: 'Error', message: 'No se pudo actualizar', type: 'error' });
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
                    <DateTimePickerField
                        label="Fecha de Entrega"
                        value={deliveryDateObj}
                        onChange={setDeliveryDateObj}
                        mode="date"
                        required
                    />
                    <DateTimePickerField
                        label="Hora de Entrega"
                        value={deliveryTimeObj}
                        onChange={setDeliveryTimeObj}
                        mode="time"
                        required
                    />
                </FormSection>
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

                    <View style={{ marginBottom: Spacing.md }}>
                        <EditableDropdown
                            label="Tipo de Ponqué"
                            value={cakeType}
                            onValueChange={setCakeType}
                            category="cake_type"
                            defaultOptions={DEFAULT_CAKE_TYPES}
                        />
                    </View>

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
                            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{currencySymbol}</Text>
                            <TextInput
                                style={[styles.input, styles.priceField, { color: colors.text }]}
                                value={totalPrice}
                                onChangeText={setTotalPrice}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={{ marginTop: 8 }}>
                            {/* Rate Selector & Helper (Only for VES) */}
                            {currency === 'VES' && (
                                <>
                                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                        {[
                                            { id: 'bcv', label: 'BCV' },
                                            { id: 'parallel', label: 'Paralelo' },
                                            { id: 'euro', label: 'Euro' }
                                        ].map((rate) => (
                                            <TouchableOpacity
                                                key={rate.id}
                                                onPress={() => setSelectedRateType(rate.id as any)}
                                                style={{
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 4,
                                                    borderRadius: 12,
                                                    backgroundColor: selectedRateType === rate.id ? colors.primary : colors.surfaceSecondary,
                                                    borderWidth: 1,
                                                    borderColor: selectedRateType === rate.id ? colors.primary : colors.border
                                                }}>
                                                <Text style={{ fontSize: 10, color: selectedRateType === rate.id ? '#FFF' : colors.textSecondary }}>
                                                    {rate.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {totalPrice ? (
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                            ≈ Bs. {(parseFloat(totalPrice) * (
                                                selectedRateType === 'bcv' ? bcv :
                                                    selectedRateType === 'parallel' ? parallel :
                                                        (euro || 0)
                                            )).toFixed(2)}
                                        </Text>
                                    ) : null}
                                </>
                            )}
                        </View>
                    </FormField>

                    <FormField label="Abono" colors={colors}>
                        <View style={styles.priceInput}>
                            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{currencySymbol}</Text>
                            <TextInput
                                style={[styles.input, styles.priceField, { color: colors.text }]}
                                value={deposit}
                                onChangeText={setDeposit}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor={colors.textMuted}
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
        fontSize: 16,
        height: 48,
        textAlignVertical: 'center',
        paddingVertical: 0,
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
