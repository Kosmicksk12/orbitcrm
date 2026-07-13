import { cn } from "@/lib/utils";

/**
 * The OrbitCRM mark: an elliptical orbit with a core dot (your business)
 * and a satellite dot (a client/contact orbiting it). Rendered as inline
 * SVG so it stays crisp at any size — this is the single source of truth
 * for the brand mark used in the sidebar, topbar and login screen. The
 * PNG icons under public/icons/ mirror this same design for the PWA
 * manifest and favicons.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-xl bg-accent", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <ellipse cx="16" cy="16" rx="10.7" ry="6.5" stroke="white" strokeWidth="1.7" />
        <circle cx="16" cy="16" r="2.4" fill="white" />
        <circle cx="24.1" cy="11.4" r="1.5" fill="white" />
      </svg>
    </div>
  );
}
