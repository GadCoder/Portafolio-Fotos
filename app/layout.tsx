import "./globals.css";
import localFont from "next/font/local";

const satoshi = localFont({
  src: [
    { path: "../public/fonts/satoshi-regular.woff2", weight: "400" },
    { path: "../public/fonts/satoshi-bold.woff2", weight: "700" },
  ],
  display: "optional",
  preload: true,
  adjustFontFallback: "Arial",
  fallback: ["Arial", "sans-serif"],
});

export const metadata = {
  title: "Portafolio fotográfico",
  description: "Portafolio fotográfico de Germán Ampuero",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={satoshi.className}>{children}</body>
    </html>
  );
}
