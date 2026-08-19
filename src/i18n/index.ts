import { en, type Dictionary } from "./dictionaries/en";
import { fa } from "./dictionaries/fa";
import type { Locale } from "./config";

const DICTIONARIES: Record<Locale, Dictionary> = {
  en: en as Dictionary,
  fa,
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
export * from "./config";
export * from "./format";
