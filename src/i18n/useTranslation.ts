import { useState, useEffect } from "react";
import { Language, translations, Translations } from "./translations";

const LANG_KEY = "sonsus_language";

export function getStoredLanguage(): Language {
  const saved = localStorage.getItem(LANG_KEY) as Language;
  if (saved && ["tr", "en", "de", "es", "fr", "ru"].includes(saved)) return saved;
  // Browser / System language detection
  const navLang = navigator.language.toLowerCase();
  if (navLang.startsWith("tr")) return "tr";
  if (navLang.startsWith("de")) return "de";
  if (navLang.startsWith("es")) return "es";
  if (navLang.startsWith("fr")) return "fr";
  if (navLang.startsWith("ru")) return "ru";
  return "en";
}

export function setStoredLanguage(lang: Language) {
  localStorage.setItem(LANG_KEY, lang);
  window.dispatchEvent(new Event("sonsus_lang_change"));
}

export function useTranslation(): {
  lang: Language;
  setLang: (l: Language) => void;
  t: Translations;
} {
  const [lang, setLangState] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    const handler = () => {
      setLangState(getStoredLanguage());
    };
    window.addEventListener("sonsus_lang_change", handler);
    return () => window.removeEventListener("sonsus_lang_change", handler);
  }, []);

  const setLang = (l: Language) => {
    setStoredLanguage(l);
    setLangState(l);
  };

  return {
    lang,
    setLang,
    t: translations[lang],
  };
}
