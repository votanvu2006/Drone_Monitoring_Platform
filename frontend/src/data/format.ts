const seedTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

export function toUtcIso(value: string): string {
  // The data pack stores timezone-free DATETIME strings in UTC.
  return new Date(value.replace(' ', 'T') + 'Z').toISOString();
}

export function formatSeedTime(value: string | null): string {
  return value === null ? 'Not recorded' : seedTimeFormat.format(new Date(toUtcIso(value))) + ' ICT';
}
