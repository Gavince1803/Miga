import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useSubscription } from '@/hooks/useSubscription';
import { requestNotificationPermissions } from '@/lib/notifications';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
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
    const router = useRouter();

    const [reminderEnabled, setReminderEnabled] = useState(true);
    const [dailyReminders, setDailyReminders] = useState(true);
    const [reminderDays, setReminderDays] = useState(1);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

    // Check notification permission status on mount
    useEffect(() => {
        const checkPermissions = async () => {
            const { status } = await Notifications.getPermissionsAsync();
            setNotificationStatus(status);
        };
        checkPermissions();
    }, []);

    const handleNotificationPermission = async () => {
        if (notificationStatus === 'granted') {
            // Already granted, show info
            Alert.alert('✅ Notificaciones Activas', 'Ya tienes los permisos de notificación activados.');
            return;
        }

        if (notificationStatus === 'denied') {
            // Denied - need to go to settings
            Alert.alert(
                'Permiso Denegado',
                'Las notificaciones están desactivadas. Abre la configuración del sistema para habilitarlas.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Abrir Configuración', onPress: () => Linking.openSettings() },
                ]
            );
            return;
        }

        // Request permission
        const granted = await requestNotificationPermissions();
        if (granted) {
            setNotificationStatus('granted');
            Alert.alert('✅ ¡Listo!', 'Ahora recibirás recordatorios de tus pedidos.');
        } else {
            setNotificationStatus('denied');
            Alert.alert('❌ Permiso Denegado', 'No podrás recibir recordatorios sin activar las notificaciones.');
        }
    };

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

    const { isPremium, premiumUntil } = useSubscription();

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Premium Section */}
            <TouchableOpacity
                style={[styles.premiumBanner, { backgroundColor: isPremium ? colors.success : colors.primary }, Shadows.md]}
                onPress={() => router.push('/premium')}
            >
                <FontAwesome name="star" size={24} color="#FFF" />
                <View style={styles.premiumBannerText}>
                    <Text style={styles.premiumTitle}>
                        {isPremium ? 'Miga Premium Activo ✨' : 'Actualiza a Miga Premium'}
                    </Text>
                    <Text style={styles.premiumSubtitle}>
                        {isPremium && premiumUntil
                            ? `Válido hasta ${premiumUntil.toLocaleDateString('es-ES')}`
                            : 'Desbloquea todas las funciones'}
                    </Text>
                </View>
                <FontAwesome name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

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

            {/* Notifications Section */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    NOTIFICACIONES
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                    <SettingRow
                        icon="bell"
                        label="Permisos de Notificación"
                        value={notificationStatus === 'granted' ? '✅ Activadas' : notificationStatus === 'denied' ? '❌ Denegadas' : '⚠️ Sin configurar'}
                        onPress={handleNotificationPermission}
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
                        icon="book"
                        label="Recetas"
                        value="Gestiona tus recetas"
                        onPress={() => router.push('/recipes')}
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
                        value="soporte@miga.app"
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
    premiumBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.lg,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        gap: Spacing.md,
    },
    premiumBannerText: {
        flex: 1,
    },
    premiumTitle: {
        color: '#FFF',
        ...Typography.bodyBold,
        fontSize: 16,
    },
    premiumSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        ...Typography.small,
    },
});
