import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';

import { ExchangeRateTicker } from '@/components/ExchangeRateTicker';

// Custom tab bar icon with consistent sizing
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  focused?: boolean;
}) {
  return (
    <View style={props.focused ? styles.activeIconContainer : undefined}>
      <FontAwesome size={24} {...props} />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
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
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: false,
        headerRight: () => <ExchangeRateTicker />,
      }}>

      {/* Inicio - Dashboard/Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerTitle: 'Miga',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} />
          ),
        }}
      />

      {/* Pedidos - Orders List */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          headerTitle: 'Mis Pedidos',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="list-alt" color={color} focused={focused} />
          ),
        }}
      />

      {/* Calendario - Calendar View */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendario',
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
          headerTitle: 'Mi Inventario',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="cubes" color={color} focused={focused} />
          ),
        }}
      />

      {/* Recetario - Recipes */}
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recetario',
          headerTitle: 'Mis Recetas',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="book" color={color} focused={focused} />
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 15 }}>
              <ExchangeRateTicker />
              <View style={{ width: 1, height: 20, backgroundColor: Colors.light.border }} />
              <Link href="/recipes/scan" asChild>
                <TouchableOpacity style={{ padding: 8 }}>
                  <FontAwesome name="camera" size={20} color={Colors.light.primary} />
                </TouchableOpacity>
              </Link>
              <Link href="/recipes/new" asChild>
                <TouchableOpacity style={{ padding: 8 }}>
                  <FontAwesome name="plus" size={20} color={Colors.light.primary} />
                </TouchableOpacity>
              </Link>
            </View>
          ),
        }}
      />

      {/* Ajustes - Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          headerTitle: 'Configuración',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="cog" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    padding: 4,
  },
});
