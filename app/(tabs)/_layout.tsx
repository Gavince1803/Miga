import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Link, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Fonts } from '@/constants/Colors';

import { ExchangeRateTicker } from '@/components/ExchangeRateTicker';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Custom tab bar icon with consistent sizing: filled when focused, outline otherwise (iOS convention)
function TabBarIcon(props: {
  name: IoniconName;
  color: string;
  focused?: boolean;
}) {
  return (
    <View style={[
      styles.iconContainer,
      props.focused && styles.activeIconContainer,
      { backgroundColor: props.focused ? props.color + '15' : 'transparent' } // Subtle background tint
    ]}>
      <Ionicons size={22} name={(props.focused ? props.name : `${props.name}-outline`) as IoniconName} color={props.color} />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      // Light tap feedback when switching tabs (iOS only; Android tabs have their own ripple)
      screenListeners={{
        tabPress: () => {
          if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        },
      }}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          color: colors.text,
          fontFamily: Fonts.serif,
          fontSize: 20,
        },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
      }}>

      {/* Inicio - Dashboard/Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarAccessibilityLabel: 'Inicio',
          headerTitle: 'Miga',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} />
          ),
          headerRight: () => <ExchangeRateTicker />,
        }}
      />

      {/* Pedidos - Orders List */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          tabBarAccessibilityLabel: 'Pedidos',
          headerTitle: 'Mis Pedidos',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="receipt" color={color} focused={focused} />
          ),
          headerRight: () => (
            <Link href="/clients" asChild>
              <TouchableOpacity style={{ padding: 8, marginRight: 8 }} accessibilityRole="button" accessibilityLabel="Clientes">
                <Ionicons name="people-outline" size={22} color={Colors.light.primary} />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />

      {/* Clientes - Client portfolio (reachable from Pedidos header, not its own tab) */}
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clientes',
          headerTitle: 'Mis Clientes',
          href: null,
        }}
      />

      {/* Calendario - Calendar View */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendario',
          tabBarAccessibilityLabel: 'Calendario',
          headerTitle: 'Calendario',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="calendar" color={color} focused={focused} />
          ),
        }}
      />

      {/* Inventario - Inventory */}
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventario',
          tabBarAccessibilityLabel: 'Inventario',
          headerTitle: 'Mi Inventario',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="cube" color={color} focused={focused} />
          ),
          headerRight: () => (
            <Link href="/recipes" asChild>
              <TouchableOpacity style={{ padding: 8, marginRight: 8 }} accessibilityRole="button" accessibilityLabel="Recetario">
                <Ionicons name="book-outline" size={22} color={Colors.light.primary} />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />

      {/* Recetario - Recipes (reachable from Inventario header, not its own tab) */}
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recetario',
          headerTitle: 'Mis Recetas',
          href: null,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 15 }}>
              <Link href="/recipes/scan" asChild>
                <TouchableOpacity style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Escanear receta con la cámara">
                  <Ionicons name="camera-outline" size={22} color={Colors.light.primary} />
                </TouchableOpacity>
              </Link>
              <Link href="/recipes/new" asChild>
                <TouchableOpacity style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Nueva receta">
                  <Ionicons name="add" size={26} color={Colors.light.primary} />
                </TouchableOpacity>
              </Link>
            </View>
          ),
        }}
      />

      {/* Finances - Financial Dashboard (reachable from Más) */}
      <Tabs.Screen
        name="finances"
        options={{
          title: 'Finanzas',
          headerTitle: 'Resumen Financiero',
          href: null,
        }}
      />

      {/* Analytics - Premium stats (reachable from Más) */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          headerTitle: 'Analytics',
          href: null,
        }}
      />

      {/* Ajustes - Settings (reachable from Más) */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          headerTitle: 'Configuración',
          href: null,
        }}
      />

      {/* Más - Hub for Finanzas / Analytics / Ajustes */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          tabBarAccessibilityLabel: 'Más',
          headerTitle: 'Más',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="ellipsis-horizontal" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44, // Fixed width for stability
    height: 32, // Fixed height
    borderRadius: 16, // Pill shape
  },
  activeIconContainer: {
    // No padding needed, size is fixed in iconContainer
    // Background color is handled inline for dynamic 'color' prop
  },
});
