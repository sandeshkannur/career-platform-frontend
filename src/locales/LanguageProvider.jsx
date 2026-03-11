import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "./en.json";
import kn from "./kn.json";

const STORAGE_KEY = "career_platform_language";

const dictionaries = {
  en,
  kn,
};

function interpolate(template, vars = {}) {
  if (typeof template !== "string") return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function translate(dict, key, fallback, vars) {
  const raw = dict?.[key];

  if (typeof raw === "string" && raw.length > 0) {
    return interpolate(raw, vars);
  }

  if (typeof fallback === "string") {
    return interpolate(fallback, vars);
  }

  return key;
}

const ContentContext = createContext({
  language: "en",
  lang: "en",
  setLanguage: () => {},
  setLang: () => {},
  t: (key, fallback, vars) => {
    if (typeof fallback === "string") {
      return interpolate(fallback, vars);
    }
    return key;
  },
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && dictionaries[saved] ? saved : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore storage issues
    }
  }, [language]);

  const setLanguage = (nextLanguage) => {
    setLanguageState(dictionaries[nextLanguage] ? nextLanguage : "en");
  };

  const dict = dictionaries[language] || dictionaries.en;

  const value = useMemo(
    () => ({
      language,
      lang: language,
      setLanguage,
      setLang: setLanguage,
      t: (key, fallback, vars) => translate(dict, key, fallback, vars),
    }),
    [language, dict]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  return useContext(ContentContext);
}

export default LanguageProvider;

