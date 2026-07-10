import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types';
import { Link, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - Spacing.md * 2) / 7;

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

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    return days;
}

function formatDateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { orders, onRefresh } = useOrders();

    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const selectedSectionY = useRef<number>(0);

    // Group orders by date
    const ordersByDate = orders.reduce((acc, order) => {
        const dateKey = order.deliveryDate; // Assuming YYYY-MM-DD
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(order);
        return acc;
    }, {} as Record<string, Order[]>);

    const calendarDays = getCalendarDays(currentYear, currentMonth);

    // Refresh data on focus (optional but good)
    useFocusEffect(
        useCallback(() => {
            onRefresh();
        }, [])
    );

    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDayPress = (dateKey: string) => {
        setSelectedDate(dateKey);
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: selectedSectionY.current, animated: true });
        }, 50);
    };



    const isToday = (day: number) => {
        return day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();
    };

    return (
        <ScrollView
            ref={scrollViewRef}
            style={[styles.container, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Month Navigation */}
            <View style={[styles.monthNav, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.monthTitle, { color: colors.text }]}>
                    {MONTHS_ES[currentMonth]} {currentYear}
                </Text>
                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                    <FontAwesome name="chevron-right" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={styles.weekdayRow}>
                {DAYS_ES.map((day, index) => (
                    <View key={index} style={styles.weekdayCell}>
                        <Text style={[
                            styles.weekdayText,
                            { color: index === 0 ? colors.error : colors.textSecondary }
                        ]}>
                            {day}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return <View key={`empty-${index}`} style={styles.dayCell} />;
                    }

                    const dateKey = formatDateKey(currentYear, currentMonth, day);
                    const dayOrders = ordersByDate[dateKey] || [];
                    const hasOrders = dayOrders.length > 0;
                    const isSelected = selectedDate === dateKey;

                    const urgencyColor = hasOrders ? getUrgencyColor(dateKey, colors) : 'transparent';

                    return (
                        <TouchableOpacity
                            key={dateKey}
                            style={[
                                styles.dayCell,
                                isToday(day) && [styles.todayCell, { borderColor: colors.primary }],
                                hasOrders && { backgroundColor: urgencyColor, borderRadius: 8 }, // Highlight cell
                                isSelected && [styles.selectedCell, { borderWidth: 2, borderColor: colors.text }],
                            ]}
                            onPress={() => handleDayPress(dateKey)}
                        >
                            <Text style={[
                                styles.dayText,
                                {
                                    color: hasOrders ? '#FFFFFF' : (isToday(day) ? colors.primary : colors.text),
                                    fontWeight: hasOrders || isToday(day) ? '700' : '400'
                                },
                            ]}>
                                {day}
                            </Text>

                            {/* Dots removed as requested, using cell background instead */}
                            {false && hasOrders && (
                                <View style={styles.dotsContainer}>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Legend */}
            <View style={[styles.legend, { backgroundColor: colors.surface }]}>
                <Text style={[styles.legendTitle, { color: colors.text }]}>Urgencia</Text>
                <View style={styles.legendItems}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.urgentToday }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>Hoy</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.urgentSoon }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>2-3 días</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.urgentWeek }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>Esta semana</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.urgentFuture }]} />
                        <Text style={[styles.legendText, { color: colors.textSecondary }]}>Futuro</Text>
                    </View>
                </View>
            </View>

            {/* Selected Date Orders */}
            {selectedDate && (
                <View
                    onLayout={(e) => { selectedSectionY.current = e.nativeEvent.layout.y; }}
                    style={[styles.selectedDateSection, { backgroundColor: colors.surface }]}
                >
                    {/* Header with close button */}
                    <View style={styles.selectedDateHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.selectedDateTitle, { color: colors.text }]}>
                                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                }).replace(/^\w/, (c) => c.toUpperCase())}
                            </Text>
                            <Text style={[styles.selectedDateCount, { color: colors.textSecondary }]}>
                                {ordersByDate[selectedDate]?.length || 0} pedido(s)
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setSelectedDate(null)}
                            style={[styles.closeButton, { backgroundColor: colors.surfaceSecondary }]}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <FontAwesome name="times" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Orders List */}
                    {ordersByDate[selectedDate]?.length > 0 ? (
                        <View style={styles.ordersList}>
                            {ordersByDate[selectedDate].map(order => (
                                <Link key={order.id} href={`/orders/${order.id}`} asChild>
                                    <TouchableOpacity style={[styles.miniOrderCard, { backgroundColor: colors.background }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.miniOrderClient, { color: colors.text }]}>{order.clientName}</Text>
                                            <Text style={[styles.miniOrderDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                                                {order.description || 'Sin descripción'}
                                            </Text>
                                        </View>
                                        <Text style={[styles.miniOrderPrice, { color: colors.success }]}>${order.totalPrice}</Text>
                                    </TouchableOpacity>
                                </Link>
                            ))}
                        </View>
                    ) : (
                        <Text style={[styles.noOrdersText, { color: colors.textMuted }]}>
                            No hay pedidos para este día
                        </Text>
                    )}

                    {/* Add Order Button */}
                    <Link href="/orders/new" asChild>
                        <TouchableOpacity style={[styles.addOrderButton, { backgroundColor: colors.primary }]}>
                            <FontAwesome name="plus" size={14} color="#FFF" />
                            <Text style={styles.addOrderButtonText}>Agregar a este día</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            )}

            <View style={{ height: 120 }} />
        </ScrollView>
    );
}

// Simple styles for mini cards
const styles = StyleSheet.create({
    miniOrderCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xs,
    },
    miniOrderClient: {
        fontWeight: '600',
        fontSize: 14,
    },
    miniOrderDesc: {
        fontSize: 12,
    },
    miniOrderPrice: {
        fontWeight: '700',
    },
    selectedDateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    noOrdersText: {
        textAlign: 'center',
        marginVertical: Spacing.md,
        fontStyle: 'italic',
    },
    container: {
        flex: 1,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    navButton: {
        padding: Spacing.sm,
    },
    monthTitle: {
        ...Typography.subtitle,
        fontWeight: '700',
    },
    weekdayRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    weekdayCell: {
        width: DAY_WIDTH,
        alignItems: 'center',
    },
    weekdayText: {
        ...Typography.caption,
        fontWeight: '600',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: Spacing.md,
    },
    dayCell: {
        width: DAY_WIDTH,
        height: DAY_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    todayCell: {
        borderWidth: 2,
        borderRadius: BorderRadius.md,
    },
    selectedCell: {
        borderRadius: BorderRadius.md,
    },
    dayText: {
        ...Typography.body,
    },
    todayText: {
        fontWeight: '700',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginTop: 2,
        gap: 2,
        alignItems: 'center',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    moreText: {
        fontSize: 10,
        fontWeight: '600',
    },
    legend: {
        marginHorizontal: Spacing.md,
        marginTop: Spacing.lg,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    legendTitle: {
        ...Typography.caption,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    legendItems: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        ...Typography.small,
    },
    selectedDateSection: {
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    selectedDateTitle: {
        ...Typography.bodyBold,
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    selectedDateCount: {
        ...Typography.body,
        marginBottom: Spacing.md,
    },
    viewOrdersButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md,
    },
    viewOrdersButtonText: {
        color: '#FFFFFF',
        ...Typography.bodyBold,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ordersList: {
        width: '100%',
    },
    addOrderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
        gap: Spacing.sm,
    },
    addOrderButtonText: {
        color: '#FFFFFF',
        ...Typography.bodyBold,
    },
});
