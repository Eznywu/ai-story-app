import { HAPPY_HORSE_BOOK, HAPPY_HORSE_EYE_LEFT, HAPPY_HORSE_EYE_RIGHT } from "@/app/components/brandPaths";

/** The approved mark: eyebrows, crescent eyes, and the terracotta book-smile. */
export function happyHorseMarkSvg(x: number, y: number, size: number): string {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="238 245 777 777">
    <g fill="#47312A">
      <g transform="translate(476.9 434.2) rotate(22.4)">
        <rect x="-94.05" y="-35.95" width="188.1" height="71.9" rx="35.95"/>
      </g>
      <g transform="translate(775.4 434.1) rotate(-22.4)">
        <rect x="-93.95" y="-35.95" width="187.9" height="71.9" rx="35.95"/>
      </g>
    </g>
    <g fill="none" stroke="#47312A" stroke-width="52" stroke-linecap="round" stroke-linejoin="round">
      <path d="${HAPPY_HORSE_EYE_LEFT.trim()}"/>
      <path d="${HAPPY_HORSE_EYE_RIGHT.trim()}"/>
    </g>
    <path d="${HAPPY_HORSE_BOOK.trim()}" fill="none" stroke="#C17C63" stroke-width="54" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
