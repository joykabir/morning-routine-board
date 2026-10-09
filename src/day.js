// Board-day boundary logic. A "board-day" starts at DAY_START_HOUR local time,
// so a late-night tap belongs to the day before and never bleeds into the
// next morning. All math is on local calendar fields, never on milliseconds,
// so clock changes (DST) cannot shift the boundary.

export const DAY_START_HOUR = 3;

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function formatLocal(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

export function boardDate(now) {
  const d = new Date(now.getTime());
  if (d.getHours() < DAY_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return formatLocal(d);
}

export function weekdayIndex(dateStr) {
  const parts = dateStr.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  // getDay(): Sunday = 0 ... Saturday = 6. We want Monday = 0 ... Sunday = 6.
  return (d.getDay() + 6) % 7;
}

export function msUntilNextBoardDay(now) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAY_START_HOUR, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}
