import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useRef } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface DynamicListInputProps {
    data: string[];
    onUpdate: (newData: string[]) => void;
    placeholder?: string;
    label?: string;
    icon?: string;
    numbered?: boolean; // For Steps 1, 2, 3...
}

export default function DynamicListInput({
    data,
    onUpdate,
    placeholder = 'Escribe aquí...',
    label,
    icon,
    numbered = false,
}: DynamicListInputProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // Refs to manage focus if needed (simple array of refs)
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleChange = (text: string, index: number) => {
        // Smart Paste & Enter Logic: Check for newlines
        // If user types 'Enter', text will have a \n.
        if (text.includes('\n')) {
            const splitItems = text.split('\n');
            const currentItem = splitItems[0];
            const nextItems = splitItems.slice(1);

            const newData = [...data];
            newData[index] = currentItem;

            // Insert new items
            if (nextItems.length > 0) {
                newData.splice(index + 1, 0, ...nextItems);
            }

            onUpdate(newData);

            // Focus next input logic
            setTimeout(() => {
                // Determine focus index based on how many items added
                const nextIndex = index + 1;
                if (inputRefs.current[nextIndex]) {
                    inputRefs.current[nextIndex]?.focus();
                }
            }, 50);

            return;
        }

        const newData = [...data];
        newData[index] = text;
        onUpdate(newData);
    };

    const handleAddItem = () => {
        onUpdate([...data, '']);
    };

    const handleRemoveItem = (index: number) => {
        const newData = data.filter((_, i) => i !== index);
        onUpdate(newData.length ? newData : ['']); // Always keep at least one row? Or allow empty? Let's keep one empty row if all deleted.
    };

    const handleKeyPress = (e: any, index: number) => {
        // If Backspace on empty line, delete line and focus previous
        if (e.nativeEvent.key === 'Backspace' && data[index] === '' && data.length > 1) {
            handleRemoveItem(index);
            // Optional: Focus previous item logic could go here
        }
    };

    // Ensure there is always at least one input to start typing
    if (data.length === 0) {
        // This causes side effect during render if we call onUpdate here directly.
        // Better to handle in parent or render a default empty input but not update state yet?
        // Let's assume parent initializes with [''].
    }

    return (
        <View style={styles.container}>
            {label && (
                <View style={styles.labelContainer}>
                    {icon && <FontAwesome name={icon as any} size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />}
                    <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
                </View>
            )}

            {data.map((item, index) => (
                <View key={index} style={styles.row}>
                    {numbered && (
                        <View style={styles.numberBadge}>
                            <Text style={[styles.numberText, { color: colors.textMuted }]}>{index + 1}.</Text>
                        </View>
                    )}

                    <TextInput
                        ref={(el: TextInput | null) => { inputRefs.current[index] = el; }}
                        style={[
                            styles.input,
                            {
                                backgroundColor: colors.surface,
                                color: colors.text,
                                borderColor: colors.border
                            }
                        ]}
                        value={item}
                        onChangeText={(text) => handleChange(text, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        placeholder={placeholder}
                        placeholderTextColor={colors.textMuted}
                        multiline={true} // Allow wrapping within the item
                        blurOnSubmit={false} // Keep keyboard up
                    />

                    {data.length > 1 && (
                        <TouchableOpacity onPress={() => handleRemoveItem(index)} style={styles.removeBtn}>
                            <FontAwesome name="times" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
            ))}

            <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                onPress={handleAddItem}
            >
                <FontAwesome name="plus" size={14} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>Agregar línea</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    label: {
        ...Typography.caption,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    numberBadge: {
        width: 24,
        marginRight: 4,
        alignItems: 'flex-end',
    },
    numberText: {
        ...Typography.bodyBold,
        fontSize: 14,
    },
    input: {
        flex: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10, // Slightly reduced to fit text better in 48px
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        ...Typography.body,
        minHeight: 48,
        textAlignVertical: 'top', // Best for multiline text stability
    },
    removeBtn: {
        padding: Spacing.md,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginTop: 4,
        gap: 8,
    },
    addButtonText: {
        ...Typography.body,
        fontWeight: '600',
        fontSize: 14,
    }
});
