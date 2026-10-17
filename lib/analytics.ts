import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// First-party usage events (table app_events, insert-only). No third-party SDK:
// the privacy policy promises no tracking tools.

const DEVICE_ID_KEY = 'miga_device_id';
let deviceIdPromise: Promise<string> | null = null;

// Random per-install id, so events before signup can be tied together
function getDeviceId(): Promise<string> {
    if (!deviceIdPromise) {
        deviceIdPromise = (async () => {
            try {
                const saved = await AsyncStorage.getItem(DEVICE_ID_KEY);
                if (saved) return saved;
                const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
                await AsyncStorage.setItem(DEVICE_ID_KEY, id);
                return id;
            } catch {
                return 'unknown';
            }
        })();
    }
    return deviceIdPromise;
}

export type EventName =
    | 'login_failed'
    | 'signup_opened'
    | 'signup_failed'
    | 'premium_gate'
    | 'paywall_viewed'
    | 'paywall_result'
    | 'quote_shared'
    | 'recipe_scanned'
    | 'calculator_example';

// Fire and forget: analytics must never block or break the app.
// user_id is filled by the database from the session (default auth.uid()).
export function track(name: EventName, props: Record<string, string | number | boolean> = {}) {
    getDeviceId()
        .then(device_id => supabase.from('app_events').insert({
            name,
            props,
            device_id,
            platform: Platform.OS,
            app_version: Constants.expoConfig?.version ?? null,
        }))
        .then(({ error }) => {
            if (error && __DEV__) console.warn('track failed:', name, error.message);
        })
        .catch(() => { });
}
