/** Solana logomark, used next to wallet actions. */
export const SolMark = ({ className = 'size-4' }: { className?: string }) => (
  <svg viewBox="0 0 397 311" className={className} aria-hidden>
    <defs>
      <linearGradient id="sol-g" x1="360" y1="-37" x2="141" y2="383" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#00FFA3" />
        <stop offset="1" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
    <path fill="url(#sol-g)" d="M64.6 237.9a13 13 0 0 1 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7a13 13 0 0 1-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7Zm0-234.1A13.4 13.4 0 0 1 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7a13 13 0 0 1-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8Zm268.1 116.3a13 13 0 0 0-9.2-3.8H6.1c-5.8 0-8.7 7-4.6 11.1l62.7 62.7a13 13 0 0 0 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7Z" />
  </svg>
);
