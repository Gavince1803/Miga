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

const CACHE_KEY = 'subscription_status_cache';

export function useSubscription() {
    const [status, setStatus] = useState<SubscriptionStatus>({
        isPremium: false,
        planType: 'free',
        premiumUntil: null,
        loading: true,
    });

    const loadCache = async () => {
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Check if likely valid (not expired if we have expiration?)
                // Actually, just trust cache for initial render
                setStatus(prev => ({
                    ...prev,
                    isPremium: parsed.isPremium,
                    planType: parsed.planType,
                    premiumUntil: parsed.premiumUntil ? new Date(parsed.premiumUntil) : null,
                    loading: false // Important: Stop loading if cache exists
                }));
            }
        } catch (e) {
            console.error('Failed to load subscription cache', e);
        }
    };

    const checkPremiumStatus = useCallback(async () => {
        try {
            // Check Supabase (Manual Codes)
            const { data, error } = await supabase.rpc('check_premium_status');

            // Check RevenueCat (IAP)
            const isRevenueCatPremium = await getPremiumStatus();

            if (error) {
                console.error('Error checking Supabase premium status:', error);
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
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newStatus));

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
                checkPremiumStatus();
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
