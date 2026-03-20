import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Currency = 'VES' | 'USD' | 'MXN' | 'ARS' | 'COP' | 'CLP';

// Monedas soportadas con su símbolo local
export const CURRENCIES: Record<Currency, { symbol: string, label: string }> = {
    VES: { symbol: '$', label: 'Bolívares (VES)' },
    USD: { symbol: '$', label: 'Dólares (USD)' },
    MXN: { symbol: '$', label: 'Pesos Mexicanos (MXN)' },
    ARS: { symbol: '$', label: 'Pesos Argentinos (ARS)' },
    COP: { symbol: '$', label: 'Pesos Colombianos (COP)' },
    CLP: { symbol: '$', label: 'Pesos Chilenos (CLP)' },
};

type SettingsContextType = {
    currency: Currency;
    updateCurrency: (newCurrency: Currency) => Promise<void>;
    loading: boolean;
};

const SettingsContext = createContext<SettingsContextType>({
    currency: 'VES', // VES by default to not break existing users
    updateCurrency: async () => { },
    loading: true,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrency] = useState<Currency>('VES');
    const [loading, setLoading] = useState(true);

    // Fetch user preferences on mount or auth state change
    useEffect(() => {
        let isMounted = true;

        const loadSettings = async (session: Session | null) => {
            if (!session?.user?.id) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('currency')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('Error fetching user settings:', error);
                } else if (data && data.currency && isMounted) {
                    // Type check to ensure we only load valid currencies
                    if (Object.keys(CURRENCIES).includes(data.currency)) {
                        setCurrency(data.currency as Currency);
                    }
                }
            } catch (err) {
                console.error('Unexpected error loading settings:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            loadSettings(session);
        });

        // Listen for auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                setLoading(true);
                loadSettings(session);
            } else {
                // If logged out, reset to default
                if (isMounted) {
                    setCurrency('VES');
                    setLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const updateCurrency = async (newCurrency: Currency) => {
        // Optimistic update
        setCurrency(newCurrency);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;

            const { error } = await supabase
                .from('profiles')
                .update({ currency: newCurrency })
                .eq('id', session.user.id);

            if (error) {
                console.error('Failed to update currency in Supabase:', error);
                // We could potentially rollback the optimistic update here if desired
            }
        } catch (err) {
            console.error('Unexpected error updating currency:', err);
        }
    };

    return (
        <SettingsContext.Provider value={{ currency, updateCurrency, loading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsContext);
