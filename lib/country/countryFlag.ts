const REGIONAL_INDICATOR_BASE = 0x1f1e6;

/** ISO 3166-1 alpha-2 → flag emoji. Returns null for invalid codes. */
export function isoCountryCodeToFlagEmoji(iso: string): string | null {
  const code = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const points = [...code].map((char) => REGIONAL_INDICATOR_BASE + (char.charCodeAt(0) - 65));
  return String.fromCodePoint(...points);
}

function normalizeCountryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "d")
    .replace(/[.']/g, "")
    .replace(/\s+/g, " ");
}

/** English names + common local spellings → ISO alpha-2. */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  afghanistan: "AF",
  albania: "AL",
  algeria: "DZ",
  andorra: "AD",
  angola: "AO",
  argentina: "AR",
  armenia: "AM",
  australia: "AU",
  austria: "AT",
  austrija: "AT",
  osterreich: "AT",
  azerbaijan: "AZ",
  bahrain: "BH",
  bangladesh: "BD",
  belarus: "BY",
  belgium: "BE",
  belgique: "BE",
  belgie: "BE",
  belgija: "BE",
  bolivia: "BO",
  "bosnia and herzegovina": "BA",
  "bosna i hercegovina": "BA",
  brazil: "BR",
  brasil: "BR",
  bulgaria: "BG",
  bugarska: "BG",
  cameroon: "CM",
  canada: "CA",
  chile: "CL",
  china: "CN",
  colombia: "CO",
  "costa rica": "CR",
  croatia: "HR",
  hrvatska: "HR",
  cuba: "CU",
  cyprus: "CY",
  "czech republic": "CZ",
  czechia: "CZ",
  "ceska republika": "CZ",
  ceska: "CZ",
  denmark: "DK",
  danmark: "DK",
  danska: "DK",
  ecuador: "EC",
  egypt: "EG",
  england: "GB",
  engleska: "GB",
  estonia: "EE",
  estonija: "EE",
  ethiopia: "ET",
  finland: "FI",
  suomi: "FI",
  finska: "FI",
  france: "FR",
  francuska: "FR",
  georgia: "GE",
  germany: "DE",
  deutschland: "DE",
  njemacka: "DE",
  ghana: "GH",
  greece: "GR",
  ellada: "GR",
  grcka: "GR",
  hungary: "HU",
  magyarorszag: "HU",
  madarska: "HU",
  iceland: "IS",
  india: "IN",
  indonesia: "ID",
  iran: "IR",
  iraq: "IQ",
  ireland: "IE",
  israel: "IL",
  italy: "IT",
  italia: "IT",
  italija: "IT",
  "ivory coast": "CI",
  "cote divoire": "CI",
  jamaica: "JM",
  japan: "JP",
  jordan: "JO",
  kazakhstan: "KZ",
  kenya: "KE",
  kosovo: "XK",
  kuwait: "KW",
  latvia: "LV",
  latvija: "LV",
  lebanon: "LB",
  libya: "LY",
  lithuania: "LT",
  litva: "LT",
  luxembourg: "LU",
  luksemburg: "LU",
  malaysia: "MY",
  malta: "MT",
  mexico: "MX",
  mexiko: "MX",
  moldova: "MD",
  monaco: "MC",
  montenegro: "ME",
  "crna gora": "ME",
  morocco: "MA",
  maroc: "MA",
  netherlands: "NL",
  holland: "NL",
  nederland: "NL",
  nizozemska: "NL",
  "new zealand": "NZ",
  nigeria: "NG",
  "north macedonia": "MK",
  macedonia: "MK",
  norway: "NO",
  norge: "NO",
  norveska: "NO",
  oman: "OM",
  pakistan: "PK",
  palestine: "PS",
  panama: "PA",
  paraguay: "PY",
  peru: "PE",
  philippines: "PH",
  poland: "PL",
  polska: "PL",
  poljska: "PL",
  portugal: "PT",
  qatar: "QA",
  romania: "RO",
  rumunjska: "RO",
  russia: "RU",
  rusija: "RU",
  "saudi arabia": "SA",
  scotland: "GB",
  senegal: "SN",
  serbia: "RS",
  srbija: "RS",
  singapore: "SG",
  slovakia: "SK",
  slovacka: "SK",
  slovenia: "SI",
  slovenija: "SI",
  "south africa": "ZA",
  "south korea": "KR",
  korea: "KR",
  spain: "ES",
  espana: "ES",
  espania: "ES",
  spanska: "ES",
  spanjolska: "ES",
  sweden: "SE",
  sverige: "SE",
  svedska: "SE",
  switzerland: "CH",
  schweiz: "CH",
  suisse: "CH",
  svizzera: "CH",
  svicarska: "CH",
  syria: "SY",
  taiwan: "TW",
  thailand: "TH",
  tunisia: "TN",
  turkey: "TR",
  turkiye: "TR",
  turkije: "TR",
  turska: "TR",
  ukraine: "UA",
  ukrajina: "UA",
  "united arab emirates": "AE",
  uae: "AE",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  britain: "GB",
  "velika britanija": "GB",
  "united states": "US",
  usa: "US",
  us: "US",
  uruguay: "UY",
  uzbekistan: "UZ",
  venezuela: "VE",
  vietnam: "VN",
  wales: "GB",
  yemen: "YE",
  zambia: "ZM",
};

/**
 * Resolves a free-text profile country (name or ISO code) to a flag emoji.
 * Returns null when country is missing or unrecognized — no placeholder.
 */
export function countryProfileToFlagEmoji(
  country: string | null | undefined,
): string | null {
  const raw = country?.trim();
  if (!raw) return null;

  if (/^[a-zA-Z]{2}$/.test(raw)) {
    return isoCountryCodeToFlagEmoji(raw);
  }

  const key = normalizeCountryKey(raw);
  const iso = COUNTRY_NAME_TO_ISO[key];
  if (iso) {
    return isoCountryCodeToFlagEmoji(iso);
  }

  return null;
}
