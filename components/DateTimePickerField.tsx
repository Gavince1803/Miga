import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, Typography } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type DateTimePickerFieldProps = Omit<Partial<React.ComponentProps<typeof DateTimePicker>>, 'onChange' | 'value'> & {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    mode: 'date' | 'time';
    required?: boolean;
};

export function DateTimePickerField({
    label,
    value,
    onChange,
    mode,
    required,
    ...rest
}: DateTimePickerFieldProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // On iOS, we often show the picker in a modal or inline. 
    // For consistency with the requested "smooth" UX, a bottom sheet or modal is good.
    // However, the standard iOS 14+ inline picker is quite good directly in the UI if styled right.
    // Let's use a modal approach for a cleaner form flow, or inline if preferred.
    // Given the previous layout jumpiness, a Modal or separate visualization is safer.

    const [showPicker, setShowPicker] = useState(false);

    const handleChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (selectedDate) {
            onChange(selectedDate);
        }
    };

    const formatDate = (date: Date) => {
        if (mode === 'time') {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.text }]}>
                {label}
                {required && <Text style={{ color: colors.error }}> *</Text>}
            </Text>

            <TouchableOpacity
                style={[styles.inputButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setShowPicker(true)}
            >
                <Text style={[styles.valueText, { color: colors.text }]}>
                    {formatDate(value)}
                </Text>
                <FontAwesome
                    name={mode === 'time' ? "clock-o" : "calendar"}
                    size={16}
                    color={colors.textSecondary}
                />
            </TouchableOpacity>

            {/* Android Picker */}
            {Platform.OS === 'android' && showPicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={value}
                    mode={mode}
                    is24Hour={false} // Force 12h
                    onChange={handleChange}
                    display="default"
                    {...(rest as any)}
                />
            )}

            {/* iOS Picker - often better handled in a Modal to not shift layout */}
            {Platform.OS === 'ios' && (
                <Modal
                    transparent={true}
                    visible={showPicker}
                    animationType="slide"
                    onRequestClose={() => setShowPicker(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowPicker(false)} />
                        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                                <TouchableOpacity onPress={() => setShowPicker(false)}>
                                    <Text style={[styles.doneButton, { color: colors.primary }]}>Listo</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={value}
                                mode={mode}
                                is24Hour={false}
                                display="spinner" // Spinner is classic iOS wheel, very smooth
                                onChange={handleChange}
                                style={{ height: 200, width: '100%', alignSelf: 'center' }}
                                themeVariant={colorScheme ?? 'light'}
                                locale="es-US"
                                {...(rest as any)}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
        width: '100%',
    },
    label: {
        ...Typography.caption,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    inputButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderRadius: 8, // Fixed border radius
        height: 48, // Fixed height to prevent jumping
    },
    valueText: {
        ...Typography.body,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalDismiss: {
        flex: 1,
    },
    modalContent: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    doneButton: {
        ...Typography.bodyBold,
        fontSize: 17,
    },
});
