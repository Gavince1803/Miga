import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useInventory } from '@/hooks/useInventory';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { isToday } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

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
  value: number | string;
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

// Helper to determine urgency color
const getUrgencyColor = (dateStr: string, colors: any) => {
  const today = new Date();
  const deliveryDate = new Date(dateStr);
  today.setHours(0, 0, 0, 0);
  deliveryDate.setHours(0, 0, 0, 0);

  const diffTime = deliveryDate.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return colors.textMuted; // Past
  if (daysUntil === 0) return colors.urgentToday;
  if (daysUntil <= 2) return colors.urgentSoon;
  if (daysUntil <= 7) return colors.urgentWeek;
  return colors.urgentFuture;
};

function UpcomingOrderCard({
  order,
  colors
}: {
  order: Order;
  colors: typeof Colors.light;
}) {
  const urgencyColor = getUrgencyColor(order.deliveryDate, colors);
  const dateObj = new Date(order.deliveryDate);
  const formattedDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <Link href={`/orders/${order.id}`} asChild>
      <TouchableOpacity
        style={{
          backgroundColor: colors.surface,
          borderLeftWidth: 4,
          borderLeftColor: urgencyColor,
          marginBottom: 24, // Guaranteed separation
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border || '#E8DDD4',
          ...Shadows.md
        }}
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
  const todayOrdersCount = orders.filter(o => isToday(new Date(o.deliveryDate))).length;
  // Simplified week calculation (last 7 days + next 7 days or just volume)
  // For now: active orders (pending/process)
  const activeOrdersCount = orders.filter(o => o.status === 'pendiente' || o.status === 'pagado').length; // 'pagado' orders might still be active in terms of production? Users call, sticking to status. Actually user said 'todo arreglado' regarding new statuses.
  // Actually, 'active' usually means not completed/cancelled. But now we only have Pendiente/Pagado/Cancelado.
  // Assuming 'Pendiente' = Active/Open. 'Pagado' = Completed/Closed? 
  // User said: "Cuando marcas un pedido como Pagado... Se descuenta automáticamente el inventario". 
  // So 'Pagado' likely means done/delivered/closed for financial tracking, but maybe not production?
  // Let's assume 'Pendiente' + 'En Proceso' (removed) -> 'Pendiente'.
  // Use just 'Pendiente' for active? Or maybe all non-cancelled?
  // Let's stick with 'Pendiente' as Active for now.
  const activeCount = orders.filter(o => o.status === 'pendiente').length;

  // Monetary Stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyRevenue = orders
    .filter(o => {
      const d = new Date(o.deliveryDate);
      return o.status !== 'cancelado' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, o) => sum + (o.depositAmount || 0), 0);

  const pendingCollection = orders
    .filter(o => o.status === 'pendiente')
    .reduce((sum, o) => sum + ((o.totalPrice || 0) - (o.depositAmount || 0)), 0);

  // Format currency
  const formatMoney = (amount: number) => `$${amount.toLocaleString('es-ES')}`;

  // Recent/Upcoming - Sort by date and take first 3
  // Show ALL future orders in upcoming list for now if the list is short, or keep top 3 but make it clear
  // To avoid confusion, let's keep top 3 but maybe the label "Ver todos" handles the rest.
  const upcomingOrders = orders
    .filter(o => {
      const isFuture = new Date(o.deliveryDate) >= new Date(new Date().setHours(0, 0, 0, 0));
      const isActive = o.status !== 'cancelado' && o.status !== 'completado';
      const isUnpaid = o.paymentStatus !== 'pagado'; // User request: Paid orders should hide
      return isFuture && isActive && isUnpaid;
    })
    .slice(0, 3);

  // Note: 'activeOrdersCount' includes all pending statuses versus 'upcomingOrders' which limits to 3.
  // This is expected behavior. The user might want to see count of UPCOMING specifically vs ACTIVE work.
  // We'll keep logic but fixing the UI separation next.

  // Expenses Calculation
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();


      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          quantity,
          movement_type,
          inventory_items (
            cost_per_unit
          )
        `)
        .in('movement_type', ['agregado', 'importacion'])
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (error) {
        console.error('Error fetching expenses:', error);
        return;
      }

      if (data) {

        const expenses = data.reduce((sum, move: any) => {
          const itemData = move.inventory_items || move.item;
          const cost = itemData?.cost_per_unit || 0;
          return sum + (move.quantity * cost);
        }, 0);

        setMonthlyExpenses(expenses);
      }
    } catch (err) {
      console.error(err);
    }
  }, [currentMonth, currentYear]);

  // Initial fetch
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      onRefresh();
      onRefreshInventory();
      fetchExpenses();
    }, [fetchExpenses, onRefresh, onRefreshInventory])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      onRefresh(),
      onRefreshInventory(),
      fetchExpenses()
    ]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
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
          icon="money"
          label="Por cobrar"
          value={formatMoney(pendingCollection)}
          color={colors.warning}
          colors={colors}
        />
        <StatCard
          icon="line-chart"
          label="Ingresos"
          value={formatMoney(monthlyRevenue)}
          color={colors.success}
          colors={colors}
        />
        <StatCard
          icon="shopping-cart"
          label="Gastos"
          value={formatMoney(monthlyExpenses)}
          color={colors.error} // Red for expenses
          colors={colors}
        />
      </View>

      {/* Quick Action Button - STRIKING GRADIENT DESIGN */}
      <Link href="/orders/new" asChild>
        <TouchableOpacity style={{ marginBottom: 40 }} activeOpacity={0.8}>
          <LinearGradient
            // Gradient adjusted to match Bakery Aesthetic: Gold to Burnt Orange/Sienna
            colors={['#D4A574', '#D35400']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.newOrderButton}
          >
            <View style={styles.newOrderContent}>
              <View style={styles.iconContainer}>
                <FontAwesome name="plus" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={styles.newOrderTitle}>Nuevo Pedido</Text>
                <Text style={styles.newOrderSubtitle}>Registrar una nueva orden</Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={16} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
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
    marginBottom: Spacing.md, // Reduced from lg to bring button closer
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
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newOrderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)', // Glassy effect
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  newOrderSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
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
    padding: 16, // Explicit 16px padding
    borderRadius: 12, // Explicit 12px radius
    marginBottom: 24, // Explicit 24px margin
    borderLeftWidth: 4,
    borderWidth: 1, // Visual separation
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
