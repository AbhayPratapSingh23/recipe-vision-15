import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslations from "./locales/en.json";
import hiTranslations from "./locales/hi.json";
import taTranslations from "./locales/ta.json";
import teTranslations from "./locales/te.json";
import bnTranslations from "./locales/bn.json";
import mrTranslations from "./locales/mr.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
      ta: { translation: taTranslations },
      te: { translation: teTranslations },
      bn: { translation: bnTranslations },
      mr: { translation: mrTranslations },
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
