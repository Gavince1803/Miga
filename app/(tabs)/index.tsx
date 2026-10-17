import ReEngagementBanner from '@/components/ReEngagementBanner';
import Skeleton from '@/components/Skeleton';
import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { CURRENCIES, useSettings } from '@/context/SettingsContext';
import { useInventory } from '@/hooks/useInventory';
import { useOrders } from '@/hooks/useOrders';
import { parseLocalDate, relativeDayLabel } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { isToday } from 'date-fns';
import { Link, router } from 'expo-router';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const formatTime12hr = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Today at a glance: one calm card instead of four multicolor stat tiles
function HeroCard({
  todayOrders,
  stats,
  colors,
  loading,
  onPress,
  formatMoney,
}: {
  todayOrders: Order[];
  formatMoney: (amount: number) => string;
  stats: { label: string; value: string; loading: boolean }[];
  colors: typeof Colors.light;
  loading: boolean;
  onPress: () => void;
}) {
  const dateText = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayLabel = dateText.charAt(0).toUpperCase() + dateText.slice(1);
  const todayCount = todayOrders.length;
  const shownToday = [...todayOrders].sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime)).slice(0, 3);

  return (
    <TouchableOpacity
      style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.md]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.heroTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroDate, { color: colors.primaryText }]}>{todayLabel}</Text>
          {loading
            ? <Skeleton width={120} height={40} color={colors.border} style={styles.heroValuePlaceholder} />
            : <Text style={[styles.heroCount, { color: colors.text }]}>{todayCount}</Text>}
          <Text style={[styles.heroCountLabel, { color: colors.textSecondary }]}>
            {todayCount === 1 ? 'pedido para entregar hoy' : 'pedidos para entregar hoy'}
          </Text>
        </View>
        <View style={[styles.heroIcon, { backgroundColor: colors.primary + '20' }]}>
          <MaterialCommunityIcons name="cake-variant-outline" size={24} color={colors.primaryText} />
        </View>
      </View>

      {/* Which orders, not just how many: time, client and what's still owed */}
      {!loading && shownToday.map((order) => {
        const balance = order.totalPrice - (order.depositAmount || 0);
        const isPaid = order.status === 'pagado' || order.paymentStatus === 'pagado' || balance <= 0;
        return (
          <TouchableOpacity
            key={order.id}
            style={[styles.heroOrderRow, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => router.push(`/orders/${order.id}` as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.heroOrderTime, { color: colors.primaryText }]}>{formatTime12hr(order.deliveryTime)}</Text>
            <Text style={[styles.heroOrderName, { color: colors.text }]} numberOfLines={1}>{order.clientName}</Text>
            <Text style={[styles.heroOrderBalance, { color: colors.statusText[isPaid ? 'pagado' : 'pendiente'] }]}>
              {isPaid ? 'Pagado' : `Debe ${formatMoney(balance)}`}
            </Text>
          </TouchableOpacity>
        );
      })}
      {!loading && todayCount > shownToday.length && (
        <Text style={[styles.heroMore, { color: colors.primaryText }]}>
          +{todayCount - shownToday.length} más en la agenda
        </Text>
      )}

      <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />

      <View style={styles.heroStats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.heroStat}>
            <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>{stat.label}</Text>
            {/* Placeholder instead of $0.00 while data loads, so it doesn't read as real data */}
            {stat.loading
              ? <Skeleton width={56} height={18} color={colors.border} style={styles.heroValuePlaceholder} />
              : <Text style={[styles.heroStatValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>}
          </View>
        ))}
      </View>
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
  const formattedDate = relativeDayLabel(order.deliveryDate);
  const balance = order.totalPrice - (order.depositAmount || 0);

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
            {/* Yellow/green urgency colors are unreadable as text: keep them for the tint only */}
            <Text style={[styles.orderDateText, { color: urgencyColor === colors.urgentToday ? urgencyColor : colors.text }]}>
              {formattedDate}
            </Text>
          </View>
        </View>
        <Text style={[styles.orderDescription, { color: colors.textSecondary }]}>
          {order.description}
        </Text>
        <View style={styles.orderFooter}>
          <Text style={[styles.orderTime, { color: colors.textMuted }]}>
            <Ionicons name="time-outline" size={12} /> {formatTime12hr(order.deliveryTime)}
          </Text>
          {balance > 0 && (
            <Text style={[styles.orderBalance, { color: colors.statusText.pendiente }]}>
              Debe ${balance.toFixed(2)}
            </Text>
          )}
        </View>
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
  const todayOrders = orders.filter(o => o.status !== 'cancelado' && isToday(parseLocalDate(o.deliveryDate)));
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

  const formatProfit = (amount: number) => (amount < 0 ? '-' : '') + formatMoney(Math.abs(amount));

  // Recent/Upcoming - Sort by date and take first 3
  // Show ALL future orders in upcoming list for now if the list is short, or keep top 3 but make it clear
  // To avoid confusion, let's keep top 3 but maybe the label "Ver todos" handles the rest.
  const upcomingOrders = orders
    .filter(o => {
      // From tomorrow on: today's orders are already listed in the hero card
      const isFuture = parseLocalDate(o.deliveryDate) >= new Date(new Date().setHours(24, 0, 0, 0));
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
          {userName ? `¡Hola, ${userName}! 🧁` : '¡Hola! 🧁'}
        </Text>
      </View>

      <HeroCard
        todayOrders={todayOrders}
        loading={ordersLoading}
        colors={colors}
        formatMoney={formatMoney}
        onPress={() => router.push('/agenda' as any)}
        stats={[
          { label: 'Por cobrar', value: formatMoney(pendingCollection), loading: ordersLoading },
          { label: 'Ingresos del mes', value: formatMoney(monthlyRevenue), loading: ordersLoading },
          // Profit, not expenses: "how much do I actually make" is the question
          { label: 'Ganancia del mes', value: formatProfit(monthlyRevenue - monthlyExpenses), loading: ordersLoading || expensesLoading },
        ]}
      />

      {/* Quick Action Button */}
      <Link href="/orders/new" asChild>
        <TouchableOpacity style={{ marginBottom: Spacing.md }} activeOpacity={0.8}>
          {/* Styles on an inner View: Link asChild drops array styles on its child */}
          <View style={[styles.newOrderButton, { backgroundColor: colors.primaryStrong }, Shadows.sm]}>
            <View style={styles.newOrderContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="add" size={28} color="#FFF" />
              </View>
              <View>
                <Text style={styles.newOrderTitle}>Nuevo Pedido</Text>
                <Text style={styles.newOrderSubtitle}>Registrar una nueva orden</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </View>
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
            <Ionicons name="calculator-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.quoteTitle, { color: colors.text }]}>Cotizar un pastel</Text>
            <Text style={[styles.quoteSubtitle, { color: colors.textSecondary }]}>Calcula tu precio y envíalo por WhatsApp</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
              <Text style={[styles.sectionLink, { color: colors.primaryText }]}>
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
            <Ionicons name="calendar-clear-outline" size={32} color={colors.textMuted} />
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
    marginBottom: Spacing.md,
  },
  greeting: {
    ...Typography.body,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroDate: {
    ...Typography.caption,
    fontWeight: '600',
  },
  heroCount: {
    ...Typography.title,
    fontSize: 44,
    lineHeight: 52,
    marginTop: Spacing.xs,
  },
  heroCountLabel: {
    ...Typography.body,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  heroOrderTime: {
    ...Typography.small,
    fontWeight: '600',
    minWidth: 64,
  },
  heroOrderName: {
    ...Typography.bodyBold,
    flex: 1,
  },
  heroOrderBalance: {
    ...Typography.small,
    fontWeight: '600',
  },
  heroMore: {
    ...Typography.small,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  heroDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  heroStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroStat: {
    flex: 1,
  },
  heroStatLabel: {
    ...Typography.small,
    marginBottom: 2,
  },
  heroStatValue: {
    ...Typography.subtitle,
    fontSize: 17,
  },
  heroValuePlaceholder: {
    marginVertical: 4,
  },
  newOrderButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
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
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderBalance: {
    ...Typography.small,
    fontWeight: '600',
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
