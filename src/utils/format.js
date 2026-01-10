// Format YYYY-MM-DD → "December 10, 2025"
export function formatDate(dateStr) {
    if (!dateStr) return "";

    const [y, m, d] = dateStr.split("-");
    const date = new Date(y, parseInt(m) - 1, d);

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}
