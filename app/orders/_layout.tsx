import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function OrdersLayout() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTintColor: colors.primary,
                headerTitleStyle: {
                    color: colors.text,
                    fontWeight: '600',
                },
                headerShadowVisible: false,
                headerBackTitle: 'Atrás',
            }}
        >
            <Stack.Screen
                name="new"
                options={{
                    title: 'Nuevo Pedido',
                    presentation: 'modal',
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Detalle del Pedido',
                }}
            />
        </Stack>
    );
}
