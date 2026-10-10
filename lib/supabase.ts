import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// React Native has no tab-visibility events, so the auto-refresh timer keeps
// running (or dies) in the background. Pause it there and restart it on resume,
// so a token that expired while the app was closed is refreshed before the
// first request instead of failing it. (Web handles this on its own.)
if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
        if (state === 'active') {
            supabase.auth.startAutoRefresh();
        } else {
            supabase.auth.stopAutoRefresh();
        }
    });
}

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return (
        SUPABASE_URL !== 'https://your-project.supabase.co' &&
        SUPABASE_ANON_KEY !== 'your-anon-key'
    );
};
