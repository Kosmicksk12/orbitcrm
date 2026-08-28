import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toaster";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Danivo CRM — El sistema para tu taller de reparación",
    template: "%s · Danivo CRM",
  },
  description:
    "Danivo CRM junta las órdenes de reparación, el inventario de repuestos, la caja y las garantías de tu taller en un solo lugar.",
  applicationName: "Danivo CRM",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Danivo CRM",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-r2-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-r2-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon-r2.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F3F9" },
    { media: "(prefers-color-scheme: dark)", color: "#080B12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script
          // Runs before hydration to avoid a light/dark flash on load.
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('orbitcrm:theme') || 'system';
                var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark', dark);
              } catch (e) {}
            `,
          }}
        />
        {/* iOS splash screens — without these, installed apps show a blank
            white flash on launch instead of a branded loading screen.
            Los nombres llevan sufijo de versión (-r2): /splash/ va con
            Cache-Control immutable, así que renombrarlos es lo que fuerza a
            un teléfono ya instalado a bajar la marca nueva. Se regeneran con
            scripts/gen-splash.mjs. */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-15-14-pro-max-r2.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-15-14-pro-r2.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-14-plus-13-pro-max-r2.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-14-13-12-r2.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-11-pro-max-xs-max-r2.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-11-xr-r2.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-se-8-7-r2.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          {children}
          <ServiceWorkerRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
