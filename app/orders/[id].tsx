import BackButton from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/lib/supabase';
import { Order, ORDER_STATUS_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { useExchangeRates } from '@/hooks/useExchangeRates';

function CurrencyConversions({ amount, colors }: { amount: number, colors: typeof Colors.light }) {
    const { bcv, parallel, euro, loading } = useExchangeRates();

    if (loading) return <ActivityIndicator size="small" color={colors.primary} />;

    return (
        <View style={{ marginTop: Spacing.xs, paddingTop: Spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            <Text style={[styles.detailLabel, { color: colors.textMuted, marginBottom: 8 }]}>Estimado en Bolívares:</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ ...Typography.caption, color: colors.textSecondary }}>BCV</Text>
                    <Text style={{ ...Typography.bodyBold, color: colors.text }}>
                        Bs {(amount * bcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ ...Typography.caption, color: colors.textSecondary }}>Paralelo</Text>
                    <Text style={{ ...Typography.bodyBold, color: colors.text }}>
                        Bs {(amount * parallel).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                </View>
                {(euro || 0) > 0 && (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ ...Typography.caption, color: colors.textSecondary }}>Euro</Text>
                        <Text style={{ ...Typography.bodyBold, color: colors.text }}>
                            Bs {(amount * (euro || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

function DetailRow({
    icon,
    label,
    value,
    colors,
    highlight = false,
}: {
    icon: string;
    label: string;
    value: string;
    colors: typeof Colors.light;
    highlight?: boolean;
}) {
    return (
        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.primary + '15' }]}>
                <FontAwesome name={icon as any} size={14} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[
                    styles.detailValue,
                    { color: highlight ? colors.primary : colors.text }
                ]}>
                    {value}
                </Text>
            </View>
        </View>
    );
}

export default function OrderDetailScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { id } = useLocalSearchParams();
    const { updateOrderStatus, getOrdersByClient } = useOrders();
    const { showAlert } = useAlert();
    const { currency } = useSettings();
    const currencySymbol = CURRENCIES[currency]?.symbol || '$';

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [clientHistoryVisible, setClientHistoryVisible] = useState(false);
    const [clientOrders, setClientOrders] = useState<Order[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

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
                setOrder({
                    id: data.id,
                    userId: data.user_id,
                    orderNumber: data.order_number,
                    clientName: data.client_name,
                    clientPhone: data.client_phone,
                    address: data.address,
                    orderDate: data.created_at,
                    deliveryDate: data.delivery_date,
                    deliveryTime: data.delivery_time,
                    size: data.size,
                    servings: data.servings,
                    filling: data.filling,
                    cakeType: data.cake_type,
                    cover: data.cover,
                    occasion: data.occasion,
                    description: data.description,
                    totalPrice: data.total_price,
                    paymentMethod: data.payment_method,
                    status: data.status,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                    // @ts-ignore: handling potential missing fields safely
                    depositAmount: data.deposit_amount,
                    paymentStatus: data.payment_status,
                    reminderDays: data.reminder_days || 0,
                    customReminderDays: data.custom_reminder_days || 0,
                    decorationImageUrl: data.decoration_image_url || undefined,
                });
            }
        } catch (error) {
            console.error('Error fetching order:', error);
            showAlert({ title: 'Error', message: 'No se pudo cargar el pedido', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.text }}>Pedido no encontrado</Text>
            </View>
        );
    }

    const statusOption = ORDER_STATUS_OPTIONS.find(s => s.value === order.status);

    const formatDate = (dateStr: string) => {
        // Manual parse to ensure local date without timezone shifts
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Local midnight

        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleStatusChange = () => {
        const buttons = [
            ...ORDER_STATUS_OPTIONS.map(option => ({
                text: option.label,
                onPress: async () => {
                    if (!order) return;
                    await updateOrderStatus(order.id, option.value);
                    setOrder(prev => prev ? { ...prev, status: option.value } : null);
                    showAlert({ title: 'Estado Actualizado', message: `El pedido ahora está: ${option.label}`, type: 'success' });
                },
            })),
            { text: 'Cancelar', style: 'cancel' as const, onPress: () => { } }
        ];
        showAlert({
            title: 'Cambiar Estado',
            message: 'Selecciona el nuevo estado del pedido',
            buttons: buttons
        });
    };

    const handleCall = () => {
        showAlert({
            title: 'Llamar',
            message: `¿Llamar a ${order.clientPhone}?`,
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Llamar', onPress: () => {
                        if (order.clientPhone) {
                            Linking.openURL(`tel:${order.clientPhone}`);
                        }
                    }
                },
            ]
        });
    };

    // Placeholder actions
    const handleWhatsApp = () => {
        if (!order.clientPhone) {
            showAlert({ title: 'Error', message: 'Este pedido no tiene número de teléfono', type: 'error' });
            return;
        }
        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = order.clientPhone.replace(/[\s\-\(\)]/g, '');
        const message = `Hola! Te escribo sobre tu pedido de ${order.description || 'repostería'}.`;
        const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        Linking.openURL(whatsappUrl).catch(() => {
            showAlert({ title: 'Error', message: 'No se pudo abrir WhatsApp', type: 'error' });
        });
    };
    const handleEdit = () => router.push(`/orders/edit?id=${order.id}`);

    const handleClientHistory = async () => {
        setLoadingHistory(true);
        setClientHistoryVisible(true);
        const orders = await getOrdersByClient(order.clientName);
        setClientOrders(orders.filter(o => o.id !== order.id)); // exclude current order
        setLoadingHistory(false);
    };

    const clientTotalSpent = clientOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const allClientOrders = [order, ...clientOrders];
    const paidCount = allClientOrders.filter(o => o.status === 'pagado' || o.paymentStatus === 'pagado').length;
    const pendingCount = allClientOrders.length - paidCount;
    const favoriteCake = (() => {
        const map = new Map<string, { count: number; date: string }>();
        allClientOrders.forEach(o => {
            if (!o.cakeType) return;
            const date = o.deliveryDate || o.createdAt || '';
            const existing = map.get(o.cakeType);
            if (!existing) {
                map.set(o.cakeType, { count: 1, date });
            } else {
                map.set(o.cakeType, { count: existing.count + 1, date: date > existing.date ? date : existing.date });
            }
        });
        if (map.size === 0) return '—';
        return Array.from(map.entries()).sort((a, b) =>
            b[1].count !== a[1].count ? b[1].count - a[1].count : b[1].date.localeCompare(a[1].date)
        )[0][0];
    })();

    const getStatusColor = (status: string) => {
        const option = ORDER_STATUS_OPTIONS.find(s => s.value === status);
        return option?.color || colors.textMuted;
    };

    const getStatusLabel = (status: string) => {
        const option = ORDER_STATUS_OPTIONS.find(s => s.value === status);
        return option?.label || status;
    };

    const handleDelete = () => {
        showAlert({
            title: 'Eliminar Pedido',
            message: '¿Estás segura de que quieres eliminar este pedido?',
            type: 'warning',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('orders').delete().eq('id', order.id);
                            if (error) throw error;
                            showAlert({
                                title: 'Eliminado',
                                message: 'Pedido eliminado correctamente',
                                type: 'success',
                                buttons: [{ text: 'OK', onPress: () => router.back() }]
                            });
                        } catch (error) {
                            showAlert({ title: 'Error', message: 'No se pudo eliminar', type: 'error' });
                        }
                    }
                },
            ]
        });
    };

    const handlePickPhoto = async (useCamera: boolean) => {
        try {
            let result: ImagePicker.ImagePickerResult;
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    showAlert({ title: 'Permiso necesario', message: 'Necesitamos acceso a la cámara', type: 'warning' });
                    return;
                }
                result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    showAlert({ title: 'Permiso necesario', message: 'Necesitamos acceso a tu galería', type: 'warning' });
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
            }
            if (result.canceled) return;

            setUploadingPhoto(true);
            const compressed = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
            );

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const fileName = `${session.user.id}/${order!.id}_${Date.now()}.jpg`;
            const res = await fetch(compressed.uri);
            const blob = await res.blob();

            const { error: uploadError } = await supabase.storage
                .from('order-photos')
                .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('order-photos').getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('orders')
                .update({ decoration_image_url: urlData.publicUrl })
                .eq('id', order!.id);
            if (updateError) throw updateError;

            setOrder(prev => prev ? { ...prev, decorationImageUrl: urlData.publicUrl } : null);
        } catch (err) {
            console.error('Photo upload error:', err);
            showAlert({ title: 'Error', message: 'No se pudo subir la foto', type: 'error' });
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handlePhotoOptions = () => {
        showAlert({
            title: 'Foto del resultado',
            message: order?.decorationImageUrl ? '¿Qué deseas hacer?' : 'Agrega una foto del pedido terminado',
            buttons: [
                { text: 'Cámara', onPress: () => handlePickPhoto(true) },
                { text: 'Galería', onPress: () => handlePickPhoto(false) },
                ...(order?.decorationImageUrl ? [{
                    text: 'Eliminar foto',
                    style: 'destructive' as const,
                    onPress: async () => {
                        await supabase.from('orders').update({ decoration_image_url: null }).eq('id', order!.id);
                        setOrder(prev => prev ? { ...prev, decorationImageUrl: undefined } : null);
                    }
                }] : []),
                { text: 'Cancelar', style: 'cancel' as const, onPress: () => { } },
            ]
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Detalle del Pedido',
                    headerLeft: () => <BackButton />,
                    headerTitleStyle: { fontWeight: 'bold' },
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.tint,
                    headerShadowVisible: false,
                }}
            />

            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Header Card */}
                <View style={[styles.headerCard, { backgroundColor: colors.surface }, Shadows.md]}>
                    <View style={styles.headerTop}>
                        <View style={styles.orderBadge}>
                            <Text style={[styles.orderNumber, { color: colors.primary }]}>
                                Pedido #{order.orderNumber}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.statusBadge, { backgroundColor: statusOption?.color + '20' }]}
                            onPress={handleStatusChange}
                        >
                            <Text style={[styles.statusText, { color: statusOption?.color }]}>
                                {statusOption?.label}
                            </Text>
                            <FontAwesome name="chevron-down" size={10} color={statusOption?.color} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleClientHistory} disabled={loadingHistory} style={styles.clientNameRow}>
                        <Text style={[styles.clientName, { color: colors.text }]}>
                            {order.clientName}
                        </Text>
                        <View style={[styles.historyHint, { backgroundColor: colors.primary + '15' }]}>
                            <FontAwesome name="history" size={12} color={colors.primary} />
                            <Text style={[styles.historyHintText, { color: colors.primary }]}>Historial</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={[styles.quickAction, { backgroundColor: colors.success + '15' }]}
                            onPress={handleCall}
                        >
                            <FontAwesome name="phone" size={18} color={colors.success} />
                            <Text style={[styles.quickActionText, { color: colors.success }]}>Llamar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickAction, { backgroundColor: '#25D366' + '15' }]}
                            onPress={handleWhatsApp}
                        >
                            <FontAwesome name="whatsapp" size={18} color="#25D366" />
                            <Text style={[styles.quickActionText, { color: '#25D366' }]}>WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickAction, { backgroundColor: colors.primary + '15' }]}
                            onPress={handleEdit}
                        >
                            <FontAwesome name="edit" size={18} color={colors.primary} />
                            <Text style={[styles.quickActionText, { color: colors.primary }]}>Editar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Delivery Section */}
                <View style={[styles.section, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        <FontAwesome name="truck" size={16} /> Entrega
                    </Text>
                    <DetailRow
                        icon="calendar"
                        label="Fecha de entrega"
                        value={formatDate(order.deliveryDate)}
                        colors={colors}
                        highlight
                    />
                    <DetailRow
                        icon="clock-o"
                        label="Hora"
                        value={new Date(`2000-01-01T${order.deliveryTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                        colors={colors}
                    />
                    {order.address && (
                        <DetailRow
                            icon="map-marker"
                            label="Dirección"
                            value={order.address}
                            colors={colors}
                        />
                    )}
                    <DetailRow
                        icon="phone"
                        label="Teléfono"
                        value={order.clientPhone}
                        colors={colors}
                    />
                </View>

                {/* Product Details Section */}
                <View style={[styles.section, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        <FontAwesome name="birthday-cake" size={16} /> Detalles del Producto
                    </Text>
                    <DetailRow
                        icon="arrows-alt"
                        label="Medida"
                        value={order.size || '-'}
                        colors={colors}
                    />
                    <DetailRow
                        icon="birthday-cake"
                        label="Tipo de Ponqué"
                        value={order.cakeType || '-'}
                        colors={colors}
                    />
                    <DetailRow
                        icon="users"
                        label="Personas"
                        value={order.servings ? `${order.servings} personas` : '-'}
                        colors={colors}
                    />
                    <DetailRow
                        icon="circle"
                        label="Relleno"
                        value={order.filling || '-'}
                        colors={colors}
                    />
                    <DetailRow
                        icon="circle-o"
                        label="Cubierta"
                        value={order.cover || '-'}
                        colors={colors}
                    />
                    <DetailRow
                        icon="gift"
                        label="Motivo"
                        value={order.occasion || '-'}
                        colors={colors}
                    />
                </View>

                {/* Description Section */}
                {order.description && (
                    <View style={[styles.section, { backgroundColor: colors.surface }, Shadows.sm]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            <FontAwesome name="file-text-o" size={16} /> Descripción
                        </Text>
                        <Text style={[styles.description, { color: colors.text }]}>
                            {order.description}
                        </Text>
                    </View>
                )}

                {/* Payment Section */}
                <View style={[styles.section, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        <FontAwesome name="credit-card" size={16} /> Pago
                    </Text>
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Total</Text>
                        <Text style={[styles.priceValue, { color: colors.primary }]}>
                            {currencySymbol}{order.totalPrice.toFixed(2)}
                        </Text>
                    </View>

                    {currency === 'VES' && (
                        <CurrencyConversions amount={order.totalPrice} colors={colors} />
                    )}

                    <View style={{ height: Spacing.sm }} />
                    <DetailRow
                        icon={order.paymentMethod === 'efectivo' ? 'money' : order.paymentMethod === 'pago_movil' ? 'mobile-phone' : 'bank'}
                        label="Forma de pago"
                        value={order.paymentMethod === 'efectivo' ? 'Efectivo' : order.paymentMethod === 'pago_movil' ? 'Pago Móvil' : order.paymentMethod === 'transferencia' ? 'Transferencia' : 'Zelle'}
                        colors={colors}
                    />
                </View>

                {/* Photo Section */}
                <View style={[styles.section, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        <FontAwesome name="camera" size={16} /> Foto del Resultado
                    </Text>
                    {order.decorationImageUrl ? (
                        <TouchableOpacity onPress={handlePhotoOptions} activeOpacity={0.85}>
                            <Image
                                source={{ uri: order.decorationImageUrl }}
                                style={styles.photoPreview}
                                resizeMode="cover"
                            />
                            <View style={[styles.photoChangeHint, { backgroundColor: colors.primary + '20' }]}>
                                <FontAwesome name="camera" size={13} color={colors.primary} />
                                <Text style={[styles.photoChangeText, { color: colors.primary }]}>Cambiar foto</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.photoPlaceholder, { borderColor: colors.border, backgroundColor: colors.background }]}
                            onPress={handlePhotoOptions}
                            disabled={uploadingPhoto}
                            activeOpacity={0.7}
                        >
                            {uploadingPhoto ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : (
                                <>
                                    <FontAwesome name="camera" size={28} color={colors.textMuted} />
                                    <Text style={[styles.photoPlaceholderText, { color: colors.textSecondary }]}>
                                        Agregar foto del resultado
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.error + '10' }]}
                    onPress={handleDelete}
                >
                    <FontAwesome name="trash-o" size={18} color={colors.error} />
                    <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                        Eliminar Pedido
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Client History Modal */}
            <Modal
                visible={clientHistoryVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setClientHistoryVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <View>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {order.clientName}
                            </Text>
                            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                                Historial de Pedidos
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setClientHistoryVisible(false)}
                            style={[styles.modalClose, { backgroundColor: colors.surface }]}
                        >
                            <FontAwesome name="times" size={18} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {loadingHistory ? (
                        <View style={styles.modalLoading}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            {/* Stats Grid 2x2 */}
                            <View style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
                                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                                    <View style={[styles.clientStatCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                        <View style={[styles.clientStatIcon, { backgroundColor: colors.primary + '15' }]}>
                                            <FontAwesome name="shopping-bag" size={13} color={colors.primary} />
                                        </View>
                                        <Text style={[styles.clientStatLabel, { color: colors.textMuted }]}>Total pedidos</Text>
                                        <Text style={[styles.clientStatValue, { color: colors.primary }]}>{allClientOrders.length}</Text>
                                    </View>
                                    <View style={[styles.clientStatCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                        <View style={[styles.clientStatIcon, { backgroundColor: colors.success + '15' }]}>
                                            <FontAwesome name="money" size={13} color={colors.success} />
                                        </View>
                                        <Text style={[styles.clientStatLabel, { color: colors.textMuted }]}>Total gastado</Text>
                                        <Text style={[styles.clientStatValue, { color: colors.success }]} numberOfLines={1}>
                                            {currencySymbol}{(clientTotalSpent + order.totalPrice).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                                    <View style={[styles.clientStatCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                        <View style={[styles.clientStatIcon, { backgroundColor: colors.success + '15' }]}>
                                            <FontAwesome name="check-circle" size={13} color={colors.success} />
                                        </View>
                                        <Text style={[styles.clientStatLabel, { color: colors.textMuted }]}>Pag. / Pend.</Text>
                                        <Text style={[styles.clientStatValue, { color: colors.text }]}>{paidCount} / {pendingCount}</Text>
                                    </View>
                                    <View style={[styles.clientStatCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                                        <View style={[styles.clientStatIcon, { backgroundColor: colors.secondary + '20' }]}>
                                            <FontAwesome name="birthday-cake" size={13} color={colors.primary} />
                                        </View>
                                        <Text style={[styles.clientStatLabel, { color: colors.textMuted }]}>Torta favorita</Text>
                                        <Text style={[styles.clientStatValue, { color: colors.text }]} numberOfLines={1}>{favoriteCake}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Current Order */}
                            <Text style={[styles.historySectionTitle, { color: colors.textMuted }]}>
                                PEDIDO ACTUAL
                            </Text>
                            <View style={[styles.historyCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }, Shadows.sm]}>
                                <View style={styles.historyCardHeader}>
                                    <Text style={[styles.historyOrderNumber, { color: colors.primary }]}>
                                        #{order.orderNumber}
                                    </Text>
                                    <View style={[styles.historyStatusBadge, { backgroundColor: statusOption?.color + '20' }]}>
                                        <Text style={{ ...Typography.small, color: statusOption?.color, fontWeight: '600' }}>
                                            {statusOption?.label}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.historyDescription, { color: colors.text }]}>
                                    {order.description || order.size || 'Sin descripción'}
                                </Text>
                                <View style={styles.historyMeta}>
                                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                                        📅 {formatDate(order.deliveryDate)}
                                    </Text>
                                    <Text style={[styles.historyPrice, { color: colors.text }]}>
                                        {currencySymbol}{order.totalPrice.toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            {/* Past Orders */}
                            {clientOrders.length > 0 && (
                                <>
                                    <Text style={[styles.historySectionTitle, { color: colors.textMuted }]}>
                                        PEDIDOS ANTERIORES ({clientOrders.length})
                                    </Text>
                                    {clientOrders.map((pastOrder) => (
                                        <TouchableOpacity
                                            key={pastOrder.id}
                                            style={[styles.historyCard, { backgroundColor: colors.surface, borderLeftColor: getStatusColor(pastOrder.status) }, Shadows.sm]}
                                            onPress={() => {
                                                setClientHistoryVisible(false);
                                                router.push(`/orders/${pastOrder.id}`);
                                            }}
                                        >
                                            <View style={styles.historyCardHeader}>
                                                <Text style={[styles.historyOrderNumber, { color: colors.text }]}>
                                                    #{pastOrder.orderNumber}
                                                </Text>
                                                <View style={[styles.historyStatusBadge, { backgroundColor: getStatusColor(pastOrder.status) + '20' }]}>
                                                    <Text style={{ ...Typography.small, color: getStatusColor(pastOrder.status), fontWeight: '600' }}>
                                                        {getStatusLabel(pastOrder.status)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.historyDescription, { color: colors.text }]} numberOfLines={1}>
                                                {pastOrder.description || pastOrder.size || 'Sin descripción'}
                                            </Text>
                                            <View style={styles.historyMeta}>
                                                <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                                                    📅 {formatDate(pastOrder.deliveryDate)}
                                                </Text>
                                                <Text style={[styles.historyPrice, { color: colors.text }]}>
                                                    {currencySymbol}{pastOrder.totalPrice.toFixed(2)}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setClientHistoryVisible(false);
                                                    router.push({
                                                        pathname: '/orders/new',
                                                        params: {
                                                            clientName: pastOrder.clientName || '',
                                                            clientPhone: pastOrder.clientPhone || '',
                                                            address: pastOrder.address || '',
                                                            cakeType: pastOrder.cakeType || '',
                                                            size: pastOrder.size || '',
                                                            filling: pastOrder.filling || '',
                                                            cover: pastOrder.cover || '',
                                                            totalPrice: String(pastOrder.totalPrice || ''),
                                                        }
                                                    });
                                                }}
                                                style={[styles.reorderButton, { backgroundColor: colors.primary + '15' }]}
                                            >
                                                <FontAwesome name="refresh" size={11} color={colors.primary} />
                                                <Text style={[styles.reorderButtonText, { color: colors.primary }]}>Pedir de nuevo</Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}

                            {clientOrders.length === 0 && (
                                <View style={styles.emptyHistory}>
                                    <FontAwesome name="star-o" size={40} color={colors.textMuted} />
                                    <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>
                                        ¡Este es el primer pedido de {order.clientName}!
                                    </Text>
                                </View>
                            )}

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.md,
    },
    headerCard: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    orderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderNumber: {
        ...Typography.bodyBold,
        fontSize: 14,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    statusText: {
        ...Typography.caption,
        fontWeight: '600',
    },
    clientNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    clientName: {
        ...Typography.title,
        flex: 1,
    },
    historyHint: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4,
        marginLeft: Spacing.sm,
    },
    historyHintText: {
        ...Typography.small,
        fontWeight: '600',
    },
    quickActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    quickAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        gap: 6,
    },
    quickActionText: {
        ...Typography.caption,
        fontWeight: '600',
    },
    section: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        ...Typography.bodyBold,
        marginBottom: Spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        ...Typography.small,
        marginBottom: 4,
    },
    detailValue: {
        ...Typography.body,
    },
    description: {
        ...Typography.body,
        lineHeight: 22,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    priceLabel: {
        ...Typography.body,
    },
    priceValue: {
        ...Typography.title,
        fontSize: 28,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    deleteButtonText: {
        ...Typography.bodyBold,
    },
    // Client History Modal Styles
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: {
        ...Typography.title,
    },
    modalSubtitle: {
        ...Typography.caption,
        marginTop: 2,
    },
    modalClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        padding: Spacing.md,
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.lg,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryNumber: {
        ...Typography.title,
        fontSize: 24,
    },
    summaryLabel: {
        ...Typography.small,
        marginTop: 4,
    },
    summaryDivider: {
        width: 1,
        height: 40,
        marginHorizontal: Spacing.md,
    },
    historySectionTitle: {
        ...Typography.small,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: Spacing.sm,
        marginTop: Spacing.sm,
    },
    historyCard: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderLeftWidth: 3,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    historyOrderNumber: {
        ...Typography.bodyBold,
    },
    historyStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    historyDescription: {
        ...Typography.body,
        marginBottom: 6,
    },
    historyMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyDate: {
        ...Typography.small,
    },
    historyPrice: {
        ...Typography.bodyBold,
    },
    emptyHistory: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        gap: Spacing.md,
    },
    emptyHistoryText: {
        ...Typography.body,
        textAlign: 'center',
    },
    clientStatCard: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    clientStatIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    clientStatLabel: {
        ...Typography.small,
        marginBottom: 2,
    },
    clientStatValue: {
        ...Typography.bodyBold,
        fontSize: 18,
    },
    reorderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderRadius: BorderRadius.sm,
        marginTop: Spacing.sm,
    },
    reorderButtonText: {
        ...Typography.small,
        fontWeight: '600',
    },
    photoPreview: {
        width: '100%',
        height: 220,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
    },
    photoChangeHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderRadius: BorderRadius.sm,
    },
    photoChangeText: {
        ...Typography.small,
        fontWeight: '600',
    },
    photoPlaceholder: {
        height: 140,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    photoPlaceholderText: {
        ...Typography.body,
    },
});
