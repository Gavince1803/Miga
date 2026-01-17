import * as Notifications from 'expo-notifications';

// Configure how notifications behave when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({

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

        // Formatter for body text
        const friendlyDate = deliveryMoment.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

        // Loop from reminderDays down to 1
        for (let i = 1; i <= order.reminderDays; i++) {
            const triggerDate = new Date(deliveryMoment);
            triggerDate.setDate(triggerDate.getDate() - i);

            // If time is in the past, don't schedule
            if (triggerDate.getTime() <= Date.now()) {
                continue;
            }

            const identifier = `order_${order.id}_${i}`;

            // --- IMPROVED COPY LOGIC ---
            let title = '';
            let body = '';

            if (i === 1) {
                title = `🚨 ¡Mañana es la entrega! 🎂`;
                body = `👩‍🍳 Para: ${order.clientName}\n📅 Fecha: ${friendlyDate}\n📝 Detalle: ${order.description || order.size || 'Sin descripción'}`;
            } else if (i === 2) {
                title = `⏰ Faltan 2 días para el pedido`;
                body = `Para: ${order.clientName}\nRecuerda preparar los ingredientes 🧁`;
            } else if (i <= 7) {
                title = `📅 Recordatorio: Faltan ${i} días`;
                body = `Pedido de ${order.clientName} para el ${friendlyDate}.`;
            } else {
                title = `🗓️ Próximo Pedido (${i} días)`;
                body = `Cliente: ${order.clientName}\nFecha: ${friendlyDate}`;
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                    data: { orderId: order.id },
                    subtitle: 'Agenda Repostera'
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
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
