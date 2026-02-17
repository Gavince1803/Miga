import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface EditableDropdownProps {
    label: string;
    value: string;
    onValueChange: (value: string) => void; // Parent handles state
    category: 'filling' | 'cover' | 'occasion' | 'cake_type';
    defaultOptions: readonly string[];
}

export function EditableDropdown({
    label,
    value,
    onValueChange,
    category,
    defaultOptions
}: EditableDropdownProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [customValue, setCustomValue] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Fetch options from DB + Defaults
    const fetchOptions = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data, error } = await supabase
                    .from('options_dictionary')
                    .select('value')
                    .eq('category', category)
                    .order('value');

                if (!error && data) {
                    const dbValues = data.map(d => d.value);
                    // Merge DB values with defaults, deduplicate
                    const allOptions = Array.from(new Set([...defaultOptions, ...dbValues]));
                    setOptions(allOptions.sort());
                } else {
                    setOptions([...defaultOptions]);
                }
            } else {
                setOptions([...defaultOptions]);
            }
        } catch (e) {
            setOptions([...defaultOptions]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchOptions();
        }
    }, [visible]);

    const handleSelect = (item: string) => {
        onValueChange(item);
        setVisible(false);
        setShowCustomInput(false);
    };

    const handleCustomSubmit = () => {
        if (customValue.trim()) {
            onValueChange(customValue.trim());
            setVisible(false);
            setShowCustomInput(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>

            <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                    Keyboard.dismiss();
                    setVisible(true);
                }}
            >
                <Text style={[styles.valueText, { color: value ? colors.text : colors.textMuted }]}>
                    {value || 'Seleccionar o escribir...'}
                </Text>
                <FontAwesome name="chevron-down" size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            <Modal
                transparent
                visible={visible}
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }, Shadows.lg]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                Seleccionar {label}
                            </Text>
                            <TouchableOpacity onPress={() => setVisible(false)}>
                                <FontAwesome name="times" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ margin: 20 }} />
                        ) : (
                            <>
                                {showCustomInput ? (
                                    <View style={styles.customInputContainer}>
                                        <TextInput
                                            style={[styles.customInput, { color: colors.text, borderColor: colors.border }]}
                                            placeholder={`Escribe nuevo ${label.toLowerCase()}...`}
                                            placeholderTextColor={colors.textMuted}
                                            value={customValue}
                                            onChangeText={setCustomValue}
                                            autoFocus
                                        />
                                        <TouchableOpacity
                                            style={[styles.addButton, { backgroundColor: colors.primary }]}
                                            onPress={handleCustomSubmit}
                                        >
                                            <Text style={styles.addButtonText}>Usar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ marginTop: 10, alignSelf: 'center' }}
                                            onPress={() => setShowCustomInput(false)}
                                        >
                                            <Text style={{ color: colors.textSecondary }}>Volver a la lista</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <FlatList
                                        keyboardShouldPersistTaps="handled"
                                        data={options}
                                        keyExtractor={(item) => item}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[
                                                    styles.optionItem,
                                                    { backgroundColor: value === item ? colors.primary + '10' : 'transparent' }
                                                ]}
                                                onPress={() => handleSelect(item)}
                                            >
                                                <Text style={[
                                                    styles.optionText,
                                                    {
                                                        color: value === item ? colors.primary : colors.text,
                                                        fontWeight: value === item ? '600' : '400'
                                                    }
                                                ]}>
                                                    {item}
                                                </Text>
                                                {value === item && <FontAwesome name="check" size={14} color={colors.primary} />}
                                            </TouchableOpacity>
                                        )}
                                        ListHeaderComponent={
                                            <TouchableOpacity
                                                style={[styles.createNewButton, { borderColor: colors.primary }]}
                                                onPress={() => {
                                                    setCustomValue('');
                                                    setShowCustomInput(true);
                                                }}
                                            >
                                                <FontAwesome name="plus" size={14} color={colors.primary} />
                                                <Text style={[styles.createNewText, { color: colors.primary }]}>
                                                    Agregar nuevo...
                                                </Text>
                                            </TouchableOpacity>
                                        }
                                        style={styles.list}
                                    />
                                )}
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    label: {
        ...Typography.caption,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
    },
    valueText: {
        ...Typography.body,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    modalTitle: {
        ...Typography.bodyBold,
        fontSize: 16,
    },
    list: {
        marginTop: Spacing.sm,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    optionText: {
        ...Typography.body,
    },
    createNewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        gap: 8,
    },
    createNewText: {
        ...Typography.body,
        fontWeight: '600',
    },
    customInputContainer: {
        padding: Spacing.md,
    },
    customInput: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: 16,
        marginBottom: Spacing.md,
    },
    addButton: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
