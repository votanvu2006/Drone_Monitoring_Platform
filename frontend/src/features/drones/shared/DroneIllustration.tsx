type DroneIllustrationProps = {
  className?: string;
};

export function DroneIllustration({
  className,
}: DroneIllustrationProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path d="M21 21 10 15M27 21l11-6M21 27l-11 6M27 27l11 6" />
      <path d="M24 17v14M17 24h14" />
      <rect x="20" y="20" width="8" height="8" rx="2" />
      <ellipse cx="9" cy="14" rx="6" ry="2.5" />
      <ellipse cx="39" cy="14" rx="6" ry="2.5" />
      <ellipse cx="9" cy="34" rx="6" ry="2.5" />
      <ellipse cx="39" cy="34" rx="6" ry="2.5" />
    </svg>
  );
}