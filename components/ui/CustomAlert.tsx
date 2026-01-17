import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirmation';

export interface AlertInputConfig {
    placeholder?: string;
    defaultValue?: string;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
    secureTextEntry?: boolean;
}

export interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: (value?: string) => void;
}

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: AlertType;
    inputConfig?: AlertInputConfig;
    buttons?: AlertButton[];
    onClose: () => void;
}

export function CustomAlert({
    visible,
    title,
    message,
    type = 'info',
    inputConfig,
    buttons = [],
    onClose
}: CustomAlertProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.9));
    const [inputValue, setInputValue] = useState(inputConfig?.defaultValue || '');

    useEffect(() => {
        setInputValue(inputConfig?.defaultValue || '');
    }, [visible, inputConfig]);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const getIcon = () => {
        switch (type) {
            case 'success': return { name: 'check-circle', color: colors.success };
            case 'error': return { name: 'times-circle', color: colors.error };
            case 'warning': return { name: 'exclamation-triangle', color: colors.warning };
            case 'confirmation': return { name: 'question-circle', color: colors.primary };
            default: return { name: 'info-circle', color: colors.primary };
        }
    };

    const iconData = getIcon();

    // Default button if none provided
    const displayButtons = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: () => onClose() }];

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.alertContainer,
                        {
                            backgroundColor: colors.surface,
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                        Shadows.lg
                    ]}
                >
                    <ScrollView
                        style={{ flexGrow: 0 }}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.content}>
                            <View style={[styles.iconContainer, { backgroundColor: iconData.color + '15' }]}>
                                <FontAwesome name={iconData.name as any} size={24} color={iconData.color} />
                            </View>

                            <Text style={[styles.title, { color: colors.text }]}>
                                {title}
                            </Text>

                            <Text style={[styles.message, { color: colors.textSecondary }]}>
                                {message}
                            </Text>

                            {inputConfig && (
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                        borderColor: colors.border
                                    }]}
                                    placeholder={inputConfig.placeholder}
                                    placeholderTextColor={colors.textMuted}
                                    value={inputValue}
                                    onChangeText={setInputValue}
                                    keyboardType={inputConfig.keyboardType || 'default'}
                                    secureTextEntry={inputConfig.secureTextEntry}
                                    autoFocus={true}
                                />
                            )}
                        </View>

                        <View style={[styles.buttonContainer, displayButtons.length > 2 && styles.buttonContainerVertical]}>
                            {displayButtons.map((btn, index) => {
                                const isCancel = btn.style === 'cancel';
                                const isDestructive = btn.style === 'destructive';

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            displayButtons.length > 2 && styles.buttonVertical,
                                            !isCancel && !isDestructive && { backgroundColor: colors.primary },
                                            isDestructive && { backgroundColor: colors.error + '20' },
                                            isCancel && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
                                        ]}
                                        onPress={() => {
                                            if (btn.onPress) btn.onPress(inputValue);
                                            onClose();
                                        }}
                                    >
                                        <Text style={[
                                            styles.buttonText,
                                            !isCancel && !isDestructive && { color: '#FFF' },
                                            isDestructive && { color: colors.error },
                                            isCancel && { color: colors.textSecondary },
                                        ]}>
                                            {btn.text}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.md, // Reduced padding
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },

    alertContainer: {
        width: '100%',
        minWidth: 280,
        maxWidth: 320,
        // maxHeight removed to allow content to grow
        borderRadius: BorderRadius.xl,
        overflow: 'hidden', // Keep overflow hidden for rounded corners
    },
    scrollContent: {
        padding: Spacing.md,
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        marginBottom: Spacing.lg, // Reduced margin
        width: '100%',
    },
    iconContainer: {
        width: 48, // Smaller icon
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    title: {
        ...Typography.subtitle,
        fontSize: 18, // Slightly smaller
        textAlign: 'center',
        marginBottom: 4,
    },
    message: {
        ...Typography.body,
        textAlign: 'center',
        lineHeight: 20,
        fontSize: 14,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: Spacing.sm, // Tighter gap
        justifyContent: 'center',
    },
    buttonContainerVertical: {
        flexDirection: 'column',
    },
    button: {
        flex: 1,
        paddingVertical: 10, // Shorter buttons
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 40,
    },
    buttonVertical: {
        width: '100%',
    },
    buttonText: {
        ...Typography.bodyBold,
        fontSize: 14, // Smaller text
        textAlign: 'center',
    },
    input: {
        width: '100%',
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8, // More compact input
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        fontSize: 16,
    }
});
