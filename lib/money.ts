import { CURRENCIES, Currency } from '@/context/SettingsContext';

// Local number format per currency: CLP and COP are written without cents.
const FORMATS: Record<Currency, { locale: string; decimals: number }> = {
    VES: { locale: 'es-VE', decimals: 2 },
    USD: { locale: 'en-US', decimals: 2 },
    MXN: { locale: 'es-MX', decimals: 2 },
    ARS: { locale: 'es-AR', decimals: 2 },
    COP: { locale: 'es-CO', decimals: 0 },
    CLP: { locale: 'es-CL', decimals: 0 },
};

export function formatMoney(amount: number, currency: Currency): string {
    const { locale, decimals } = FORMATS[currency] ?? FORMATS.USD;
    const symbol = CURRENCIES[currency]?.symbol ?? '$';
    const number = amount.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
    return `${symbol}${number}`;
}

// Short label for chart bars, without symbol: 850, 1,2k, 3,4M.
export function formatCompact(amount: number, currency: Currency): string {
    const { locale } = FORMATS[currency] ?? FORMATS.USD;
    const abs = Math.abs(amount);
    const [value, suffix] =
        abs >= 1_000_000 ? [amount / 1_000_000, 'M'] :
        abs >= 1_000 ? [amount / 1_000, 'k'] :
        [amount, ''];
    const digits = suffix && Math.abs(value) < 10 ? 1 : 0;
    return value.toLocaleString(locale, { maximumFractionDigits: digits }) + suffix;
}
