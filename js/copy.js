// Pure copy helpers.

export const MET_DATE = new Date(2026, 9, 13);

const DAY = 24 * 60 * 60 * 1000;
const utcDay = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

// Whole local calendar days from `from` to `to` (negative if `to` is earlier).
export function daysSince(from, to) {
  return Math.round((utcDay(to) - utcDay(from)) / DAY);
}

const WORDS = ['', '', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export function daysAgoPhrase(n) {
  if (n <= 1) return 'A day ago';
  if (n <= 10) return `${WORDS[n]} days ago`;
  return 'A few weeks ago';
}
