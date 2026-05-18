/**
 * Returns a human-readable "time ago" string from a Unix timestamp.
 * e.g.  timeAgo(Date.now() - 90000) → "1h ago"
 */
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}

module.exports = timeAgo;
