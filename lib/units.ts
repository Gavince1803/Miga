
export type Unit = 'kg' | 'g' | 'L' | 'ml' | 'u';

const CONVERSION_RATES: Record<string, number> = {
    // Mass (base: g)
    'kg': 1000,
    'g': 1,

    // Volume (base: ml)
    'L': 1000,
    'ml': 1,

    // Count (base: u)
    'u': 1,
};

const UNIT_TYPES: Record<string, 'mass' | 'volume' | 'count'> = {
    'kg': 'mass',
    'g': 'mass',
    'L': 'volume',
    'ml': 'volume',
    'u': 'count',
};

/**
 * Converts a value from one unit to another.
 * Returns null if conversion is not possible (incompatible types).
 */
export function convertValue(value: number, fromUnit: string, toUnit: string): number | null {
    // Normalize units to lower case just in case, though we expect standard keys
    const from = fromUnit as Unit;
    const to = toUnit as Unit;

    if (from === to) return value;

    const fromType = UNIT_TYPES[from];
    const toType = UNIT_TYPES[to];

    // If types don't match (e.g. kg to L), we can't convert without density
    // For simplicity in this app, we assume 1g ~= 1ml if strictly needed, but better to return null/fail
    // However, baking often mixes them. Let's start with strict type checking.
    // Update: In kitchen logic, often 1kg = 1L (water). 
    // If strict, return null.
    if (!fromType || !toType || fromType !== toType) {
        // Fallback for simple kitchen logic? 
        // For now, let's be strict. If user tries to deduct 'kg' from 'L', it's an error.
        return null;
    }

    const fromFactor = CONVERSION_RATES[from];
    const toFactor = CONVERSION_RATES[to];

    // Convert to base, then to target
    // value * fromFactor = baseValue
    // baseValue / toFactor = targetValue
    const baseValue = value * fromFactor;
    return baseValue / toFactor;
}
