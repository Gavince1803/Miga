import { getPremiumStatus } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export interface SubscriptionStatus {
    isPremium: boolean;
    planType: 'free' | 'premium';
    premiumUntil: Date | null;
    loading: boolean;
}

export interface RedeemResult {
    success: boolean;
    error?: string;
    premiumUntil?: Date;
}

// One cache per account, so another account on the same device doesn't
// inherit this one's premium status.
const cacheKey = (userId: string) => `subscription_status_cache_${userId}`;

async function currentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user.id ?? null;
}

export function useSubscription() {
    const [status, setStatus] = useState<SubscriptionStatus>({
        isPremium: false,
        planType: 'free',
        premiumUntil: null,
        loading: true,
    });

    const loadCache = async () => {
        try {
            const userId = await currentUserId();
            if (!userId) return;
            const cached = await AsyncStorage.getItem(cacheKey(userId));
            if (cached) {
                const parsed = JSON.parse(cached);
                const premiumUntil = parsed.premiumUntil ? new Date(parsed.premiumUntil) : null;
                // A code-based premium that already expired shouldn't survive offline
                const expired = premiumUntil !== null && premiumUntil.getTime() < Date.now() && !parsed.viaStore;
                const isPremium = parsed.isPremium && !expired;
                setStatus(prev => ({
                    ...prev,
                    isPremium,
                    planType: isPremium ? 'premium' : 'free',
                    premiumUntil,
                    loading: false // Important: Stop loading if cache exists
                }));
            }
        } catch (e) {
            console.error('Failed to load subscription cache', e);
        }
    };

    const checkPremiumStatus = useCallback(async () => {
        try {
            const userId = await currentUserId();
            if (!userId) {
                setStatus({ isPremium: false, planType: 'free', premiumUntil: null, loading: false });
                return;
            }

            // Check Supabase (Manual Codes)
            const { data, error } = await supabase.rpc('check_premium_status');

            // Check RevenueCat (IAP)
            const isRevenueCatPremium = await getPremiumStatus();

            if (error) {
                // Offline or server error: we don't know the code-based status, so
                // keep what we had (cache) instead of downgrading a paying user.
                // Pago Móvil users on flaky connections were losing premium here.
                console.error('Error checking Supabase premium status:', error);
                setStatus(prev => isRevenueCatPremium
                    ? { ...prev, isPremium: true, planType: 'premium', loading: false }
                    : { ...prev, loading: false });
                return;
            }

            const isSupabasePremium = data?.is_premium ?? false;

            // User is premium if EITHER Supabase says so OR RevenueCat says so
            const isPremium = isSupabasePremium || isRevenueCatPremium;

            const newStatus = {
                isPremium,
                planType: isPremium ? 'premium' : 'free',
                premiumUntil: data?.premium_until ? new Date(data.premium_until) : null,
                loading: false,
            };

            setStatus(newStatus as SubscriptionStatus);

            // Update Cache
            AsyncStorage.setItem(cacheKey(userId), JSON.stringify({ ...newStatus, viaStore: isRevenueCatPremium }));

        } catch (error) {
            console.error('Error checking premium status:', error);
            setStatus(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const redeemCode = useCallback(async (code: string): Promise<RedeemResult> => {
        try {
            const { data, error } = await supabase.rpc('redeem_activation_code', {
                code_input: code.toUpperCase().trim()
            });

            if (error) {
                console.error('Error redeeming code:', error);
                return { success: false, error: 'Error al procesar el código' };
            }

            if (!data?.success) {
                return { success: false, error: data?.error || 'Código inválido' };
            }

            // Refresh status
            await checkPremiumStatus();

            return {
                success: true,
                premiumUntil: data.premium_until ? new Date(data.premium_until) : undefined,
            };
        } catch (error) {
            console.error('Error redeeming code:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }, [checkPremiumStatus]);

    // Check status on mount
    useEffect(() => {
        // First load cache for instant UI
        loadCache().then(() => {
            // Then fetch fresh data
            checkPremiumStatus();
        });
    }, [checkPremiumStatus]);

    // Refresh on app focus
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                loadCache().then(checkPremiumStatus);
            } else if (event === 'SIGNED_OUT') {
                setStatus({ isPremium: false, planType: 'free', premiumUntil: null, loading: false });
            }
        });

        return () => subscription.unsubscribe();
    }, [checkPremiumStatus]);

    return {
        ...status,
        redeemCode,
        refreshStatus: checkPremiumStatus,
    };
}

// Feature limits for free tier
export const FREE_TIER_LIMITS = {
    maxOrders: 10,
    maxInventoryItems: 20,
    maxRecipes: 5,
    canUseOCR: false,
    canExportExcel: false,
    canViewAdvancedStats: false,
};

// Check if a feature is available based on subscription
export function canUseFeature(
    feature: keyof typeof FREE_TIER_LIMITS,
    isPremium: boolean,
    currentCount?: number
): boolean {
    if (isPremium) return true;

    const limit = FREE_TIER_LIMITS[feature];
    if (typeof limit === 'boolean') return limit;
    if (typeof limit === 'number' && currentCount !== undefined) {
        return currentCount < limit;
    }
    return true;
}
