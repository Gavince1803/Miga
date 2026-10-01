// Spanish keyboards type "12,50"; parseFloat("12,50") would silently give 12.
// Returns 0 for empty or invalid input.
export function parseDecimal(text: string): number {
    const value = parseFloat(text.replace(',', '.'));
    return isNaN(value) ? 0 : value;
}

// For onChangeText of numeric fields: parseDecimal stops at a second
// separator ("2,54,20" → 2.54) and money would keep 4 decimals ("45,5020"),
// so drop extra separators and cap decimals while the person types.
export function cleanDecimalInput(text: string, maxDecimals?: number): string {
    const cleaned = text.replace(/[^0-9.,]/g, '');
    const sep = cleaned.search(/[.,]/);
    if (sep === -1) return cleaned;
    let decimals = cleaned.slice(sep + 1).replace(/[.,]/g, '');
    if (maxDecimals !== undefined) decimals = decimals.slice(0, maxDecimals);
    return cleaned.slice(0, sep + 1) + decimals;
}
