// Format an ISO timestamp (e.g. "2025-12-06T23:10:00Z") into a
// short relative string like "Just now", "5m ago", "3h ago", "2d ago".
export function formatRelativeTime(iso: string): string {
    if (!iso) return "";

    const date = new Date(iso);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    // Fallback: short date for older items
    return date.toLocaleDateString();
}
