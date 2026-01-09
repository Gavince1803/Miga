import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

import { useInventory } from '@/hooks/useInventory';
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types';

// Helper to check if date is today
const isToday = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const formatTime12hr = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

function StatCard({
  icon,
  label,
  value,
  color,
  colors
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface }, Shadows.sm]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <FontAwesome name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function UpcomingOrderCard({
  order,
  colors
}: {
  order: Order;
  colors: typeof Colors.light;
}) {
  const isUrgent = isToday(order.deliveryDate);
  const urgencyColor = isUrgent ? colors.urgentToday : colors.urgentFuture;
  const dateObj = new Date(order.deliveryDate);
  const formattedDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <Link href={`/orders/${order.id}`} asChild>
      <TouchableOpacity
        style={[
          styles.orderCard,
          { backgroundColor: colors.surface, borderLeftColor: urgencyColor },
          Shadows.sm
        ]}
      >
        <View style={styles.orderCardHeader}>
          <Text style={[styles.orderClientName, { color: colors.text }]}>
            {order.clientName}
          </Text>
          <View style={[styles.orderDateBadge, { backgroundColor: urgencyColor + '20' }]}>
            <Text style={[styles.orderDateText, { color: urgencyColor }]}>
              {formattedDate}
            </Text>
          </View>
        </View>
        <Text style={[styles.orderDescription, { color: colors.textSecondary }]}>
          {order.description}
        </Text>
        <Text style={[styles.orderTime, { color: colors.textMuted }]}>
          <FontAwesome name="clock-o" size={12} /> {formatTime12hr(order.deliveryTime)}
        </Text>
      </TouchableOpacity>
    </Link>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { orders, onRefresh } = useOrders();
  const { inventory, onRefresh: onRefreshInventory } = useInventory();

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      onRefresh();
      onRefreshInventory();
    }, [])
  );

  // Calculate stats
  const todayOrdersCount = orders.filter(o => isToday(o.deliveryDate)).length;
  // Simplified week calculation (last 7 days + next 7 days or just volume)
  // For now: active orders (pending/process)
  const activeOrdersCount = orders.filter(o => o.status === 'pendiente' || o.status === 'en_proceso').length;

  const pendingPaymentsCount = orders.filter(o => o.paymentMethod === 'pendiente').length;
  const lowStockCount = inventory.filter(i => i.minStock && i.quantity < i.minStock).length;

  // Recent/Upcoming - Sort by date and take first 3
  // Assuming useOrders returns sorted, but let's filter relevant ones (today onwards)
  const upcomingOrders = orders
    .filter(o => new Date(o.deliveryDate) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .slice(0, 3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          ¡Bienvenida! 🧁
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>
          Tu día de hoy
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="birthday-cake"
          label="Para Hoy"
          value={todayOrdersCount}
          color={colors.urgentToday}
          colors={colors}
        />
        <StatCard
          icon="calendar-check-o"
          label="Activos"
          value={activeOrdersCount}
          color={colors.primary}
          colors={colors}
        />
        <StatCard
          icon="money"
          label="Por cobrar"
          value={pendingPaymentsCount}
          color={colors.warning}
          colors={colors}
        />
        <StatCard
          icon="exclamation-triangle"
          label="Stock bajo"
          value={lowStockCount}
          color={colors.error}
          colors={colors}
        />
      </View>

      {/* Quick Action Button - SIngle Line Design */}
      <Link href="/orders/new" asChild>
        <TouchableOpacity
          style={[styles.newOrderButton, Shadows.lg]}
          activeOpacity={0.85}
        >
          <View style={styles.newOrderContent}>
            <View style={styles.iconCircle}>
              <FontAwesome name="plus" size={18} color={colors.primary} />
            </View>
            <Text style={styles.newOrderButtonText}>Nuevo Pedido</Text>
          </View>
        </TouchableOpacity>
      </Link>

      {/* Upcoming Orders Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Próximos Pedidos
          </Text>
          <Link href="/orders" asChild>
            <TouchableOpacity>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>
                Ver todos
              </Text>
            </TouchableOpacity>
          </Link>
        </View>

        {upcomingOrders.map((order) => (
          <UpcomingOrderCard key={order.id} order={order} colors={colors} />
        ))}
      </View>

      {/* Bottom padding for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  greeting: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.title,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: (width - Spacing.md * 2 - Spacing.sm) / 2,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    ...Typography.subtitle,
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.small,
    marginTop: 2,
  },
  newOrderButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xxl, // Increased margin for separation
    backgroundColor: '#D4A574',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  newOrderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.subtitle,
  },
  sectionLink: {
    ...Typography.body,
    fontWeight: '500',
  },
  orderCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  orderClientName: {
    ...Typography.bodyBold,
    flex: 1,
  },
  orderDateBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  orderDateText: {
    ...Typography.small,
    fontWeight: '600',
  },
  orderDescription: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  orderTime: {
    ...Typography.small,
  },
});
