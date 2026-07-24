import { ThemeToggle } from "@/src/components/shared/ThemeToggle";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  HelpCircle,
  Scale,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Startup Copilot Africa",
  description:
    "Terms of Service and Conditions of Use for Startup Copilot Africa.",
};

export default function TermsPage() {
  const lastUpdated = "July 24, 2026";

  const sections = [
    {
      id: "acceptance",
      icon: UserCheck,
      title: "1. Acceptance of Terms",
      content: `By accessing or using Startup Copilot Africa ("Platform", "we", "us", or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. These terms apply to all visitors, registered founders, team members, and users of the Platform.`,
    },
    {
      id: "description",
      icon: FileText,
      title: "2. Description of Services",
      content: `Startup Copilot Africa provides AI-assisted business planning, founder interviewing, market insight generation, financial model modeling, and strategic roadmap tools tailored for entrepreneurs and startups operating across African markets. The platform relies on modern generative AI technologies to assist founders in clarifying their business models.`,
    },
    {
      id: "ai-disclaimer",
      icon: AlertCircle,
      title: "3. AI Output & Guidance Disclaimer",
      content: `Our AI co-founder features generate automated business documents, market evaluations, and recommendations based on user inputs and external dataset training. While we strive for high accuracy and relevance to African business realities:
      • Content produced by Startup Copilot Africa is for informational and educational purposes only and does not constitute formal legal, tax, financial, or regulatory advice.
      • Users are responsible for independently verifying financial projections, legal compliance, and market data before making binding commitments or investment decisions.`,
    },
    {
      id: "intellectual-property",
      icon: ShieldCheck,
      title: "4. Intellectual Property & Idea Ownership",
      content: `• Your Ideas & Startup Content: You retain full, uncompromised ownership of all business ideas, prompts, proprietary data, documents, and business plans you submit to or generate with Startup Copilot Africa.
      • Platform Assets: All platform source code, user interface designs, branding, logos, graphics, and proprietary algorithms remain the exclusive property of Startup Copilot Africa.`,
    },
    {
      id: "acceptable-use",
      icon: Scale,
      title: "5. Acceptable Use Policy",
      content: `You agree not to use the Platform to:
      • Violate any applicable local, national, or international laws or regulations.
      • Upload or transmit deceptive, fraudulent, illegal, or harmful material.
      • Reverse engineer, scrape, or attempt to extract source algorithms or prompt templates without authorization.
      • Impersonate any person or entity or misrepresent your affiliation with a business.`,
    },
    {
      id: "liability",
      icon: Scale,
      title: "6. Limitation of Liability",
      content: `To the maximum extent permitted by law, Startup Copilot Africa shall not be liable for any indirect, incidental, consequential, special, or punitive damages, or loss of profits, revenue, data, or business opportunities arising out of your access to or use of (or inability to use) the Platform.`,
    },
    {
      id: "modifications",
      icon: HelpCircle,
      title: "7. Modifications & Contact",
      content: `We reserve the right to modify these Terms at any time. Material changes will be communicated via notice on our website or via email. Continued use of the platform following any modifications signifies acceptance of the updated terms.
      
      For questions regarding these Terms of Service, please contact us at support@startupcopilot.africa.`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f8fbf8] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      {/* Top Header */}
      <header className="border-b border-green-900/10 bg-[#082b22] text-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight transition-transform hover:scale-[1.01]"
            aria-label="Startup Copilot Africa home"
          >
            <Image
              src="/logo.png"
              alt="Startup Copilot Africa"
              width={40}
              height={40}
              className="size-10 rounded-xl object-contain"
            />
            <span className="text-lg">
              Startup Copilot{" "}
              <span className="text-green-300 font-bold">Africa</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-green-100 backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <ArrowLeft className="size-3.5" />{" "}
              <span className="max-sm:hidden">Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#082b22] py-16 text-white border-b border-green-400/20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-300/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-green-300 backdrop-blur-sm">
            Legal & Governance
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-base text-green-100/80">
            Please read these terms carefully before using Startup Copilot
            Africa.
          </p>
          <p className="mt-2 text-xs text-green-200/60 font-medium">
            Last Updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-8">
          {sections.map(({ id, icon: Icon, title, content }) => (
            <article
              key={id}
              id={id}
              className="rounded-3xl border border-green-100 bg-card p-8 shadow-sm transition-all duration-300 hover:border-green-200 hover:shadow-md dark:border-green-900/40 dark:hover:border-green-700"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300">
                  <Icon className="size-5" />
                </span>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {title}
                </h2>
              </div>
              <div className="mt-4 space-y-3 leading-7 text-zinc-600 dark:text-zinc-400 text-sm whitespace-pre-line">
                {content}
              </div>
            </article>
          ))}
        </div>

        {/* Footer Link */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-green-100 pt-8 text-xs text-zinc-500 dark:border-green-900/40 dark:text-zinc-400">
          <p>
            © {new Date().getFullYear()} Startup Copilot Africa. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4 font-semibold text-green-800 dark:text-green-400">
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/sign-in" className="hover:underline">
              Sign In
            </Link>
            <span>•</span>
            <Link href="/sign-up" className="hover:underline">
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
