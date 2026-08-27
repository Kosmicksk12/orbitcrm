import { cn } from "@/lib/utils";

/**
 * The Danivo mark: a geometric "D" — the brand initial — in white on the
 * brand-blue rounded square. The counter of the D is the only negative
 * space, a quiet nod to "a core held in a frame". Rendered as one inline
 * SVG so it stays crisp at any size, from a 16px favicon to a 512px app
 * icon. The PNGs under public/icons/ are generated from this same shape
 * (see scripts/gen-brand-icons.mjs and design/icon-source.svg).
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="100" height="100" rx="29" className="fill-accent" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        className="fill-white"
        d="M26 22H46A28 28 0 0 1 46 78H26ZM39 35H46A15.5 15.5 0 0 1 46 65H39Z"
      />
    </svg>
  );
}
