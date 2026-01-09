import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

function SettingRow({
    icon,
    label,
    value,
    onPress,
    colors,
    showChevron = true,
}: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    colors: typeof Colors.light;
    showChevron?: boolean;
}) {
    return (
        <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + '15' }]}>
                <FontAwesome name={icon as any} size={16} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
                {value && (
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
                )}
            </View>
            {showChevron && onPress && (
                <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
            )}
        </TouchableOpacity>
    );
}

function SettingToggle({
    icon,
    label,
    subtitle,
    value,
    onValueChange,
    colors,
}: {
    icon: string;
    label: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    colors: typeof Colors.light;
}) {
    return (
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + '15' }]}>
                <FontAwesome name={icon as any} size={16} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
                {subtitle && (
                    <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
                )}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: colors.border, true: colors.primary + '50' }}
                thumbColor={value ? colors.primary : colors.textMuted}
            />
        </View>
    );
}

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [reminderEnabled, setReminderEnabled] = useState(true);
    const [dailyReminders, setDailyReminders] = useState(true);
    const [reminderDays, setReminderDays] = useState(1);
    const [reminderTime, setReminderTime] = useState('09:00');

    const handleBusinessName = () => {
        Alert.prompt(
            'Nombre del Negocio',
            'Ingresa el nombre de tu repostería',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Guardar', onPress: (name: string | undefined) => console.log('Business name:', name) },
            ],
            'plain-text',
            'Mi Repostería'
        );
    };

    const handlePhoneEdit = () => {
        Alert.prompt(
            'Editar Teléfono',
            'Ingresa el nuevo número de teléfono',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Guardar', onPress: (phone: string | undefined) => console.log('New phone:', phone) },
            ],
            'plain-text',
            '+58 412 123 4567',
            'phone-pad'
        );
    };

    const handleExportData = () => {
        Alert.alert(
            'Exportar Datos',
            '¿Qué datos quieres exportar?',
            [
                { text: 'Pedidos', onPress: () => Alert.alert('Próximamente', 'Esta función estará disponible pronto.') },
                { text: 'Inventario', onPress: () => Alert.alert('Próximamente', 'Esta función estará disponible pronto.') },
                { text: 'Todo', onPress: () => Alert.alert('Próximamente', 'Esta función estará disponible pronto.') },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Profile Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    PERFIL
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <SettingRow
                        icon="building"
                        label="Nombre del Negocio"
                        value="Mi Repostería"
                        onPress={handleBusinessName}
                        colors={colors}
                    />
                    <SettingRow
                        icon="phone"
                        label="Teléfono"
                        value="+58 412 123 4567"
                        onPress={handlePhoneEdit}
                        colors={colors}
                    />
                </View>
            </View>

            {/* Reminders Section - Removed as per feedback (handled per order) */}

            {/* Data Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    DATOS
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <SettingRow
                        icon="cloud-download"
                        label="Exportar Datos"
                        value="Excel, CSV"
                        onPress={handleExportData}
                        colors={colors}
                    />
                    <SettingRow
                        icon="cloud-upload"
                        label="Importar Inventario"
                        value="Desde Excel"
                        onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto.')}
                        colors={colors}
                    />
                    <SettingRow
                        icon="book"
                        label="Recetas"
                        value="Gestiona tus recetas"
                        onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto.')}
                        colors={colors}
                    />
                </View>
            </View>

            {/* About Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    INFORMACIÓN
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <SettingRow
                        icon="info-circle"
                        label="Versión"
                        value="1.0.0"
                        colors={colors}
                        showChevron={false}
                    />
                    <SettingRow
                        icon="question-circle"
                        label="Ayuda"
                        onPress={() => { }}
                        colors={colors}
                    />
                    <SettingRow
                        icon="envelope"
                        label="Contacto"
                        value="soporte@agendarepostera.com"
                        onPress={() => { }}
                        colors={colors}
                    />
                </View>
            </View>

            {/* Logout */}
            <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: colors.error + '10' }]}
                onPress={() => Alert.alert('Cerrar Sesión', '¿Estás segura de que quieres cerrar sesión?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Cerrar Sesión', style: 'destructive', onPress: () => { } },
                ])}
            >
                <FontAwesome name="sign-out" size={18} color={colors.error} />
                <Text style={[styles.logoutText, { color: colors.error }]}>
                    Cerrar Sesión
                </Text>
            </TouchableOpacity>

            <View style={{ height: 120 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingTop: Spacing.md,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.small,
        fontWeight: '600',
        letterSpacing: 1,
        marginLeft: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    sectionCard: {
        marginHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    settingContent: {
        flex: 1,
    },
    settingLabel: {
        ...Typography.body,
        fontWeight: '500',
    },
    settingValue: {
        ...Typography.caption,
        marginTop: 2,
    },
    settingSubtitle: {
        ...Typography.small,
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
    },
    logoutText: {
        ...Typography.bodyBold,
    },
});
