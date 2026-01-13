import BackButton from '@/components/BackButton';
import { DateTimePickerField } from '@/components/DateTimePickerField';
import { EditableDropdown } from '@/components/EditableDropdown';
import { OrderProductsSelector, SelectedProduct } from '@/components/OrderProductsSelector';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useOrderItems } from '@/hooks/useOrderItems';
import { useOrders } from '@/hooks/useOrders';
import { PAYMENT_METHOD_OPTIONS, PaymentMethod, SIZE_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack } from 'expo-router';
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

export default function NewOrderScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // Form state
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [address, setAddress] = useState('');

    // Date Objects for Picker
    const [deliveryDateObj, setDeliveryDateObj] = useState(new Date());
    const [deliveryTimeObj, setDeliveryTimeObj] = useState(new Date());

    // Size Helper
    const [size, setSize] = useState('20 cm');
    const [customSize, setCustomSize] = useState('');
    const [showCustomSize, setShowCustomSize] = useState(false);

    const [servings, setServings] = useState('');
    const [filling, setFilling] = useState('');
    const [cover, setCover] = useState('');
    const [occasion, setOccasion] = useState('');
    const [description, setDescription] = useState('');

    // Payment State
    const [totalPrice, setTotalPrice] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('zelle');

    // Notifications State
    const [reminderDays, setReminderDays] = useState('0'); // 0 = Sin recordatorio
    const [customReminderDays, setCustomReminderDays] = useState('');
    const [showCustomReminder, setShowCustomReminder] = useState(false);

    const { createOrder, getDictionaryOptions } = useOrders();
    const { setItemsForOrder } = useOrderItems();
    const [submitting, setSubmitting] = useState(false);
    const [dynamicSizes, setDynamicSizes] = useState<string[]>([]);

    // Products with recipes
    const [orderProducts, setOrderProducts] = useState<SelectedProduct[]>([]);

    // Load dynamic sizes
    React.useEffect(() => {
        const loadSizes = async () => {
            const savedSizes = await getDictionaryOptions('size');
            // Filter out any default options from saved ones to avoid dupes
            const cleanSaved = savedSizes.filter(s => !SIZE_OPTIONS.includes(s as any));
            setDynamicSizes(cleanSaved);
        };
        loadSizes();
    }, []);
    const total = parseFloat(totalPrice) || 0;
    const deposit = parseFloat(depositAmount) || 0;
    const remaining = Math.max(0, total - deposit);

    // Auto-set Status based on payment
    const paymentStatus = (total > 0 && deposit >= total) ? 'pagado' :
        (deposit > 0) ? 'abonado' : 'pendiente';

    // Defaults for dropdowns
    const DEFAULT_FILLINGS = ['Chocolate', 'Vainilla', 'Arequipe', 'Frutos Rojos'];
    const DEFAULT_COVERS = ['Buttercream', 'Fondant', 'Merengue', 'Ganache'];
    const DEFAULT_OCCASIONS = ['Cumpleaños', 'Boda', 'Aniversario', 'Baby Shower'];

    // Size Options + Custom
    // Use Set to strictly enforce uniqueness across default, dynamic, and 'Otro'
    const uniqueHelper = new Set([...SIZE_OPTIONS, ...dynamicSizes]);
    // Ensure 'Otro' is removed from the middle if present, so we can append it at the end
    uniqueHelper.delete('Otro');

    const SIZE_OPTIONS_DISPLAY = [...Array.from(uniqueHelper), 'Otro'];

    const REMINDER_OPTIONS = [
        { label: 'Sin recordatorio', value: '0' },
        { label: '1 día antes', value: '1' },
        { label: '2 días antes', value: '2' },
        { label: '3 días antes', value: '3' },
        { label: '1 sem. antes', value: '7' },
        { label: 'Otro', value: 'custom' },
    ];

    const handleSizeSelect = (val: string) => {
        if (val === 'Otro') {
            setShowCustomSize(true);
            setSize('Otro');
        } else {
            setShowCustomSize(false);
            setSize(val);
            setCustomSize('');
        }
    };

    const handleReminderSelect = (val: string) => {
        if (val === 'custom') {
            setShowCustomReminder(true);
            setReminderDays(val);
        } else {
            setShowCustomReminder(false);
            setReminderDays(val);
            setCustomReminderDays('');
        }
    };

    const handleSave = async () => {
        // Validate required fields
        if (!clientName.trim() || !clientPhone.trim()) {
            Alert.alert('Error', 'Por favor completa todos los campos marcados con *');
            return;
        }

        // Validate custom inputs
        const finalSize = showCustomSize ? customSize.trim() : size;
        if (!finalSize) {
            Alert.alert('Error', 'Por favor ingresa el tamaño');
            return;
        }

        const finalReminderDays = showCustomReminder ? customReminderDays.trim() : reminderDays;
        if (showCustomReminder && !finalReminderDays) {
            Alert.alert('Error', 'Por favor ingresa el número de días para el recordatorio');
            return;
        }


        setSubmitting(true);

        try {
            // Format time string HH:MM 
            const formattedTime = deliveryTimeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            const newOrder = await createOrder({
                clientName,
                clientPhone,
                address,
                orderDate: new Date(),
                deliveryDate: deliveryDateObj,
                deliveryTime: formattedTime,
                size: finalSize,
                servings: servings ? parseInt(servings) : 0,
                filling,
                cover,
                occasion,
                description,

                totalPrice: total,
                depositAmount: deposit,
                paymentMethod,
                paymentStatus,

                reminderDays: parseInt(finalReminderDays) || 0,
            });

            if (newOrder) {
                // Save order products if any
                if (orderProducts.length > 0) {
                    await setItemsForOrder(newOrder.id, orderProducts.map(p => ({
                        productName: p.productName,
                        recipeId: p.recipeId,
                        quantity: p.quantity,
                        notes: p.notes
                    })));
                }

                Alert.alert(
                    '¡Pedido Guardado!',
                    'El pedido se ha creado exitosamente.',
                    [{ text: 'OK', onPress: () => router.back() }]
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
                <Stack.Screen
                    options={{
                        title: 'Nuevo Pedido',
                        presentation: 'card',
                        headerTransparent: false,
                        headerLeft: () => <BackButton />,
                    }}
                />


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
                <FormSection title="ENTREGA Y RECORDATORIOS" colors={colors}>
                    <View style={[styles.row, { paddingTop: Spacing.sm }]}>
                        <View style={{ flex: 1, marginRight: Spacing.sm }}>
                            {/* Label shortened to prevent wrapping/misalignment */}
                            <DateTimePickerField
                                label="Fecha"
                                value={deliveryDateObj}
                                onChange={setDeliveryDateObj}
                                mode="date"
                                required
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                            <DateTimePickerField
                                label="Hora"
                                value={deliveryTimeObj}
                                onChange={setDeliveryTimeObj}
                                mode="time"
                                required
                            />
                        </View>
                    </View>

                    <FormField label="Notificaciones de Recordatorio" colors={colors}>
                        <View style={styles.chipContainer}>
                            {REMINDER_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    onPress={() => handleReminderSelect(opt.value)}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: reminderDays === opt.value ? colors.primary : colors.surfaceSecondary,
                                            borderColor: reminderDays === opt.value ? colors.primary : colors.border,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.chipText, { color: reminderDays === opt.value ? '#FFFFFF' : colors.text }]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {showCustomReminder && (
                            <View style={{ marginTop: 10 }}>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderBottomWidth: 1, borderColor: colors.primary }]}
                                    placeholder="Ingrese número de días antes..."
                                    placeholderTextColor={colors.textMuted}
                                    value={customReminderDays}
                                    onChangeText={setCustomReminderDays}
                                    keyboardType="number-pad"
                                    autoFocus
                                />
                            </View>
                        )}

                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                            {(reminderDays !== '0' && (reminderDays !== 'custom' || customReminderDays))
                                ? `Se enviarán recordatorios diarios desde ${showCustomReminder ? customReminderDays : reminderDays} día(s) antes.`
                                : 'Selecciona cuándo quieres recibir alertas.'}
                        </Text>
                    </FormField>
                </FormSection>

                {/* Product Details */}
                <FormSection title="DETALLES DEL PRODUCTO" colors={colors}>
                    <FormField label="Medida / Tamaño" colors={colors}>
                        <ChipSelector
                            options={SIZE_OPTIONS_DISPLAY}
                            selected={size}
                            onSelect={handleSizeSelect}
                            colors={colors}
                        />
                        {showCustomSize && (
                            <View style={{ marginTop: 10 }}>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderBottomWidth: 1, borderColor: colors.primary }]}
                                    placeholder="Escribe la medida personalizada..."
                                    placeholderTextColor={colors.textMuted}
                                    value={customSize}
                                    onChangeText={setCustomSize}
                                    autoFocus
                                />
                            </View>
                        )}
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

                    <View style={{ marginTop: Spacing.md }}>
                        <EditableDropdown
                            label="Relleno"
                            value={filling}
                            onValueChange={setFilling}
                            category="filling"
                            defaultOptions={DEFAULT_FILLINGS}
                        />
                    </View>

                    <EditableDropdown
                        label="Cubierta"
                        value={cover}
                        onValueChange={setCover}
                        category="cover"
                        defaultOptions={DEFAULT_COVERS}
                    />

                    <EditableDropdown
                        label="Motivo / Ocasión"
                        value={occasion}
                        onValueChange={setOccasion}
                        category="occasion"
                        defaultOptions={DEFAULT_OCCASIONS}
                    />

                    <FormField label="Descripción Adicional" colors={colors}>
                        <TextInput
                            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                            placeholder="Detalles extra..."
                            placeholderTextColor={colors.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </FormField>
                </FormSection>

                {/* Products with Recipes */}
                <FormSection title="PRODUCTOS DEL PEDIDO" colors={colors}>
                    <View style={{ paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm }}>
                        <Text style={[styles.helperText, { color: colors.textSecondary, marginBottom: Spacing.sm }]}>
                            Agrega productos y vincula recetas para el descuento automático de inventario.
                        </Text>
                        <OrderProductsSelector
                            products={orderProducts}
                            onProductsChange={setOrderProducts}
                        />
                    </View>
                </FormSection>

                {/* Payment */}
                <FormSection title="PAGO" colors={colors}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: Spacing.sm }}>
                            <FormField label="Precio Total" colors={colors}>
                                <View style={styles.priceInput}>
                                    <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                                    <TextInput
                                        style={[styles.input, styles.priceField, { color: colors.text }]}
                                        placeholder="0"
                                        placeholderTextColor={colors.textMuted}
                                        value={totalPrice}
                                        onChangeText={setTotalPrice}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </FormField>
                        </View>
                        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                            <FormField label="Abonado" colors={colors}>
                                <View style={styles.priceInput}>
                                    <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                                    <TextInput
                                        style={[styles.input, styles.priceField, { color: colors.primary }]}
                                        placeholder="0"
                                        placeholderTextColor={colors.textMuted}
                                        value={depositAmount}
                                        onChangeText={setDepositAmount}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </FormField>
                        </View>
                    </View>

                    {/* Balance Info */}
                    <View style={[styles.balanceContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                        <View style={styles.balanceRow}>
                            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Restante a Pagar:</Text>
                            <Text style={[styles.balanceValue, { color: remaining > 0 ? colors.error : colors.success }]}>
                                ${remaining.toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.balanceRow}>
                            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Estado:</Text>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: paymentStatus === 'pagado' ? '#A8D5BA' : paymentStatus === 'abonado' ? '#FFB74D' : '#E0E0E0' }
                            ]}>
                                <Text style={styles.statusText}>{paymentStatus.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>

                    <FormField label="Forma de Pago (del abono)" colors={colors}>
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
                                    <Text style={[styles.paymentOptionText, { color: paymentMethod === option.value ? '#FFFFFF' : colors.text }]}>
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
        </KeyboardAvoidingView >
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
        padding: Spacing.xs, // Reduced padding for cleaner look
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
        minHeight: 80,
    },
    row: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
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
    helperText: {
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
    priceInput: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencySymbol: {
        ...Typography.subtitle,
        marginRight: Spacing.xs,
        fontSize: 18,
    },
    priceField: {
        flex: 1,
        fontSize: 20,
        fontWeight: '600',
    },
    balanceContainer: {
        margin: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    balanceLabel: {
        ...Typography.body,
        fontWeight: '600',
    },
    balanceValue: {
        ...Typography.title,
        fontSize: 18,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333',
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
        minHeight: 40,
    },
    paymentOptionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    saveButtonText: {
        color: '#FFFFFF',
        ...Typography.bodyBold,
        fontSize: 17,
    },
});
