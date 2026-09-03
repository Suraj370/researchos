/**
 * Produces labels like "Just now", "5 min ago", "2 hours ago", "Yesterday",
 * "3 days ago". Deliberately matches the substrings the Workflows page's date
 * filter checks for ("min ago", "hour", "just now", "yesterday", "days ago").
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return "Yesterday"
  return `${diffDays} days ago`
}
