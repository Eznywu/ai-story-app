import { HAPPY_HORSE_BOOK, HAPPY_HORSE_EYE_LEFT, HAPPY_HORSE_EYE_RIGHT } from "@/app/components/brandPaths";
import { BRAND_NAME } from "@/lib/brand";

export type BrandMarkVariant = "light" | "onDark" | "mono" | "monoIvory";

const FILLS: Record<BrandMarkVariant, { feature: string; book: string }> = {
  light: { feature: "#47312A", book: "#C17C63" },
  onDark: { feature: "#F4F1EB", book: "#C17C63" },
  mono: { feature: "currentColor", book: "currentColor" },
  monoIvory: { feature: "#F4F1EB", book: "#F4F1EB" },
};

type Props = {
  variant?: BrandMarkVariant;
  className?: string;
  /** Accessible name. Pass null when nearby text already names the brand. */
  label?: string | null;
};

/** The Happy Horse symbol only. The wordmark stays outside this drawing. */
export function BrandMark({ variant = "onDark", className, label = BRAND_NAME }: Props) {
  const { feature, book } = FILLS[variant];
  const named = Boolean(label);
  return (
    <svg
      className={className}
      viewBox="238 245 777 777"
      role={named ? "img" : undefined}
      aria-hidden={named ? undefined : true}
      aria-label={named ? label ?? undefined : undefined}
    >
      <g fill={feature}>
        <g transform="translate(476.9 434.2) rotate(22.4)">
          <rect x="-94.05" y="-35.95" width="188.1" height="71.9" rx="35.95" />
        </g>
        <g transform="translate(775.4 434.1) rotate(-22.4)">
          <rect x="-93.95" y="-35.95" width="187.9" height="71.9" rx="35.95" />
        </g>
      </g>
      <g fill="none" stroke={feature} strokeWidth="52" strokeLinecap="round" strokeLinejoin="round">
        <path d={HAPPY_HORSE_EYE_LEFT.trim()} />
        <path d={HAPPY_HORSE_EYE_RIGHT.trim()} />
      </g>
      <path
        d={HAPPY_HORSE_BOOK.trim()}
        fill="none"
        stroke={book}
        strokeWidth="54"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
