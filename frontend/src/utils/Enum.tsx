export const ConditionOptions = ["NM", "LP", "MP", "HP", "DMG"] as const

export type Condition = typeof ConditionOptions[number]

export const FoilFlagOptions = ["Traditional", "Etched", "Other"] as const
export const FoilTypeOptions = ["None", ...FoilFlagOptions] as const
export type FoilType = typeof FoilTypeOptions[number]

export const StampTypeOptions = ["None", "Promo", "Prerelease"] as const

export const LanguageOptions = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
    { value: "ru", label: "Russian" },
    { value: "zhs", label: "Simplified Chinese" },
    { value: "zht", label: "Traditional Chinese" },
    { value: "he", label: "Hebrew" },
    { value: "la", label: "Latin" },
    { value: "grc", label: "Ancient Greek" },
    { value: "ar", label: "Arabic" },
    { value: "sa", label: "Sanskrit" },
    { value: "ph", label: "Phyrexian" },
    { value: "qya", label: "Quenya" },
    { value: "dw", label: "Dwarvish" },
    { value: "tlh", label: "Klingon" },
] as const