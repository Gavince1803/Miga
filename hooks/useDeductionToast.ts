import { useToast } from '@/context/ToastContext';
import { useInventory } from '@/hooks/useInventory';
import { describeDeduction, undoDeductionForOrder } from '@/lib/inventoryDeduction';
import { router } from 'expo-router';
import { useCallback } from 'react';

type DeductionResult = Parameters<typeof describeDeduction>[0];

// After a paid order deducts stock: a toast with "Deshacer", or a nudge to link
// a recipe when nothing was deducted. Replaces the blocking alert.
export function useDeductionToast() {
    const { showToast } = useToast();
    const { fetchInventory } = useInventory();

    return useCallback((orderId: string, result: DeductionResult) => {
        fetchInventory();
        const info = describeDeduction(result);
        if (!info) return;

        if (info.canUndo) {
            showToast({
                message: info.message,
                actionLabel: 'Deshacer',
                onAction: async () => {
                    const ok = await undoDeductionForOrder(orderId);
                    fetchInventory();
                    showToast({ message: ok ? 'Inventario restaurado' : 'No se pudo deshacer', duration: 2500 });
                },
            });
        } else if (info.needsRecipe) {
            showToast({
                message: info.message,
                actionLabel: 'Vincular',
                onAction: () => router.push(`/orders/edit?id=${orderId}`),
            });
        } else {
            showToast({ message: info.message });
        }
    }, [fetchInventory, showToast]);
}
