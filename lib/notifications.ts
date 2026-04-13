import AsyncStorage from '@react-native-async-storage/async-storage';
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
    reminderDays?: number; // Kept for interface compatibility but ignored or used as toggle
}) {
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

        // Cancel previous notifications for this order to avoid duplicates
        await cancelOrderNotification(order.id);

        const now = new Date();
        // Calculate total days until delivery
        const timeDiff = deliveryMoment.getTime() - now.getTime();
        const daysUntilDelivery = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysUntilDelivery <= 0) return;

        // Formatter for body text
        const friendlyDate = deliveryMoment.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

        // Schedule notification for EVERY DAY from now until delivery
        // Loop 'i' represents "days remaining"
        // We start from daysUntilDelivery down to 1
        for (let i = daysUntilDelivery; i >= 1; i--) {
            const triggerDate = new Date(deliveryMoment);
            triggerDate.setDate(triggerDate.getDate() - i);

            // Set notification time to 9:00 AM for daily reminders
            // Exception: If 'today' is the trigger date and it's past 9am, we might skip or set to soon.
            // For simplicity, let's target 9:00 AM. 
            // If the calculated triggerDate at 9am is in the past, JS Notifications usually fires immediately or fails.
            triggerDate.setHours(9, 0, 0, 0);

            // If it's already past 9am today, maybe schedule for "now + 1 min" or just skip today's morning reminder?
            // User request: "send a notification every day".
            // Let's stick to the relative day check.
            // If it's already past 9am today:
            // 1. If the trigger date is TODAY, send it 1 minute from now so the user gets it.
            // 2. If the trigger date is purely in the past (yesterday etc), skip it.
            if (triggerDate.getTime() <= Date.now()) {
                const isSameDay = triggerDate.toDateString() === new Date().toDateString();
                if (isSameDay) {
                    // Send in 1 minute
                    triggerDate.setTime(Date.now() + 60 * 1000);
                } else {
                    continue;
                }
            }

            const identifier = `order_${order.id}_${i}`;

            // --- COPY LOGIC ---
            let title = '';
            let body = '';

            if (i === 1) {
                title = `🚨 ¡Mañana es la entrega! 🎂`;
                body = `👩‍🍳 Para: ${order.clientName}\n📅 Fecha: ${friendlyDate}\n📝 Detalle: ${order.description || order.size || 'Sin descripción'}`;
            } else if (i <= 3) {
                title = `⏰ Faltan ${i} días para el pedido`;
                body = `Para: ${order.clientName}\nRecuerda preparar los ingredientes 🧁`;
            } else {
                title = `🗓️ Recordatorio: Faltan ${i} días`;
                body = `Pedido de ${order.clientName} para el ${friendlyDate}.`;
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

/**
 * Schedules trial expiration notifications (5 days, 2 days, last day).
 * Only schedules once per trial period using the expiration date as key.
 */
export async function scheduleTrialNotifications(expirationDate: Date): Promise<void> {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        // Use expiration date as part of the key so a new trial would re-schedule
        const storageKey = `trial_notifs_scheduled_${expirationDate.toISOString().split('T')[0]}`;
        const alreadyScheduled = await AsyncStorage.getItem(storageKey);
        if (alreadyScheduled === 'true') return;

        const now = new Date();

        const reminders = [
            {
                daysBeforeExpiry: 5,
                identifier: `trial_reminder_5d`,
                title: 'Tu prueba gratuita termina en 5 días 🧁',
                body: 'No pierdas acceso a tus reportes y recetario.',
            },
            {
                daysBeforeExpiry: 2,
                identifier: `trial_reminder_2d`,
                title: 'Te quedan 2 días de Miga Premium',
                body: 'Sigue gestionando tus pedidos sin límites.',
            },
            {
                daysBeforeExpiry: 0,
                identifier: `trial_reminder_last`,
                title: 'Hoy termina tu prueba gratuita ✨',
                body: 'Suscríbete por $4/mes y mantén todo tu historial.',
            },
        ];

        for (const reminder of reminders) {
            const triggerDate = new Date(expirationDate);
            triggerDate.setDate(triggerDate.getDate() - reminder.daysBeforeExpiry);
            triggerDate.setHours(10, 0, 0, 0);

            if (triggerDate.getTime() <= now.getTime()) continue;

            await Notifications.cancelScheduledNotificationAsync(reminder.identifier).catch(() => {});

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: reminder.title,
                    body: reminder.body,
                    sound: true,
                    data: { type: 'trial_expiry' },
                    subtitle: 'Miga Premium',
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: triggerDate,
                },
                identifier: reminder.identifier,
            });

            console.log(`Trial notification scheduled: ${reminder.identifier} at ${triggerDate.toISOString()}`);
        }

        await AsyncStorage.setItem(storageKey, 'true');
    } catch (error) {
        console.error('Error scheduling trial notifications:', error);
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
