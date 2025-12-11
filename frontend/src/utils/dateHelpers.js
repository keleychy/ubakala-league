// Helper function to parse match date with timezone awareness
export function parseMatchDate(dateStr) {
    return new Date(dateStr);
}

// Helper function to get today's date range (local time)
export function getTodayDateRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return { today, tomorrow };
}

// Helper function to format date for display
export function formatDateLocal(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleString();
    } catch {
        return dateStr;
    }
}
