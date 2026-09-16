// `new Date("YYYY-MM-DD")` is parsed as UTC midnight per the ECMAScript spec,
// which shifts the effective local day by one for any negative UTC offset
// (e.g. Venezuela, UTC-4). Full ISO timestamps (with "T"/time) don't have this
// problem — they parse to the correct instant and local getters already
// return the right local calendar fields.
export function parseLocalDate(dateStr: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
}

export function toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
