import BackButton from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/lib/supabase';
import { Order, ORDER_STATUS_OPTIONS } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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
    const { updateOrderStatus } = useOrders();
    const { showAlert } = useAlert();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

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
        const date = new Date(dateStr);
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

                    <Text style={[styles.clientName, { color: colors.text }]}>
                        {order.clientName}
                    </Text>

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
                            ${order.totalPrice.toFixed(2)}
                        </Text>
                    </View>
                    <DetailRow
                        icon={order.paymentMethod === 'efectivo' ? 'money' : order.paymentMethod === 'pago_movil' ? 'mobile-phone' : 'bank'}
                        label="Forma de pago"
                        value={order.paymentMethod === 'efectivo' ? 'Efectivo' : order.paymentMethod === 'pago_movil' ? 'Pago Móvil' : 'Zelle'}
                        colors={colors}
                    />
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
    clientName: {
        ...Typography.title,
        marginBottom: Spacing.md,
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
        padding: Spacing.md,
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
        paddingVertical: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        ...Typography.small,
        marginBottom: 2,
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
});
