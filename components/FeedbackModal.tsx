import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const CATEGORIES = [
    { value: 'pedidos', label: 'Pedidos' },
    { value: 'inventario', label: 'Inventario' },
    { value: 'finanzas', label: 'Finanzas' },
    { value: 'precios', label: 'Precios' },
    { value: 'otro', label: 'Otra cosa' },
] as const;

type Category = typeof CATEGORIES[number]['value'];

// Suggestions form, opened from "Enviar sugerencia" in Settings
export default function FeedbackModal({
    visible,
    onClose,
}: {
    visible: boolean;
    onClose: () => void;
}) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { showToast } = useToast();

    const [category, setCategory] = useState<Category | null>(null);
    const [message, setMessage] = useState('');
    const [allowContact, setAllowContact] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (visible) {
            setCategory(null);
            setMessage('');
            setAllowContact(false);
        }
    }, [visible]);

    const handleSend = async () => {
        if (!category) return;
        setSending(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');
            const { error } = await supabase.from('feedback').insert({
                user_id: user.id,
                category,
                message: message.trim() || null,
                allow_contact: allowContact,
            });
            if (error) throw error;
            onClose();
            showToast({ message: '¡Gracias! Leemos cada sugerencia 💛', duration: 3000 });
        } catch (error) {
            console.error('Error sending feedback:', error);
            showToast({ message: 'No se pudo enviar. Intenta de nuevo.', duration: 3000 });
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.lg]}>
                    <Text style={[styles.title, { color: colors.text }]}>¿Qué te gustaría mejorar?</Text>
                    <View style={styles.chips}>
                        {CATEGORIES.map(c => {
                            const selected = category === c.value;
                            return (
                                <TouchableOpacity
                                    key={c.value}
                                    style={[
                                        styles.chip,
                                        { borderColor: selected ? colors.primary : colors.border },
                                        selected && { backgroundColor: colors.primary + '20' },
                                    ]}
                                    onPress={() => setCategory(c.value)}
                                    testID={`feedback-category-${c.value}`}
                                >
                                    <Text style={[styles.chipText, { color: selected ? colors.primary : colors.textSecondary }]}>
                                        {c.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                        placeholder="Cuéntanos más (opcional)"
                        placeholderTextColor={colors.textMuted}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        testID="feedback-message"
                    />
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setAllowContact(v => !v)}
                        testID="feedback-allow-contact"
                    >
                        <FontAwesome
                            name={allowContact ? 'check-square' : 'square-o'}
                            size={20}
                            color={allowContact ? colors.primary : colors.textMuted}
                        />
                        <Text style={[styles.checkboxText, { color: colors.textSecondary }]}>
                            ¿Podemos escribirte por WhatsApp para conversarlo?
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: colors.primary, opacity: category ? 1 : 0.5 }]}
                        onPress={handleSend}
                        disabled={!category || sending}
                        testID="feedback-send"
                    >
                        {sending
                            ? <ActivityIndicator color="#FFF" />
                            : <Text style={styles.sendText}>Enviar</Text>}
                            </TouchableOpacity>
                    <TouchableOpacity style={styles.dismiss} onPress={onClose} testID="feedback-dismiss">
                        <Text style={[styles.dismissText, { color: colors.textMuted }]}>Ahora no</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.lg,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    card: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
    },
    title: {
        ...Typography.subtitle,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    chip: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    chipText: {
        ...Typography.caption,
        fontWeight: '500',
    },
    input: {
        ...Typography.body,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: Spacing.md,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    checkboxText: {
        ...Typography.caption,
        flex: 1,
    },
    sendButton: {
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    sendText: {
        ...Typography.bodyBold,
        color: '#FFF',
    },
    dismiss: {
        alignItems: 'center',
        paddingTop: Spacing.md,
    },
    dismissText: {
        ...Typography.caption,
    },
});
