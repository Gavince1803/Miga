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

            // Parallel & USD BCV from ve.dolarapi.com (Reliable for Parallel)
            const dolarApiResponse = await fetch('https://ve.dolarapi.com/v1/dolares');
            const dolarApiData: DolarApiResponse[] = await dolarApiResponse.json();

            // Euro BCV from api.dolarvzla.com (Reliable for BCV Euro)
            const bcvResponse = await fetch('https://api.dolarvzla.com/public/exchange-rate');
            const bcvData = await bcvResponse.json();

            const bcvRate = dolarApiData.find(d => d.fuente === 'oficial')?.promedio || 0;
            const parallelRate = dolarApiData.find(d => d.fuente === 'paralelo')?.promedio || 0;
            const euroRate = bcvData?.current?.eur || 0;

            setRates({
                bcv: bcvRate,
                parallel: parallelRate,
                euro: euroRate,
                lastUpdated: new Date(),
                loading: false,
                error: null,
            });
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
            setRates(prev => ({
                ...prev,
                loading: false,
                error: 'Error al actualizar tasas'
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
