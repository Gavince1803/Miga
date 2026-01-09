/**
 * Agenda Repostera - TypeScript Types
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

// Dictionary Option for Fillings, Covers, etc.
export interface DictionaryOption {
    id: string;
    category: string;
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
    decorationImageUrl?: string; // Sketch/photo of decoration

    // Payment
    totalPrice: number;
    depositAmount: number; // Abono
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;

    // Status
    status: OrderStatus;

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
    minStock?: number;
    category?: string;
    lastUpdated: string;
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
export const PAYMENT_METHOD_OPTIONS = [
    { label: 'Efectivo', value: 'efectivo' as PaymentMethod },
    { label: 'Transferencia', value: 'transferencia' as PaymentMethod },
    { label: 'Pendiente', value: 'pendiente' as PaymentMethod },
] as const;

// Order status options
export const ORDER_STATUS_OPTIONS = [
    { label: 'Pendiente', value: 'pendiente' as OrderStatus, color: '#FFB74D' },
    { label: 'En Proceso', value: 'en_proceso' as OrderStatus, color: '#64B5F6' },
    { label: 'Completado', value: 'completado' as OrderStatus, color: '#A8D5BA' },
    { label: 'Cancelado', value: 'cancelado' as OrderStatus, color: '#E57373' },
] as const;
