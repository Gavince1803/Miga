import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export type ExchangeRates = {
    bcv: number;
    parallel: number;
    euro: number | null; // Placeholder for now
    lastUpdated: Date | null;
    loading: boolean;
    error: string | null;
};

type DolarApiResponse = {
    fuente: string;
    nombre: string;
    compra: number | null;
    venta: number | null;
    promedio: number;
    fechaActualizacion: string;
};

export function useExchangeRates() {
    const [rates, setRates] = useState<ExchangeRates>({
        bcv: 0,
        parallel: 0,
        euro: null,
        lastUpdated: null,
        loading: true,
        error: null,
    });

    const fetchRates = useCallback(async () => {
        try {
            setRates(prev => ({ ...prev, loading: true, error: null }));

            // Helper for timeout
            const fetchWithTimeout = async (url: string, timeout = 5000) => {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeout);
                try {
                    const response = await fetch(url, { signal: controller.signal });
                    clearTimeout(id);
                    return response;
                } catch (error) {
                    clearTimeout(id);
                    throw error;
                }
            };

            // Fetch concurrently with Promise.allSettled to allow partial success
            const [dolarApiResult, dolarApiEuroResult, bcvApiResult] = await Promise.allSettled([
                fetchWithTimeout('https://ve.dolarapi.com/v1/dolares').then(r => r.json()),
                fetchWithTimeout('https://ve.dolarapi.com/v1/euros').then(r => r.json()),
                fetchWithTimeout('https://api.dolarvzla.com/public/exchange-rate').then(r => r.json())
            ]);

            let bcvRate = 0;
            let parallelRate = 0;
            let euroRate = 0;

            // Process DolarAPI (USD)
            if (dolarApiResult.status === 'fulfilled') {
                const data = dolarApiResult.value as DolarApiResponse[];
                bcvRate = data.find(d => d.fuente === 'oficial')?.promedio || 0;
                parallelRate = data.find(d => d.fuente === 'paralelo')?.promedio || 0;
            } else {
                console.warn('DolarAPI (USD) failed:', dolarApiResult.reason);
            }

            // Process DolarAPI (Euro) - Robust Fallback
            if (dolarApiEuroResult.status === 'fulfilled') {
                const data = dolarApiEuroResult.value as DolarApiResponse[];
                // DolarAPI /v1/euros usually returns list with 'oficial'.
                // Fallback: Use the first item if 'oficial' not found.
                const official = data.find(d => d.fuente === 'oficial');
                if (official) {
                    euroRate = official.promedio;
                } else if (data.length > 0) {
                    // Fallback to first available if defined
                    euroRate = data[0].promedio || 0;
                }
            }

            // Process BCV API (Primary source check, overwrite if valid and different?)
            // Actually DolarAPI is quite reliable. Let's use BCV API as a fallback or cross-check.
            if (bcvApiResult.status === 'fulfilled') {
                const data = bcvApiResult.value as any;

                // If we didn't get Euro from DolarAPI, try here
                if (euroRate === 0) {
                    euroRate = data?.current?.eur || 0;
                }

                // Fallback for BCV USD
                if (bcvRate === 0) {
                    bcvRate = data?.current?.usd || 0;
                }
            } else {
                console.warn('BCV API failed:', bcvApiResult.reason);
            }

            setRates({
                bcv: bcvRate,
                parallel: parallelRate,
                euro: euroRate,
                lastUpdated: new Date(),
                loading: false,
                error: (bcvRate === 0 && parallelRate === 0) ? 'Error obteniendo tasas' : null,
            });

        } catch (error) {
            console.error('Critical error in exchange rates:', error);
            setRates(prev => ({
                ...prev,
                loading: false,
                error: 'Error de conexión'
            }));
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchRates();
    }, [fetchRates]);

    // Refetch on app foreground
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                fetchRates();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [fetchRates]);

    return { ...rates, refreshRates: fetchRates };
}
