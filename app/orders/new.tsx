import BackButton from '@/components/BackButton';
import { DateTimePickerField } from '@/components/DateTimePickerField';
import { EditableDropdown } from '@/components/EditableDropdown';
import { OrderProductsSelector, SelectedProduct } from '@/components/OrderProductsSelector';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useHaptics } from '@/hooks/useHaptics';
import { useOrderItems } from '@/hooks/useOrderItems';
import { useOrders } from '@/hooks/useOrders';
import { useSubscription } from '@/hooks/useSubscription';
import { getPaymentMethodOptions, PaymentMethod, SIZE_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
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

    const params = useLocalSearchParams<{
        clientName?: string;
        clientPhone?: string;
        address?: string;
        cakeType?: string;
        size?: string;
        filling?: string;
        cover?: string;
        totalPrice?: string;
    }>();

    const initialSize = (() => {
        const s = params.size?.trim();
        if (!s) return { size: '20 cm', custom: '', showCustom: false };
        if (SIZE_OPTIONS.includes(s as any)) return { size: s, custom: '', showCustom: false };
        return { size: 'Otro', custom: s, showCustom: true };
    })();

    // Form state
    const [clientName, setClientName] = useState(params.clientName || '');
    const [clientPhone, setClientPhone] = useState(params.clientPhone || '');
    const [address, setAddress] = useState(params.address || '');
    const [clientSelected, setClientSelected] = useState(!!params.clientName);

    // Date Objects for Picker
    const [deliveryDateObj, setDeliveryDateObj] = useState(new Date());
    const [deliveryTimeObj, setDeliveryTimeObj] = useState(new Date());

    // Size Helper
    const [size, setSize] = useState(initialSize.size);
    const [customSize, setCustomSize] = useState(initialSize.custom);
    const [showCustomSize, setShowCustomSize] = useState(initialSize.showCustom);

    const [servings, setServings] = useState('');
    const [filling, setFilling] = useState(params.filling || '');
    const [cakeType, setCakeType] = useState(params.cakeType || '');
    const [cover, setCover] = useState(params.cover || '');
    const [occasion, setOccasion] = useState('');
    const [description, setDescription] = useState('');

    // Payment State
    const [totalPrice, setTotalPrice] = useState(params.totalPrice || '');
    const [depositAmount, setDepositAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('zelle');



    const { createOrder, getDictionaryOptions, orders } = useOrders();

    // Unique known clients from order history (most recent data wins on dedup)
    const knownClients = useMemo(() => {
        const map = new Map<string, { name: string; phone: string; address: string }>();
        [...orders].reverse().forEach(o => {
            const key = o.clientName.toLowerCase().trim();
            if (!map.has(key)) {
                map.set(key, {
                    name: o.clientName,
                    phone: o.clientPhone || '',
                    address: o.address || '',
                });
            }
        });
        return Array.from(map.values());
    }, [orders]);

    const clientSuggestions = useMemo(() => {
        if (clientSelected || clientName.trim().length < 1) return [];
        const q = clientName.toLowerCase().trim();
        return knownClients.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5);
    }, [clientName, clientSelected, knownClients]);

    const handleSelectClient = (client: { name: string; phone: string; address: string }) => {
        setClientName(client.name);
        setClientPhone(client.phone);
        setAddress(client.address);
        setClientSelected(true);
    };
    const { setItemsForOrder } = useOrderItems();
    const { showAlert } = useAlert();
    const { isPremium } = useSubscription(); // Import this hook
    const { currency } = useSettings();
    const currencySymbol = CURRENCIES[currency]?.symbol || '$';

    const { bcv, parallel, euro } = useExchangeRates();
    const [selectedRateType, setSelectedRateType] = useState<'bcv' | 'parallel' | 'euro'>('bcv');
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
    const DEFAULT_CAKE_TYPES = ['Vainilla', 'Chocolate', 'Red Velvet', 'Marmolada', 'Zanahoria'];
    const DEFAULT_COVERS = ['Buttercream', 'Fondant', 'Merengue', 'Ganache'];
    const DEFAULT_OCCASIONS = ['Cumpleaños', 'Boda', 'Aniversario', 'Baby Shower'];

    // Size Options + Custom
    // Use Set to strictly enforce uniqueness across default, dynamic, and 'Otro'
    const uniqueHelper = new Set([...SIZE_OPTIONS, ...dynamicSizes]);
    // Ensure 'Otro' is removed from the middle if present, so we can append it at the end
    uniqueHelper.delete('Otro');

    const SIZE_OPTIONS_DISPLAY = [...Array.from(uniqueHelper), 'Otro'];



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



    const haptics = useHaptics();

    const handleSave = async () => {
        // Validate required fields
        if (!clientName.trim()) {
            haptics.error();
            showAlert({ title: 'Error', message: 'Por favor completa todos los campos marcados con *', type: 'error' });
            return;
        }

        // Check Free Limit (Max 10 orders per calendar month)
        if (!isPremium) {
            const now = new Date();
            const ordersThisMonth = orders.filter(o => {
                const created = new Date(o.createdAt);
                return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
            }).length;
            if (ordersThisMonth >= 10) {
                haptics.error();
                showAlert({
                    title: 'Límite Mensual Alcanzado',
                    message: 'Alcanzaste los 10 pedidos gratuitos de este mes.\n\nSuscríbete a Premium para pedidos ilimitados.',
                    type: 'warning',
                    buttons: [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Ver Premium', onPress: () => router.push('/premium') }
                    ]
                });
                return;
            }
        }

        // Validate custom inputs
        const finalSize = showCustomSize ? customSize.trim() : size;
        if (!finalSize) {
            haptics.warning();
            showAlert({ title: 'Error', message: 'Por favor ingresa el tamaño', type: 'warning' });
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
                cakeType,
                cover,
                occasion,
                description,

                totalPrice: total,
                depositAmount: deposit,
                paymentMethod,
                paymentStatus,

                reminderDays: 1, // Automatic daily reminders (handled by backend/notifications)
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

                haptics.success();
                showAlert({
                    title: '¡Pedido Guardado!',
                    message: 'El pedido se ha creado exitosamente.',
                    type: 'success',
                    buttons: [{ text: 'OK', onPress: () => router.back() }]
                });
            }
        } catch (error) {
            console.error(error);
            haptics.error();
            showAlert({ title: 'Error', message: 'Ocurrió un error al guardar el pedido', type: 'error' });
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
                            onChangeText={(text) => {
                                setClientName(text);
                                setClientSelected(false);
                            }}
                            autoCapitalize="words"
                        />
                        {clientSuggestions.length > 0 && (
                            <View style={[styles.suggestionsContainer, { borderColor: colors.border }]}>
                                {clientSuggestions.map((client, index) => (
                                    <TouchableOpacity
                                        key={client.name}
                                        onPress={() => handleSelectClient(client)}
                                        style={[
                                            styles.suggestionRow,
                                            {
                                                borderBottomColor: colors.border,
                                                borderBottomWidth: index < clientSuggestions.length - 1 ? StyleSheet.hairlineWidth : 0,
                                            },
                                        ]}
                                    >
                                        <FontAwesome name="user-o" size={13} color={colors.primary} style={{ marginTop: 2 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.suggestionName, { color: colors.text }]}>
                                                {client.name}
                                            </Text>
                                            {client.phone ? (
                                                <Text style={[styles.suggestionPhone, { color: colors.textMuted }]}>
                                                    {client.phone}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <FontAwesome name="chevron-right" size={11} color={colors.textMuted} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </FormField>

                    <FormField label="Teléfono" colors={colors}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Ej: +58 412 123 4567 (opcional)"
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
                    <View style={[styles.row, { paddingTop: Spacing.sm }]}>
                        <View style={{ flex: 1, marginRight: Spacing.sm }}>
                            {/* Label shortened to prevent wrapping/misalignment */}
                            <DateTimePickerField
                                label="Fecha"
                                value={deliveryDateObj}
                                onChange={setDeliveryDateObj}
                                mode="date"
                                minimumDate={new Date(new Date().getFullYear(), 0, 1)}
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

                    <FormField label="Cantidad (personas o unidades)" colors={colors}>
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
                            label="Tipo de Ponqué"
                            value={cakeType}
                            onValueChange={setCakeType}
                            category="cake_type"
                            defaultOptions={DEFAULT_CAKE_TYPES}
                        />
                    </View>

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
                <FormSection title="¿QUÉ VAS A PREPARAR?" colors={colors}>
                    <View style={{ paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm }}>
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
                                    <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{currencySymbol}</Text>
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
                                    <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{currencySymbol}</Text>
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

                    {/* Rate Selector & Helper (Only for VES) */}
                    {currency === 'VES' && (
                        <View style={{ marginTop: 8, marginBottom: 8 }}>
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
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 12,
                                            backgroundColor: selectedRateType === rate.id ? colors.primary : colors.surfaceSecondary,
                                            borderWidth: 1,
                                            borderColor: selectedRateType === rate.id ? colors.primary : colors.border
                                        }}>
                                        <Text style={{ fontSize: 11, fontWeight: '500', color: selectedRateType === rate.id ? '#FFF' : colors.textSecondary }}>
                                            {rate.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {totalPrice ? (
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 2 }}>
                                    ≈ Bs. {(parseFloat(totalPrice) * (
                                        selectedRateType === 'bcv' ? bcv :
                                            selectedRateType === 'parallel' ? parallel :
                                                (euro || 0)
                                    )).toFixed(2)}
                                </Text>
                            ) : null}
                        </View>
                    )}

                    {/* Balance Info */}
                    <View style={[styles.balanceContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                        <View style={styles.balanceRow}>
                            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Restante a Pagar:</Text>
                            <Text style={[styles.balanceValue, { color: remaining > 0 ? colors.error : colors.success }]}>
                                {currencySymbol}{remaining.toFixed(2)}
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
                            {getPaymentMethodOptions(currency).map((option) => (
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
            </ScrollView >
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
        paddingHorizontal: Spacing.sm,
        overflow: 'hidden',
    },
    field: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
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
        paddingHorizontal: 0,
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
    suggestionsContainer: {
        marginTop: Spacing.xs,
        borderWidth: 1,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: 10,
        paddingHorizontal: Spacing.sm,
    },
    suggestionName: {
        ...Typography.caption,
        fontWeight: '600',
    },
    suggestionPhone: {
        fontSize: 12,
        marginTop: 1,
    },
});
