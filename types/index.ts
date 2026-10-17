/**
 * Miga - TypeScript Types
 */

// User profile with reminder settings
export interface UserProfile {
    id: string;
    businessName: string;
    reminderDaysBefore: number;
    reminderTime: string; // HH:MM format
    createdAt: string;
    updatedAt: string;
}

// Payment status enum based on client request
export type PaymentStatus = 'pendiente' | 'abonado' | 'pagado';

// Payment method
export type PaymentMethod = 'efectivo' | 'pago_movil' | 'zelle' | 'transferencia';

// Order status
export type OrderStatus = 'pendiente' | 'en_proceso' | 'completado' | 'pagado' | 'cancelado';

// Dictionary Option for Fillings, Covers, etc.
export interface DictionaryOption {
    label: string;
    value: string;
}

// Main order type
export interface Order {
    id: string;
    userId: string;
    orderNumber: number;

    // Client info
    clientName: string;
    clientPhone: string;
    address?: string;

    // Dates
    orderDate: string; // ISO date
    deliveryDate: string; // ISO date
    deliveryTime: string; // HH:MM format

    // Product details (cake specifics)
    size?: string; // Medida
    servings?: number; // Cant. de Personas
    filling?: string; // Relleno
    cover?: string; // Cubierta
    occasion?: string; // Motivo
    description?: string; // Descripción
    cakeType?: string; // Tipo de Ponqué
    decorationImageUrl?: string; // Sketch/photo of decoration

    // Payment
    totalPrice: number;
    depositAmount: number; // Abono
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;

    // Notifications
    customReminderDays?: number;

    // Status: kept for older app versions (payment-derived + 'cancelado').
    // Delivery is deliveredAt; payment is paymentStatus/depositAmount.
    status: OrderStatus;
    deliveredAt?: string | null;

    // Notifications
    reminderDays: number; // 0 means no reminder

    // Timestamps
    createdAt: string;
    updatedAt: string;
}

// Form data for creating/editing orders
export interface OrderFormData {
    clientName: string;
    clientPhone: string;
    address?: string;
    orderDate: Date;
    deliveryDate: Date;
    deliveryTime: string;
    size?: string;
    servings?: number;
    filling?: string;
    cover?: string;
    occasion?: string;
    cakeType?: string;
    description?: string;
    totalPrice: number;
    depositAmount: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    reminderDays: number;
}

// Inventory item
export interface InventoryItem {
    id: string;
    userId: string;
    name: string;
    quantity: number;
    unit: string; // kg, g, unidades, ml, L
    minStock: number;
    costPerUnit?: number; // New field for financial calc
    category?: string;
    isArchived?: boolean;
    createdAt: string;
}

// Form data for creating/editing inventory items
export interface InventoryFormData {
    name: string;
    quantity: number;
    unit: string;
    minStock: number;
    costPerUnit?: number;
    category?: string;
}

// Recipe template for automated inventory
export interface Recipe {
    id: string;
    userId: string;
    name: string; // "Torta Chocolate 20 personas"
    description?: string;
    ingredients: RecipeIngredient[];
    createdAt: string;
}

export interface RecipeIngredient {
    id: string;
    recipeId: string;
    inventoryId: string;
    inventoryName?: string; // For display
    quantity: number;
    unit: string;
}

// Inventory movement log
export type MovementType = 'deduccion' | 'agregado' | 'ajuste' | 'importacion';

export interface InventoryMovement {
    id: string;
    inventoryId: string;
    orderId?: string;
    movementType: MovementType;
    quantity: number;
    notes?: string;
    createdAt: string;
}

// Reminder
export interface Reminder {
    id: string;
    orderId: string;
    scheduledFor: string;
    sent: boolean;
}

// Calendar day data for display
export interface CalendarDayData {
    date: string; // YYYY-MM-DD
    orders: Order[];
    urgencyLevel: 'today' | 'soon' | 'week' | 'future';
}

// Common unit options
export const UNIT_OPTIONS = [
    { label: 'Kilogramos', value: 'kg' },
    { label: 'Gramos', value: 'g' },
    { label: 'Unidades', value: 'u' },
    { label: 'Litros', value: 'L' },
    { label: 'Mililitros', value: 'ml' },
    { label: 'Cucharadas', value: 'cda' },
    { label: 'Tazas', value: 'taza' },
] as const;

// Common cake sizes
export const SIZE_OPTIONS = [
    '15 cm',
    '18 cm',
    '20 cm',
    '25 cm',
    '30 cm',
    'Cupcakes',
    'Individual',
    'Otro',
] as const;

// Payment method options
// Payment method options
export const getPaymentMethodOptions = (currency: string) => {
    if (currency === 'VES') {
        return [
            { label: 'Efectivo', value: 'efectivo' as PaymentMethod },
            { label: 'Pago Móvil', value: 'pago_movil' as PaymentMethod },
            { label: 'Zelle', value: 'zelle' as PaymentMethod },
        ];
    }
    return [
        { label: 'Efectivo', value: 'efectivo' as PaymentMethod },
        { label: 'Transferencia', value: 'transferencia' as PaymentMethod },
        { label: 'Zelle', value: 'zelle' as PaymentMethod },
    ];
};

// Delivery state, independent of payment (orders.delivered_at, migration 032)
export type DeliveryState = 'por_entregar' | 'entregado' | 'cancelado';

export const DELIVERY_STATE_OPTIONS = [
    { label: 'Por entregar', value: 'por_entregar' as DeliveryState, color: '#FFB74D', textKey: 'pendiente' },
    { label: 'Entregado', value: 'entregado' as DeliveryState, color: '#A8D5BA', textKey: 'pagado' },
    { label: 'Cancelado', value: 'cancelado' as DeliveryState, color: '#E57373', textKey: 'cancelado' },
] as const;

export function getDeliveryState(order: { status: string; deliveredAt?: string | null }): DeliveryState {
    if (order.status === 'cancelado') return 'cancelado';
    return order.deliveredAt ? 'entregado' : 'por_entregar';
}

export function getDeliveryOption(order: { status: string; deliveredAt?: string | null }) {
    const state = getDeliveryState(order);
    return DELIVERY_STATE_OPTIONS.find(o => o.value === state)!;
}

// What the client still owes. An order with no price counts as paid (nothing to collect).
export function getOrderBalance(order: { status: string; paymentStatus?: string; totalPrice: number; depositAmount?: number }) {
    const balance = (order.totalPrice || 0) - (order.depositAmount || 0);
    const isPaid = order.status === 'pagado' || order.paymentStatus === 'pagado' || balance <= 0;
    return { balance: isPaid ? 0 : balance, isPaid };
}

// Legacy order status options (older app versions still read/write these values)
export const ORDER_STATUS_OPTIONS = [
    { label: 'Pendiente', value: 'pendiente' as OrderStatus, color: '#FFB74D' },
    { label: 'Pagado', value: 'pagado' as OrderStatus, color: '#A8D5BA' },
    { label: 'Cancelado', value: 'cancelado' as OrderStatus, color: '#E57373' },
] as const;

// Cost Calculator Types
export interface RecipeCostConfig {
    laborPercentage: number;
    utilityCost: number;
    packagingCost: number;
    wastePercentage: number;
    profitPercentage: number;
    portions: number;
}

export interface CostIngredient {
    id: string; // unique for list
    name: string;
    quantityUsed: number;
    quantityBought: number;
    priceBought: number;
    unit: string;
}
