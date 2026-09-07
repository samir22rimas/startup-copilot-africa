import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/src/providers/theme-provider";

export const metadata: Metadata = {
  title: "Anza",
  description: "AI-powered guidance for African founders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
