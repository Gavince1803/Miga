import { Colors, Shadows, Spacing } from '@/constants/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/components/useColorScheme';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastOptions = {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    duration?: number;
    // Confirmation of a routine action (replaces the old "Éxito" + OK modals): checkmark,
    // success haptic, short duration
    variant?: 'success';
};

type ToastContextType = { showToast: (options: ToastOptions) => void };

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Non-blocking message at the bottom with an optional action (e.g. "Deshacer").
// Lives at the root, so it survives navigating away (e.g. router.back() after saving).
export function ToastProvider({ children }: { children: ReactNode }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastOptions | null>(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const current = useRef<ToastOptions | null>(null);

    const hide = useCallback(() => {
        current.current = null;
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
    }, [opacity]);

    const showToast = useCallback((options: ToastOptions) => {
        if (options.variant === 'success') {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            // Never cover a toast that offers an action (e.g. "Deshacer" after an inventory deduction)
            if (current.current?.actionLabel) return;
        }
        current.current = options;
        if (timer.current) clearTimeout(timer.current);
        setToast(options);
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        timer.current = setTimeout(hide, options.duration ?? (options.variant === 'success' ? 2500 : 6000));
    }, [hide, opacity]);

    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Animated.View
                    style={[styles.container, { bottom: insets.bottom + 72, opacity }]}
                    pointerEvents="box-none"
                >
                    <View style={[styles.toast, { backgroundColor: colors.text }, Shadows.md]} accessibilityLiveRegion="polite">
                        {toast.variant === 'success' && (
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        )}
                        <Text style={[styles.message, { color: colors.background }]}>{toast.message}</Text>
                        {toast.actionLabel && (
                            <TouchableOpacity
                                onPress={() => { toast.onAction?.(); hide(); }}
                                hitSlop={8}
                                accessibilityRole="button"
                            >
                                <Text style={[styles.action, { color: colors.primary }]}>{toast.actionLabel}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: Spacing.md,
        right: Spacing.md,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: 14,
        paddingHorizontal: Spacing.md,
        borderRadius: 14,
    },
    message: {
        flex: 1,
        fontSize: 14,
        lineHeight: 19,
    },
    action: {
        fontSize: 15,
        fontWeight: '700',
    },
});
