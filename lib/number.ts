// Spanish keyboards type "12,50"; parseFloat("12,50") would silently give 12.
// Returns 0 for empty or invalid input.
export function parseDecimal(text: string): number {
    const value = parseFloat(text.replace(',', '.'));
    return isNaN(value) ? 0 : value;
}
