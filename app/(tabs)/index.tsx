import ReEngagementBanner from '@/components/ReEngagementBanner';
import Skeleton from '@/components/Skeleton';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { useInventory } from '@/hooks/useInventory';
import { useOrders } from '@/hooks/useOrders';
import { parseLocalDate } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { isToday } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
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
  colors,
  onPress,
  loading = false,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
  colors: typeof Colors.light;
  onPress?: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: colors.surface }, Shadows.sm]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <FontAwesome name={icon as any} size={20} color={color} />
      </View>
      {/* Placeholder instead of 0 / $0.00 while data loads, so it doesn't read as real data */}
      {loading
        ? <Skeleton width={64} height={24} color={colors.border} style={styles.statValuePlaceholder} />
        : <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>}
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      {onPress && (
        <FontAwesome name="chevron-right" size={9} color={color} style={{ marginTop: 3 }} />
      )}
    </TouchableOpacity>
  );
}

// Helper to determine urgency color
const getUrgencyColor = (dateStr: string, colors: any) => {
  const today = new Date();
  const deliveryDate = parseLocalDate(dateStr);
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
  const dateObj = parseLocalDate(order.deliveryDate);

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
  const { user } = useAuth();
  const { orders, loading: ordersLoading, onRefresh } = useOrders();
  const { inventory, onRefresh: onRefreshInventory } = useInventory();
  const { currency } = useSettings();
  const currencySymbol = CURRENCIES[currency]?.symbol || '$';

  // Get first name or business name
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || '';

  // Calculate stats
  const todayOrdersCount = orders.filter(o => isToday(parseLocalDate(o.deliveryDate))).length;
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
      const d = parseLocalDate(o.deliveryDate);
      return o.status !== 'cancelado' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, o) => sum + (o.depositAmount || 0), 0);

  const pendingCollection = orders
    .filter(o => o.status === 'pendiente')
    .reduce((sum, o) => sum + ((o.totalPrice || 0) - (o.depositAmount || 0)), 0);

  // Format currency
  const formatMoney = (amount: number) => {
    // Para Bolívares usamos coma decimal y punto de miles (típico en VE y LA)
    if (currency === 'VES') {
      return `${currencySymbol}${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // Para el resto (como Dólares), típicamente es punto decimal y coma de miles
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Recent/Upcoming - Sort by date and take first 3
  // Show ALL future orders in upcoming list for now if the list is short, or keep top 3 but make it clear
  // To avoid confusion, let's keep top 3 but maybe the label "Ver todos" handles the rest.
  const upcomingOrders = orders
    .filter(o => {
      const isFuture = parseLocalDate(o.deliveryDate) >= new Date(new Date().setHours(0, 0, 0, 0));
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
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();


      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          quantity,
          unit_cost,
          total_cost,
          inventory_items (
            cost_per_unit
          )
        `)
        // Same rule as Finances (useFinances): only purchases, at their
        // historical cost. Home also counted Excel imports and used today's price,
        // so the two screens showed different expenses for the same month.
        .eq('movement_type', 'agregado')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (error) {
        console.error('Error fetching expenses:', error);
        return;
      }

      if (data) {

        const expenses = data.reduce((sum, move: any) => {
          if (move.total_cost > 0) return sum + move.total_cost;
          const cost = move.unit_cost || move.inventory_items?.cost_per_unit || 0;
          return sum + (move.quantity || 0) * cost;
        }, 0);

        setMonthlyExpenses(expenses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExpensesLoading(false);
    }
  }, [currentMonth, currentYear]);

  // Initial fetch
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Refresh data when screen comes into focus
  useRefreshOnFocus(() => {
    onRefresh();
    onRefreshInventory();
    fetchExpenses();
  });

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
          {userName ? `¡Bienvenida, ${userName}! 🧁` : '¡Bienvenida! 🧁'}
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
          loading={ordersLoading}
          value={todayOrdersCount}
          color={colors.urgentToday}
          colors={colors}
          onPress={() => router.push('/agenda' as any)}
        />
        <StatCard
          icon="money"
          label="Por cobrar"
          loading={ordersLoading}
          value={formatMoney(pendingCollection)}
          color={colors.warning}
          colors={colors}
        />
        <StatCard
          icon="line-chart"
          label="Ingresos"
          loading={ordersLoading}
          value={formatMoney(monthlyRevenue)}
          color={colors.success}
          colors={colors}
        />
        <StatCard
          icon="shopping-cart"
          label="Gastos"
          loading={expensesLoading}
          value={formatMoney(monthlyExpenses)}
          color={colors.error} // Red for expenses
          colors={colors}
        />
      </View>

      {/* Quick Action Button - STRIKING GRADIENT DESIGN */}
      <Link href="/orders/new" asChild>
        <TouchableOpacity style={{ marginBottom: Spacing.md }} activeOpacity={0.8}>
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

      {/* Quote entry: the calculator used to be reachable only from the
          onboarding or an unlabeled icon inside a recipe */}
      <TouchableOpacity
        style={[styles.quoteButton, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
        activeOpacity={0.8}
        onPress={() => router.push('/calculator' as any)}
      >
        <View style={styles.newOrderContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <FontAwesome name="calculator" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.quoteTitle, { color: colors.text }]}>Cotizar un pastel</Text>
            <Text style={[styles.quoteSubtitle, { color: colors.textSecondary }]}>Calcula tu precio y envíalo por WhatsApp</Text>
          </View>
        </View>
        <FontAwesome name="chevron-right" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Re-engagement Banner */}
      <ReEngagementBanner ordersCount={orders.length} inventoryCount={inventory.length} />

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

        {ordersLoading ? (
          [0, 1].map(i => (
            <View key={i} style={[styles.upcomingPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: colors.border }]}>
              <View style={styles.orderCardHeader}>
                <Skeleton width="45%" height={16} color={colors.border} />
                <Skeleton width={56} height={20} color={colors.border} />
              </View>
              <Skeleton width="75%" height={14} color={colors.border} style={{ marginVertical: Spacing.xs }} />
              <Skeleton width={70} height={12} color={colors.border} />
            </View>
          ))
        ) : upcomingOrders.length === 0 ? (
          <View style={[styles.emptyUpcoming, { backgroundColor: colors.surface }]}>
            <FontAwesome name="calendar-check-o" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyUpcomingTitle, { color: colors.text }]}>Todo al día</Text>
            <Text style={[styles.emptyUpcomingText, { color: colors.textSecondary }]}>
              No tienes pedidos próximos pendientes
            </Text>
          </View>
        ) : (
          upcomingOrders.map((order) => (
            <UpcomingOrderCard key={order.id} order={order} colors={colors} />
          ))
        )}
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
  statValuePlaceholder: {
    marginVertical: 4,
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
  quoteButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quoteTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  quoteSubtitle: {
    fontSize: 13,
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
  upcomingPlaceholder: {
    // Same shape as UpcomingOrderCard so the real cards don't jump in
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 24,
  },
  emptyUpcoming: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyUpcomingTitle: {
    ...Typography.bodyBold,
    marginTop: Spacing.xs,
  },
  emptyUpcomingText: {
    ...Typography.body,
    textAlign: 'center',
  },
});
