import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/src/providers/theme-provider";
import { I18nProvider } from "@/src/lib/i18n/client";
import { getLocale } from "@/src/lib/i18n/server";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Anza — Your AI Co-Founder for Building Businesses in Africa",
  description:
    "Anza guides African entrepreneurs from idea to growth: discover, validate, plan, launch and run a business with an AI co-founder.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider locale={locale}>{children}</I18nProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
