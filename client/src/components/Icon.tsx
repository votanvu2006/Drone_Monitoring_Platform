export type IconName = 'overview' | 'drone' | 'mission' | 'flight' | 'history'
  | 'alert' | 'check' | 'shield' | 'weather' | 'route' | 'arrow' | 'battery';

const paths: Record<IconName, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  drone: 'M8 8l8 8 M16 8l-8 8 M9 9h6v6H9z M3 3h5v5H3z M16 3h5v5h-5z M3 16h5v5H3z M16 16h5v5h-5z',
  mission: 'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h3',
  flight: 'M3 17l6-6 4 3 8-10 M15 4h6v6 M3 21h18',
  history: 'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2',
  alert: 'M12 3L2 21h20z M12 9v5 M12 17h.01',
  check: 'M4 12l5 5L20 6',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  weather: 'M7 16a4 4 0 0 1 0-8 6 6 0 0 1 11 1 3.5 3.5 0 0 1 0 7z M5 3l1 2 M12 1v2 M19 3l-1 2',
  route: 'M6 7a3 3 0 1 0 0-.01 M18 20a3 3 0 1 0 0-.01 M6 10v3c0 2 12 0 12 3',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  battery: 'M3 7h16v10H3z M19 10h2v4 M7 10v4 M11 10v4',
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>;
}
