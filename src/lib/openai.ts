import { GoogleGenAI } from "@google/genai";

/**
 * Shared Gemini AI client using the official @google/genai SDK.
 * Primary model: gemini-3.8-flash
 */
const apiKey =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing GEMINI_API_KEY in .env.local. Add your Google AI API key before running the app.",
  );
}

export const geminiClient = new GoogleGenAI({ apiKey });

/** Default Gemini model used across the app. */
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// Keep openai export for any legacy code that still imports it
import OpenAI from "openai";
const groqKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
export const openai = groqKey
  ? new OpenAI({
      apiKey: groqKey,
      baseURL: process.env.GROQ_API_KEY
        ? process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"
        : "https://api.openai.com/v1",
    })
  : null;
