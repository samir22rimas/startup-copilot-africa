/**
 * Country-aware business context.
 *
 * Each profile lists stable, widely known facts about doing business in a
 * country: currency, common payment rails, the legal framework and the bodies
 * a founder deals with. It deliberately contains NO fees, tax rates, minimum
 * capital amounts or processing times — those change, and Anza must not
 * present them as current. Prompts and UI always tell the founder to confirm
 * details with the authority named here or a qualified professional.
 *
 * To support a new country, add an entry to COUNTRY_PROFILES. Countries
 * without one fall back to a generic profile built from african-countries.ts.
 */
import { getAfricanCountry } from "@/src/lib/african-countries"
import type { Locale } from "@/src/lib/i18n/config"

type Localized = Record<Locale, string>

export interface CountryProfile {
  code: string
  name: Localized
  currency: string
  /** Fixed exchange-rate arrangements that are a matter of public record. */
  currencyNote?: Localized
  businessLanguages: string[]
  /** Regional legal framework for commercial law, if any. */
  legalFramework?: Localized
  /** Common legal forms a small business chooses between. */
  businessStructures: Array<{ name: string; description: Localized }>
  /** Bodies involved in registering and running a business. */
  authorities: Array<{ name: string; role: Localized }>
  mobileMoney: string[]
  otherPayments: Localized
  /** Typical channels for reaching first customers. */
  acquisitionChannels: Localized
  /** Day-to-day operating conditions worth planning for. */
  operatingRealities: Localized
  majorCities: string[]
  /** True when the profile was written specifically for this country. */
  detailed: boolean
}

const OHADA: Localized = {
  en: "Member of OHADA: company law follows the OHADA Uniform Acts, shared with 16 other African states.",
  fr: "Membre de l'OHADA : le droit des sociétés suit les Actes uniformes OHADA, communs à 16 autres États africains.",
}

const OHADA_STRUCTURES: CountryProfile["businessStructures"] = [
  {
    name: "Entreprise individuelle",
    description: {
      en: "Sole proprietorship: simplest to start, but the owner is personally liable for debts.",
      fr: "Entreprise individuelle : la plus simple à créer, mais l'entrepreneur répond des dettes sur ses biens personnels.",
    },
  },
  {
    name: "Entreprenant",
    description: {
      en: "Simplified OHADA status for very small activities, by declaration.",
      fr: "Statut OHADA simplifié pour les très petites activités, sur simple déclaration.",
    },
  },
  {
    name: "SARL",
    description: {
      en: "Limited liability company: the most common form for SMEs; liability limited to contributions.",
      fr: "Société à responsabilité limitée : forme la plus courante pour les PME ; responsabilité limitée aux apports.",
    },
  },
  {
    name: "SAS",
    description: {
      en: "Simplified joint-stock company: flexible governance, often chosen by startups seeking investors.",
      fr: "Société par actions simplifiée : gouvernance souple, souvent choisie par les startups qui cherchent des investisseurs.",
    },
  },
  {
    name: "SA",
    description: {
      en: "Public limited company: heavier governance, suited to larger ventures.",
      fr: "Société anonyme : gouvernance plus lourde, adaptée aux projets de plus grande taille.",
    },
  },
  {
    name: "GIE",
    description: {
      en: "Economic interest grouping: lets several businesses pool resources for a shared activity.",
      fr: "Groupement d'intérêt économique : permet à plusieurs entreprises de mutualiser des moyens.",
    },
  },
]

const INFORMAL_REALITY: Localized = {
  en: "A large share of trade is informal and cash-based; trust, word of mouth and physical presence matter. Plan for irregular power and connectivity, and for delivery costs outside the main cities.",
  fr: "Une grande partie du commerce est informelle et en espèces ; la confiance, le bouche-à-oreille et la présence physique comptent. Prévoyez des coupures d'électricité et de connexion, et des coûts de livraison hors des grandes villes.",
}

export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  CM: {
    code: "CM",
    name: { en: "Cameroon", fr: "Cameroun" },
    currency: "XAF",
    currencyNote: {
      en: "The Central African CFA franc (XAF) is issued by the BEAC and pegged to the euro at a fixed rate of 655.957 XAF per EUR.",
      fr: "Le franc CFA d'Afrique centrale (XAF) est émis par la BEAC et arrimé à l'euro au taux fixe de 655,957 XAF pour 1 EUR.",
    },
    businessLanguages: ["French", "English"],
    legalFramework: OHADA,
    businessStructures: OHADA_STRUCTURES,
    authorities: [
      {
        name: "CFCE (Centre de Formalités de Création d'Entreprises)",
        role: {
          en: "One-stop shop for registering a business.",
          fr: "Guichet unique pour la création d'entreprise.",
        },
      },
      {
        name: "RCCM (Registre du Commerce et du Crédit Mobilier)",
        role: { en: "Commercial register entry for the business.", fr: "Immatriculation de l'entreprise au registre du commerce." },
      },
      {
        name: "DGI (Direction Générale des Impôts)",
        role: {
          en: "Tax administration; issues the taxpayer number (NIU).",
          fr: "Administration fiscale ; délivre le numéro d'identifiant unique (NIU).",
        },
      },
      {
        name: "CNPS (Caisse Nationale de Prévoyance Sociale)",
        role: { en: "Social security registration for employers.", fr: "Immatriculation des employeurs à la sécurité sociale." },
      },
    ],
    mobileMoney: ["MTN Mobile Money", "Orange Money"],
    otherPayments: {
      en: "Cash remains dominant. Bank transfers and cards are used mostly by formal businesses and in Douala and Yaoundé.",
      fr: "Les espèces restent dominantes. Virements et cartes sont surtout utilisés par les entreprises formelles et à Douala et Yaoundé.",
    },
    acquisitionChannels: {
      en: "WhatsApp groups and status, Facebook, word of mouth, markets and neighbourhood networks, churches and associations (including tontines and njangi groups), campus networks, local radio.",
      fr: "Groupes et statuts WhatsApp, Facebook, bouche-à-oreille, marchés et réseaux de quartier, églises et associations (dont les tontines), réseaux universitaires, radios locales.",
    },
    operatingRealities: {
      en: "Bilingual market (French-speaking majority, English-speaking North-West and South-West). Much trade is informal and cash-based. Plan for power cuts, uneven mobile data, and transport costs between Douala, Yaoundé and secondary cities. Tontines are a common source of start-up capital.",
      fr: "Marché bilingue (majorité francophone, Nord-Ouest et Sud-Ouest anglophones). Une grande partie du commerce est informelle et en espèces. Prévoyez les coupures d'électricité, une data mobile inégale et les coûts de transport entre Douala, Yaoundé et les villes secondaires. Les tontines sont une source fréquente de capital de départ.",
    },
    majorCities: ["Douala", "Yaoundé", "Bafoussam", "Bamenda", "Garoua", "Buea"],
    detailed: true,
  },
  NG: {
    code: "NG",
    name: { en: "Nigeria", fr: "Nigéria" },
    currency: "NGN",
    businessLanguages: ["English"],
    businessStructures: [
      {
        name: "Business Name",
        description: {
          en: "Registered sole proprietorship or partnership; owners are personally liable.",
          fr: "Entreprise individuelle ou société de personnes enregistrée ; responsabilité personnelle.",
        },
      },
      {
        name: "Private Limited Company (Ltd)",
        description: {
          en: "Separate legal entity with limited liability; the usual choice for startups.",
          fr: "Personne morale distincte à responsabilité limitée ; choix habituel des startups.",
        },
      },
    ],
    authorities: [
      { name: "Corporate Affairs Commission (CAC)", role: { en: "Company and business-name registration.", fr: "Immatriculation des sociétés et des noms commerciaux." } },
      { name: "Federal tax authority", role: { en: "Tax identification number (TIN) and federal taxes.", fr: "Numéro d'identification fiscale (TIN) et impôts fédéraux." } },
    ],
    mobileMoney: ["OPay", "PalmPay", "MTN MoMo"],
    otherPayments: {
      en: "Bank transfers, USSD banking, cards and POS agents are widely used alongside cash.",
      fr: "Virements bancaires, banque par USSD, cartes et agents POS sont très utilisés, en plus des espèces.",
    },
    acquisitionChannels: {
      en: "WhatsApp, Instagram, X and TikTok, marketplaces, POS-agent and trade-association networks, referrals.",
      fr: "WhatsApp, Instagram, X et TikTok, places de marché, réseaux d'agents POS et d'associations professionnelles, recommandations.",
    },
    operatingRealities: INFORMAL_REALITY,
    majorCities: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"],
    detailed: true,
  },
  GH: {
    code: "GH",
    name: { en: "Ghana", fr: "Ghana" },
    currency: "GHS",
    businessLanguages: ["English"],
    businessStructures: [
      { name: "Sole Proprietorship", description: { en: "Simplest form; owner personally liable.", fr: "Forme la plus simple ; responsabilité personnelle." } },
      { name: "Private Company Limited by Shares", description: { en: "Limited liability company, common for startups.", fr: "Société à responsabilité limitée, courante pour les startups." } },
    ],
    authorities: [
      { name: "Office of the Registrar of Companies (ORC)", role: { en: "Business and company registration.", fr: "Immatriculation des entreprises et sociétés." } },
      { name: "Ghana Revenue Authority (GRA)", role: { en: "Taxpayer identification and taxes.", fr: "Identification fiscale et impôts." } },
    ],
    mobileMoney: ["MTN MoMo", "Telecel Cash", "AirtelTigo Money"],
    otherPayments: { en: "Cash, bank transfers and cards in larger cities.", fr: "Espèces, virements et cartes dans les grandes villes." },
    acquisitionChannels: {
      en: "WhatsApp, Facebook and Instagram, markets, church and community networks, radio.",
      fr: "WhatsApp, Facebook et Instagram, marchés, réseaux religieux et communautaires, radio.",
    },
    operatingRealities: INFORMAL_REALITY,
    majorCities: ["Accra", "Kumasi", "Tamale", "Takoradi"],
    detailed: true,
  },
  KE: {
    code: "KE",
    name: { en: "Kenya", fr: "Kenya" },
    currency: "KES",
    businessLanguages: ["English", "Swahili"],
    businessStructures: [
      { name: "Sole Proprietorship (Business Name)", description: { en: "Simplest form; owner personally liable.", fr: "Forme la plus simple ; responsabilité personnelle." } },
      { name: "Private Limited Company", description: { en: "Limited liability company, common for startups.", fr: "Société à responsabilité limitée, courante pour les startups." } },
    ],
    authorities: [
      { name: "Business Registration Service (BRS)", role: { en: "Business registration, through the eCitizen portal.", fr: "Immatriculation des entreprises, via le portail eCitizen." } },
      { name: "Kenya Revenue Authority (KRA)", role: { en: "KRA PIN and taxes.", fr: "Numéro KRA PIN et impôts." } },
    ],
    mobileMoney: ["M-Pesa", "Airtel Money"],
    otherPayments: { en: "Bank transfers and cards; M-Pesa is used for most everyday payments.", fr: "Virements et cartes ; M-Pesa sert à la plupart des paiements courants." },
    acquisitionChannels: {
      en: "WhatsApp, Facebook, TikTok and X, chamas (savings groups), referrals, market and estate networks.",
      fr: "WhatsApp, Facebook, TikTok et X, chamas (groupes d'épargne), recommandations, réseaux de marché et de quartier.",
    },
    operatingRealities: INFORMAL_REALITY,
    majorCities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"],
    detailed: true,
  },
  ZA: {
    code: "ZA",
    name: { en: "South Africa", fr: "Afrique du Sud" },
    currency: "ZAR",
    businessLanguages: ["English"],
    businessStructures: [
      { name: "Sole Proprietor", description: { en: "Trading in your own name; personally liable.", fr: "Activité en nom propre ; responsabilité personnelle." } },
      { name: "Private Company (Pty) Ltd", description: { en: "Limited liability company, the usual startup vehicle.", fr: "Société à responsabilité limitée, véhicule habituel des startups." } },
    ],
    authorities: [
      { name: "CIPC (Companies and Intellectual Property Commission)", role: { en: "Company registration.", fr: "Immatriculation des sociétés." } },
      { name: "SARS (South African Revenue Service)", role: { en: "Tax registration and taxes.", fr: "Enregistrement fiscal et impôts." } },
    ],
    mobileMoney: [],
    otherPayments: {
      en: "Cards, EFT / instant bank payments and retailer-based wallets dominate; cash remains important in townships and informal trade.",
      fr: "Cartes, virements instantanés et portefeuilles liés aux enseignes dominent ; les espèces restent importantes dans les townships et le commerce informel.",
    },
    acquisitionChannels: {
      en: "WhatsApp, Facebook, Instagram and TikTok, community radio, spaza and stokvel networks, referrals.",
      fr: "WhatsApp, Facebook, Instagram et TikTok, radios communautaires, réseaux de spazas et de stokvels, recommandations.",
    },
    operatingRealities: {
      en: "Plan for power interruptions (load shedding) and the cost of data. Formal retail is strong; township economies run on cash and community trust.",
      fr: "Prévoyez les coupures de courant (délestages) et le coût de la data. La distribution formelle est forte ; l'économie des townships repose sur les espèces et la confiance communautaire.",
    },
    majorCities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Gqeberha"],
    detailed: true,
  },
  SN: {
    code: "SN",
    name: { en: "Senegal", fr: "Sénégal" },
    currency: "XOF",
    currencyNote: {
      en: "The West African CFA franc (XOF) is issued by the BCEAO and pegged to the euro at a fixed rate of 655.957 XOF per EUR.",
      fr: "Le franc CFA d'Afrique de l'Ouest (XOF) est émis par la BCEAO et arrimé à l'euro au taux fixe de 655,957 XOF pour 1 EUR.",
    },
    businessLanguages: ["French", "Wolof"],
    legalFramework: OHADA,
    businessStructures: OHADA_STRUCTURES,
    authorities: [
      { name: "APIX", role: { en: "One-stop shop for business creation.", fr: "Guichet unique de création d'entreprise." } },
      { name: "DGID (Direction Générale des Impôts et des Domaines)", role: { en: "Tax administration (NINEA taxpayer number).", fr: "Administration fiscale (numéro NINEA)." } },
    ],
    mobileMoney: ["Wave", "Orange Money", "Free Money"],
    otherPayments: { en: "Cash is still very common; cards mostly in Dakar.", fr: "Les espèces restent très courantes ; les cartes surtout à Dakar." },
    acquisitionChannels: {
      en: "WhatsApp, Facebook, TikTok, markets, neighbourhood and religious networks, tontines, radio.",
      fr: "WhatsApp, Facebook, TikTok, marchés, réseaux de quartier et religieux, tontines, radio.",
    },
    operatingRealities: INFORMAL_REALITY,
    majorCities: ["Dakar", "Thiès", "Touba", "Saint-Louis"],
    detailed: true,
  },
  CI: {
    code: "CI",
    name: { en: "Côte d'Ivoire", fr: "Côte d'Ivoire" },
    currency: "XOF",
    currencyNote: {
      en: "The West African CFA franc (XOF) is issued by the BCEAO and pegged to the euro at a fixed rate of 655.957 XOF per EUR.",
      fr: "Le franc CFA d'Afrique de l'Ouest (XOF) est émis par la BCEAO et arrimé à l'euro au taux fixe de 655,957 XOF pour 1 EUR.",
    },
    businessLanguages: ["French"],
    legalFramework: OHADA,
    businessStructures: OHADA_STRUCTURES,
    authorities: [
      { name: "CEPICI", role: { en: "One-stop shop for business creation.", fr: "Guichet unique de création d'entreprise." } },
      { name: "DGI (Direction Générale des Impôts)", role: { en: "Tax administration.", fr: "Administration fiscale." } },
    ],
    mobileMoney: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"],
    otherPayments: { en: "Cash is still very common; cards mostly in Abidjan.", fr: "Les espèces restent très courantes ; les cartes surtout à Abidjan." },
    acquisitionChannels: {
      en: "WhatsApp, Facebook, TikTok, markets, neighbourhood networks, tontines, radio.",
      fr: "WhatsApp, Facebook, TikTok, marchés, réseaux de quartier, tontines, radio.",
    },
    operatingRealities: INFORMAL_REALITY,
    majorCities: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro"],
    detailed: true,
  },
  RW: {
    code: "RW",
    name: { en: "Rwanda", fr: "Rwanda" },
    currency: "RWF",
    businessLanguages: ["Kinyarwanda", "English", "French"],
    businessStructures: [
      { name: "Sole Trader", description: { en: "Individual enterprise; personally liable.", fr: "Entreprise individuelle ; responsabilité personnelle." } },
      { name: "Private Limited Company", description: { en: "Limited liability company.", fr: "Société à responsabilité limitée." } },
    ],
    authorities: [
      { name: "Rwanda Development Board (RDB)", role: { en: "Online business registration.", fr: "Immatriculation des entreprises en ligne." } },
      { name: "Rwanda Revenue Authority (RRA)", role: { en: "Tax registration and taxes.", fr: "Enregistrement fiscal et impôts." } },
    ],
    mobileMoney: ["MTN MoMo", "Airtel Money"],
    otherPayments: { en: "Mobile money is widely used; cards and bank transfers in Kigali.", fr: "Le mobile money est très utilisé ; cartes et virements à Kigali." },
    acquisitionChannels: {
      en: "WhatsApp, Instagram and X, cooperatives, community networks, referrals.",
      fr: "WhatsApp, Instagram et X, coopératives, réseaux communautaires, recommandations.",
    },
    operatingRealities: INFORMAL_REALITY,
    majorCities: ["Kigali", "Huye", "Musanze", "Rubavu"],
    detailed: true,
  },
}

/** Countries with a hand-written profile, for pickers and marketing copy. */
export const DETAILED_COUNTRY_CODES = Object.keys(COUNTRY_PROFILES)

export function getCountryProfile(code: string | null | undefined): CountryProfile {
  const key = (code ?? "").trim().toUpperCase()
  const known = COUNTRY_PROFILES[key]
  if (known) return known

  const country = getAfricanCountry(key)
  const name = country?.name ?? "this country"
  return {
    code: key || "XX",
    name: { en: name, fr: name },
    currency: country?.currency ?? "USD",
    businessLanguages: [],
    businessStructures: [],
    authorities: [],
    mobileMoney: [],
    otherPayments: {
      en: "Payment habits vary; confirm which mobile money services, banks and cash practices your customers actually use.",
      fr: "Les habitudes de paiement varient ; vérifiez quels services de mobile money, banques et pratiques en espèces vos clients utilisent réellement.",
    },
    acquisitionChannels: {
      en: "Messaging apps, social networks, markets, community and professional networks, referrals.",
      fr: "Messageries, réseaux sociaux, marchés, réseaux communautaires et professionnels, recommandations.",
    },
    operatingRealities: INFORMAL_REALITY,
    majorCities: [],
    detailed: false,
  }
}

/** Compact, prompt-ready description of a country's business context. */
export function describeCountryForPrompt(code: string | null | undefined, locale: Locale = "en"): string {
  const profile = getCountryProfile(code)
  const lines = [
    `Country: ${profile.name[locale]} (${profile.code}). Local currency: ${profile.currency}.`,
    profile.currencyNote?.[locale],
    profile.legalFramework?.[locale],
    profile.businessStructures.length
      ? `Common legal forms: ${profile.businessStructures.map((s) => s.name).join(", ")}.`
      : null,
    profile.authorities.length
      ? `Bodies a founder deals with: ${profile.authorities.map((a) => a.name).join("; ")}.`
      : null,
    profile.mobileMoney.length ? `Mobile money services: ${profile.mobileMoney.join(", ")}.` : null,
    `Other payments: ${profile.otherPayments[locale]}`,
    `Customer acquisition channels: ${profile.acquisitionChannels[locale]}`,
    `Operating realities: ${profile.operatingRealities[locale]}`,
    profile.detailed
      ? null
      : "No detailed country profile is available: be explicit that local specifics must be confirmed by the founder.",
    "Fees, tax rates, minimum capital and processing times are NOT provided here and change over time: never state them as facts; tell the founder which authority or professional to ask.",
  ]
  return lines.filter(Boolean).join("\n")
}
