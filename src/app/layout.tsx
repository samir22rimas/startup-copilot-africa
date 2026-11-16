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
  keywords: [
    "AI co-founder",
    "African startups",
    "business plan generator",
    "startup validation",
    "entrepreneurship in Africa",
    "market research Africa",
    "financial modeling",
    "mobile money startups",
  ],
  authors: [{ name: "Anza Technologies" }],
  openGraph: {
    title: "Anza — Your AI Co-Founder for Building Businesses in Africa",
    description:
      "Transform business ideas into structured, validated and growing businesses with an intelligent AI co-founder built for African markets.",
    type: "website",
    locale: "en_US",
    siteName: "Anza",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anza — Your AI Co-Founder for Building Businesses in Africa",
    description:
      "Transform business ideas into structured, validated and growing businesses with an intelligent AI co-founder built for African markets.",
  },
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
