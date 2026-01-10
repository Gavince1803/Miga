import * as Notifications from 'expo-notifications';

// Configure how notifications behave when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function requestNotificationPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return false;
    }
    return true;
}

/**
 * Schedules a notification for an order.
 * Triggers exactly X days before the delivery date/time.
 */
export async function scheduleOrderNotification(order: {
    id: string;
    clientName: string;
    description?: string;
    size?: string;
    deliveryDate: string; // ISO string 2026-01-10T00:00:00
    deliveryTime: string; // "14:30" or "14:30:00"
    reminderDays: number;
}) {
    // 0 means no reminder
    if (!order.reminderDays || order.reminderDays <= 0) {
        await cancelOrderNotification(order.id);
        return;
    }

    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        const deliveryDate = new Date(order.deliveryDate);
        const [hours, minutes] = order.deliveryTime.split(':').map(Number);

        // Construct the exact delivery moment
        const deliveryMoment = new Date(deliveryDate);
        deliveryMoment.setHours(hours, minutes, 0, 0);

        // Calculate trigger time: X days before
        const triggerDate = new Date(deliveryMoment);
        triggerDate.setDate(triggerDate.getDate() - order.reminderDays);

        // If time is in the past, don't schedule
        if (triggerDate.getTime() <= Date.now()) {
            console.log('Notification trigger is in the past, skipping.');
            return;
        }

        const identifier = `order_${order.id}`;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🎂 Recordatorio de Entrega',
                body: `Entrega para ${order.clientName} en ${order.reminderDays} día(s).\n${order.description || order.size || 'Ver detalles'}`,
                sound: true,
                data: { orderId: order.id },
            },
            trigger: triggerDate as unknown as Notifications.NotificationTriggerInput,
            identifier, // This replaces any existing notification with same ID
        });

        console.log(`Scheduled notification for order ${order.id} at ${triggerDate.toISOString()}`);

    } catch (error) {
        console.error('Error scheduling notification:', error);
    }
}

export async function cancelOrderNotification(orderId: string) {
    try {
        await Notifications.cancelScheduledNotificationAsync(`order_${orderId}`);
    } catch (error) {
        console.error('Error canceling notification:', error);
    }
}
