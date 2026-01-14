import { supabase } from '@/lib/supabase';
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

export function useSubscription() {
    const [status, setStatus] = useState<SubscriptionStatus>({
        isPremium: false,
        planType: 'free',
        premiumUntil: null,
        loading: true,
    });

    const checkPremiumStatus = useCallback(async () => {
        try {
            const { data, error } = await supabase.rpc('check_premium_status');

            if (error) {
                console.error('Error checking premium status:', error);
                setStatus(prev => ({ ...prev, loading: false }));
                return;
            }

            setStatus({
                isPremium: data?.is_premium ?? false,
                planType: data?.plan_type ?? 'free',
                premiumUntil: data?.premium_until ? new Date(data.premium_until) : null,
                loading: false,
            });
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
        checkPremiumStatus();
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
