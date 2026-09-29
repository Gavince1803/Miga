import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// Configuración de RevenueCat
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

export const ENTITLEMENT_ID = 'Miga Pro';

export async function initializeRevenueCat(userId?: string) {
    if (process.env.NODE_ENV === 'development') {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey = Platform.select({
        ios: REVENUECAT_API_KEY_IOS,
        android: REVENUECAT_API_KEY_ANDROID,
    });

    if (!apiKey) {
        console.warn('RevenueCat API Key no configurada para esta plataforma');
        return;
    }

    // Configurar con el API Key
    Purchases.configure({ apiKey, appUserID: userId });
    configuredUserId = userId ?? null;
}

let configuredUserId: string | null | undefined; // undefined = not configured yet

/**
 * Keeps RevenueCat's user in sync with the Supabase session. RevenueCat must be
 * configured once; switching accounts goes through logIn/logOut. Configuring
 * again on every auth event (token refreshes included) could leave purchases
 * attached to the previous account on a shared device.
 */
export async function syncRevenueCatUser(userId: string | null) {
    try {
        if (configuredUserId === undefined) {
            await initializeRevenueCat(userId ?? undefined);
            return;
        }
        if (configuredUserId === userId) return;

        if (userId) {
            await Purchases.logIn(userId);
        } else {
            // logOut throws if the current user is already anonymous
            if (!(await Purchases.isAnonymous())) await Purchases.logOut();
        }
        configuredUserId = userId;
    } catch (e) {
        console.error('Error syncing RevenueCat user:', e);
    }
}

export async function getPremiumStatus(): Promise<boolean> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (e) {
        console.error('Error al obtener estado de RevenueCat:', e);
        return false;
    }
}

export interface TrialInfo {
    isOnTrial: boolean;
    expirationDate: Date | null;
}

export async function getTrialInfo(): Promise<TrialInfo> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

        if (!entitlement) {
            return { isOnTrial: false, expirationDate: null };
        }

        const isOnTrial = entitlement.periodType === 'TRIAL';
        const expirationDate = entitlement.expirationDate
            ? new Date(entitlement.expirationDate)
            : null;

        return { isOnTrial, expirationDate };
    } catch (e) {
        console.error('Error al obtener info del trial:', e);
        return { isOnTrial: false, expirationDate: null };
    }
}

export async function restorePurchases(): Promise<boolean> {
    try {
        const customerInfo = await Purchases.restorePurchases();
        return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (e) {
        console.error('Error al restaurar compras:', e);
        return false;
    }
}
