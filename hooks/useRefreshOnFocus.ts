import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

// Tabs stay mounted, so data loaded on mount goes stale after changes made
// on other screens. Re-run `refresh` every time the screen regains focus,
// skipping the first focus because the hooks already fetch on mount.
export function useRefreshOnFocus(refresh: () => void) {
    const isFirstFocus = useRef(true);
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    useFocusEffect(
        useCallback(() => {
            if (isFirstFocus.current) {
                isFirstFocus.current = false;
                return;
            }
            refreshRef.current();
        }, [])
    );
}
