import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-postanalys",
  description: "Analysera e-postmeddelanden",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
