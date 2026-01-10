import BackButton from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Stack } from 'expo-router';


export default function RecipesLayout() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTintColor: colors.tint,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    title: 'Recetario',
                    headerLeft: () => <BackButton />,
                }}
            />
            <Stack.Screen
                name="new"
                options={{
                    title: 'Nueva Receta',
                }}
            />
        </Stack>
    );
}
