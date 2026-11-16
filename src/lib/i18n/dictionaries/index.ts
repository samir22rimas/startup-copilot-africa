import type { Locale } from "../config"
import { en } from "./en"
import { fr } from "./fr"

export type Dictionary = typeof en

export const dictionaries: Record<Locale, Dictionary> = { en, fr }
