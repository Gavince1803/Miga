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
 * Schedules the reminders for an order: 3, 2 and 1 days before at 9:00, plus
 * one 2 hours before delivery on the day itself. A fixed small set keeps us
 * under iOS's 64 pending notifications and makes cancelling reliable.
 *
 * Reminders whose time already passed are skipped, except that on creation
 * (`fireMissedToday`) the latest one due today fires in 1 minute, so an order
 * created after 9:00 for tomorrow still gets its "mañana es la entrega".
 */
export async function scheduleOrderNotification(order: {
    id: string;
    clientName: string;
    description?: string;
    size?: string;
    deliveryDate: string; // YYYY-MM-DD
    deliveryTime: string; // "14:30" or "14:30:00"
    reminderDays?: number; // Kept for interface compatibility, ignored
}, options: { fireMissedToday?: boolean } = {}) {
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
        const deliveryMoment = new Date(year, month - 1, day);
        const hasTime = !!order.deliveryTime;
        const [hours, minutes] = hasTime ? order.deliveryTime.split(':').map(Number) : [12, 0];
        deliveryMoment.setHours(hours, minutes, 0, 0);

        await cancelOrderNotification(order.id);

        const now = new Date();
        if (deliveryMoment.getTime() <= now.getTime()) return;

        const friendlyDate = deliveryMoment.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const friendlyTime = deliveryMoment.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        const detail = order.description || order.size || 'Sin descripción';

        const reminders: { key: string; date: Date; title: string; body: string }[] = [];

        for (const daysBefore of [3, 2, 1]) {
            const date = new Date(year, month - 1, day - daysBefore, 9, 0, 0, 0);
            reminders.push(daysBefore === 1
                ? {
                    key: 'd1',
                    date,
                    title: '🚨 ¡Mañana es la entrega! 🎂',
                    body: `👩‍🍳 Para: ${order.clientName}\n📅 Fecha: ${friendlyDate}\n📝 Detalle: ${detail}`,
                }
                : {
                    key: `d${daysBefore}`,
                    date,
                    title: `⏰ Faltan ${daysBefore} días para el pedido`,
                    body: `Para: ${order.clientName}\nRecuerda preparar los ingredientes 🧁`,
                });
        }

        if (hasTime) {
            reminders.push({
                key: 'today',
                date: new Date(deliveryMoment.getTime() - 2 * 60 * 60 * 1000),
                title: `🎂 Hoy entregas a las ${friendlyTime}`,
                body: `Para: ${order.clientName}\n📝 Detalle: ${detail}`,
            });
        }

        const upcoming = reminders.filter(r => r.date.getTime() > now.getTime());
        if (options.fireMissedToday) {
            const missedToday = reminders
                .filter(r => r.date.getTime() <= now.getTime() && r.date.toDateString() === now.toDateString())
                .pop();
            if (missedToday) upcoming.push({ ...missedToday, date: new Date(now.getTime() + 60 * 1000) });
        }

        for (const reminder of upcoming) {
            const identifier = `order_${order.id}_${reminder.key}`;
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: reminder.title,
                    body: reminder.body,
                    sound: true,
                    data: { orderId: order.id },
                    subtitle: 'Agenda Repostera'
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date },
                identifier,
            });
            console.log(`Scheduled notification ${identifier} at ${reminder.date.toISOString()}`);
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

        let scheduledCount = 0;

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

            scheduledCount++;
            console.log(`Trial notification scheduled: ${reminder.identifier} at ${triggerDate.toISOString()}`);
        }

        // Only mark as done if at least one notification was actually scheduled
        if (scheduledCount > 0) {
            await AsyncStorage.setItem(storageKey, 'true');
        }
    } catch (error) {
        console.error('Error scheduling trial notifications:', error);
    }
}

export async function cancelOrderNotification(orderId: string) {
    try {
        // Match by orderId (and legacy identifiers) instead of guessing
        // identifiers: older versions scheduled one reminder per day.
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduled) {
            const data = notification.content.data as Record<string, unknown> | undefined;
            if (data?.orderId === orderId || notification.identifier.startsWith(`order_${orderId}`)) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            }
        }
    } catch (error) {
        console.error('Error canceling notification:', error);
    }
}

// On logout / account deletion, so the next account on this device doesn't
// get reminders with the previous account's clients.
export async function cancelAllNotifications() {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error canceling all notifications:', error);
    }
}

// Older versions scheduled one reminder per remaining day (`order_<id>_<n>`),
// which can exhaust iOS's 64 pending notifications. Keep only the last 3
// days before delivery, once per install.
export async function pruneLegacyOrderReminders() {
    try {
        const storageKey = 'legacy_order_reminders_pruned';
        if (await AsyncStorage.getItem(storageKey)) return;

        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduled) {
            const match = notification.identifier.match(/^order_.+_(\d+)$/);
            if (match && Number(match[1]) > 3) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            }
        }
        await AsyncStorage.setItem(storageKey, 'true');
    } catch (error) {
        console.error('Error pruning legacy reminders:', error);
    }
}
