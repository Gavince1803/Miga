import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

// Auth
import { AlertProvider } from '@/context/AlertContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { requestNotificationPermissions } from '@/lib/notifications';
import { Stack, useRouter, useSegments } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom theme based on our bakery colors
const BakeryLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const BakeryDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

import { SettingsProvider } from '@/context/SettingsContext';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AlertProvider>
        <SettingsProvider>
          <RootLayoutNav />
        </SettingsProvider>
      </AlertProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Handle deep links for password recovery (both cold start and foreground/background)
  useEffect(() => {
    function parseUrlTokens(url: string): Record<string, string> {
      const result: Record<string, string> = {};
      const hashIndex = url.indexOf('#');
      const queryIndex = url.indexOf('?');
      if (queryIndex !== -1) {
        const end = hashIndex > queryIndex ? hashIndex : undefined;
        new URLSearchParams(url.slice(queryIndex + 1, end)).forEach((v, k) => { result[k] = v; });
      }
      if (hashIndex !== -1) {
        new URLSearchParams(url.slice(hashIndex + 1)).forEach((v, k) => { if (!result[k]) result[k] = v; });
      }
      return result;
    }

    const handleDeepLink = (url: string | null) => {
      if (!url) return;
      const tokens = parseUrlTokens(url);
      if (tokens.access_token || tokens.code) {
        const qs = new URLSearchParams(tokens).toString();
        router.replace((`/auth/reset-password?${qs}`) as any);
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = (segments[0] as string) === 'auth';
    // Don't redirect away from reset-password — it manages its own session setup
    const isResetPassword = (segments as string[])[1] === 'reset-password';

    if (!session && !inAuthGroup) {
      // Redirect to the sign-in page.
      router.replace('/auth/login' as any);
    } else if (session && inAuthGroup && !isResetPassword) {
      // Redirect away from the sign-in page.
      router.replace('/(tabs)');
    }

    // Request notification permissions if logged in
    if (session) {
      requestNotificationPermissions();
    }
  }, [session, loading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? BakeryDarkTheme : BakeryLightTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackTitle: '' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="inventory" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="recipes" options={{ headerShown: false }} />
        <Stack.Screen name="premium" options={{ title: 'Miga Premium', presentation: 'modal' }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

