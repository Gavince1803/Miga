import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function useHaptics() {
    const isWeb = Platform.OS === 'web';

    const light = async () => {
        if (isWeb) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {
            // Ignore errors on unsupported devices
        }
    };

    const medium = async () => {
        if (isWeb) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) { }
    };

    const heavy = async () => {
        if (isWeb) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (e) { }
    };

    const success = async () => {
        if (isWeb) return;
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) { }
    };

    const error = async () => {
        if (isWeb) return;
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) { }
    };

    const warning = async () => {
        if (isWeb) return;
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (e) { }
    };

    const selection = async () => {
        if (isWeb) return;
        try {
            await Haptics.selectionAsync();
        } catch (e) { }
    };

    return {
        light,
        medium,
        heavy,
        success,
        error,
        warning,
        selection
    };
}
