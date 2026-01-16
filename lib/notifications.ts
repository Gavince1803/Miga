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

        // Parse DATE as local time component (YYYY-MM-DD -> Local Year, Month, Day)
        // new Date('2024-01-01') is UTC, which shifts to previous day in Western Hemisphere.
        const parts = order.deliveryDate.split('-').map(Number);
        if (parts.length !== 3) {
            console.log('Invalid delivery date format:', order.deliveryDate);
            return;
        }
        const [year, month, day] = parts;

        // Month is 0-indexed in JS Date constructor
        const deliveryMoment = new Date(year, month - 1, day);

        const [hours, minutes] = order.deliveryTime ? order.deliveryTime.split(':').map(Number) : [12, 0];
        deliveryMoment.setHours(hours, minutes, 0, 0);

        // Calculate trigger time: X days before
        // User requested: "4 notifs, at 2:30am evrdyay" implies daily reminders leading up to the date.
        // We will schedule notifications for every day from 'reminderDays' ago up to 1 day ago.

        // Loop from reminderDays down to 1
        for (let i = 1; i <= order.reminderDays; i++) {
            const triggerDate = new Date(deliveryMoment);
            triggerDate.setDate(triggerDate.getDate() - i);

            // If time is in the past, don't schedule
            if (triggerDate.getTime() <= Date.now()) {
                console.log(`Notification for ${i} days before is in the past, skipping.`);
                continue;
            }

            // Unique ID per day: order_123_4 (4 days before), order_123_1 (1 day before)
            const identifier = `order_${order.id}_${i}`;
            // Also schedule the legacy ID for the "main" reminder (largest day count? or 1 day before?)
            // To be safe and clean, we'll just use the suffixed IDs. 
            // NOTE: We should probably ensure we clean up old non-suffixed ones too.

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: i === 1 ? '🎂 ¡Entrega Mañana!' : `🎂 Recordatorio de Entrega (${i} días)`,
                    body: `Tu pedido para ${order.clientName} es el ${order.deliveryDate}.\n${order.description || order.size || ''}`,
                    sound: true,
                    data: { orderId: order.id },
                },
                trigger: triggerDate as unknown as Notifications.NotificationTriggerInput,
                identifier,
            });

            console.log(`Scheduled notification ${identifier} at ${triggerDate.toISOString()}`);
        }

    } catch (error) {
        console.error('Error scheduling notification:', error);
    }
}

export async function cancelOrderNotification(orderId: string) {
    try {
        // Cancel legacy single notification
        await Notifications.cancelScheduledNotificationAsync(`order_${orderId}`);

        // Cancel potential daily reminders (up to 30 days coverage)
        for (let i = 1; i <= 30; i++) {
            await Notifications.cancelScheduledNotificationAsync(`order_${orderId}_${i}`);
        }
    } catch (error) {
        console.error('Error canceling notification:', error);
    }
}
