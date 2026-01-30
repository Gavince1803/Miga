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

            let bcvRate = 0;
            let parallelRate = 0;
            let euroRate = 0;

            // 1. Fetch Dollars (Both BCV and Parallel)
            // We use the list endpoint to get both in one request if possible, 
            // but to be consistent with the user's snippet which uses /oficial, 
            // let's try to get them reliable. The list endpoint /v1/dolares works well for both.
            try {
                const dollarResponse = await fetchWithTimeout('https://ve.dolarapi.com/v1/dolares');
                if (dollarResponse.ok) {
                    const data = await dollarResponse.json() as DolarApiResponse[];
                    bcvRate = data.find(d => d.fuente === 'oficial')?.promedio || 0;
                    parallelRate = data.find(d => d.fuente === 'paralelo')?.promedio || 0;
                }
            } catch (e) {
                console.warn('Error fetching Dollars:', e);
            }

            // 2. Try Fetch Euro (BCV)
            try {
                const euroResponse = await fetchWithTimeout('https://ve.dolarapi.com/v1/euros/oficial');
                if (euroResponse.ok) {
                    const data = await euroResponse.json();
                    euroRate = data.promedio || 0;
                }
            } catch (e) {
                console.log('Euro API direct fetch failed, trying fallback...');
            }

            // 3. Fallback: Calculate Euro from Dollar if API failed
            if (euroRate === 0 && bcvRate > 0) {
                try {
                    const crossRes = await fetchWithTimeout('https://api.exchangerate-api.com/v4/latest/USD');
                    if (crossRes.ok) {
                        const crossData = await crossRes.json();
                        // 1 USD = X EUR (e.g., 0.96)
                        // 1 EUR = 1/X USD
                        // Rate EUR/Bs = Rate USD/Bs * (1 EUR in USD)
                        const rates = crossData.rates as { EUR: number };
                        if (rates.EUR) {
                            const usdPerEur = 1 / rates.EUR;
                            euroRate = parseFloat((bcvRate * usdPerEur).toFixed(2));
                            console.log(`Calculated Euro via Cross Rate: ${euroRate} (Factor: ${usdPerEur})`);
                        }
                    }
                } catch (err) {
                    console.warn('Cross rate fetch failed, using hard constant');
                    // Hard Fallback (Constant 1.05)
                    euroRate = parseFloat((bcvRate * 1.05).toFixed(2));
                }
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
