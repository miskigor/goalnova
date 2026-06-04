import type { VideoAnalysisProvider } from "./videoAnalysisProvider";
import type {
  CoreSkillScores,
  MetricAssessment,
  VisibilityAnalysisDraft,
  VisibilityAnalysisPayload,
  VideoAnalysisScores,
} from "./types";
import { overallFromAssessableMetrics } from "./visibilityAnalysis";

type SupportedLocale =
  | "en"
  | "hr"
  | "de"
  | "bs"
  | "es"
  | "pt"
  | "sr"
  | "fr"
  | "it"
  | "nl"
  | "tr"
  | "ar";

type LocaleCopy = {
  invalidReason: string;
  invalidFeedback: string;
  strictModeReason: string;
  strictModeFeedback: string;
  feedbackGeneric: string;
  recommendationPrefix: string;
  clipSummary: string;
  cameraNote: string;
  evidence: string;
  notAssessable: string;
};

const METRIC_LABELS: Record<SupportedLocale, Record<string, string>> = {
  en: {
    ball_control: "ball control",
    close_control: "close control",
    dribbling: "dribbling",
    acceleration: "acceleration",
    agility: "agility",
    first_touch: "first touch",
    passing: "passing",
    shooting: "shooting",
    finishing: "finishing",
    coordination: "coordination",
    balance: "balance",
    composure: "composure",
    defending: "defending",
    decision_making: "decision making",
  },
  hr: {
    ball_control: "kontrola lopte",
    close_control: "bliska kontrola",
    dribbling: "dribling",
    acceleration: "ubrzanje",
    agility: "agilnost",
    first_touch: "prvi dodir",
    passing: "dodavanje",
    shooting: "šut",
    finishing: "završnica",
    coordination: "koordinacija",
    balance: "ravnoteža",
    composure: "smirenost",
    defending: "obrana",
    decision_making: "donošenje odluka",
  },
  de: {
    ball_control: "Ballkontrolle",
    close_control: "enge Ballführung",
    dribbling: "Dribbling",
    acceleration: "Beschleunigung",
    agility: "Agilität",
    first_touch: "erster Kontakt",
    passing: "Passspiel",
    shooting: "Abschluss",
    finishing: "Torabschluss",
    coordination: "Koordination",
    balance: "Balance",
    composure: "Ruhe",
    defending: "Verteidigen",
    decision_making: "Entscheidungsfindung",
  },
  bs: {
    ball_control: "kontrola lopte",
    close_control: "bliska kontrola",
    dribbling: "dribling",
    acceleration: "ubrzanje",
    agility: "agilnost",
    first_touch: "prvi dodir",
    passing: "dodavanje",
    shooting: "šut",
    finishing: "završnica",
    coordination: "koordinacija",
    balance: "ravnoteža",
    composure: "smirenost",
    defending: "odbrana",
    decision_making: "donošenje odluka",
  },
  es: {
    ball_control: "control de balón",
    close_control: "control corto",
    dribbling: "regate",
    acceleration: "aceleración",
    agility: "agilidad",
    first_touch: "primer toque",
    passing: "pase",
    shooting: "tiro",
    finishing: "definición",
    coordination: "coordinación",
    balance: "equilibrio",
    composure: "templanza",
    defending: "defensa",
    decision_making: "toma de decisiones",
  },
  pt: {
    ball_control: "controlo de bola",
    close_control: "controlo curto",
    dribbling: "drible",
    acceleration: "aceleração",
    agility: "agilidade",
    first_touch: "primeiro toque",
    passing: "passe",
    shooting: "remate",
    finishing: "finalização",
    coordination: "coordenação",
    balance: "equilíbrio",
    composure: "compostura",
    defending: "defesa",
    decision_making: "tomada de decisão",
  },
  sr: {
    ball_control: "kontrola lopte",
    close_control: "bliska kontrola",
    dribbling: "dribling",
    acceleration: "ubrzanje",
    agility: "agilnost",
    first_touch: "prvi dodir",
    passing: "dodavanje",
    shooting: "šut",
    finishing: "završnica",
    coordination: "koordinacija",
    balance: "ravnoteža",
    composure: "smirenost",
    defending: "odbrana",
    decision_making: "donošenje odluka",
  },
  fr: {
    ball_control: "contrôle du ballon",
    close_control: "contrôle rapproché",
    dribbling: "dribble",
    acceleration: "accélération",
    agility: "agilité",
    first_touch: "première touche",
    passing: "passe",
    shooting: "tir",
    finishing: "finition",
    coordination: "coordination",
    balance: "équilibre",
    composure: "sang-froid",
    defending: "défense",
    decision_making: "prise de décision",
  },
  it: {
    ball_control: "controllo palla",
    close_control: "controllo stretto",
    dribbling: "dribbling",
    acceleration: "accelerazione",
    agility: "agilità",
    first_touch: "primo tocco",
    passing: "passaggio",
    shooting: "tiro",
    finishing: "finalizzazione",
    coordination: "coordinazione",
    balance: "equilibrio",
    composure: "freddezza",
    defending: "difesa",
    decision_making: "decision making",
  },
  nl: {
    ball_control: "balcontrole",
    close_control: "nauwe controle",
    dribbling: "dribbelen",
    acceleration: "acceleratie",
    agility: "wendbaarheid",
    first_touch: "eerste aanname",
    passing: "passen",
    shooting: "schieten",
    finishing: "afwerking",
    coordination: "coördinatie",
    balance: "balans",
    composure: "rust onder druk",
    defending: "verdedigen",
    decision_making: "besluitvorming",
  },
  tr: {
    ball_control: "top kontrolü",
    close_control: "yakın kontrol",
    dribbling: "dripling",
    acceleration: "hızlanma",
    agility: "çeviklik",
    first_touch: "ilk dokunuş",
    passing: "pas",
    shooting: "şut",
    finishing: "bitiricilik",
    coordination: "koordinasyon",
    balance: "denge",
    composure: "soğukkanlılık",
    defending: "savunma",
    decision_making: "karar verme",
  },
  ar: {
    ball_control: "التحكم بالكرة",
    close_control: "التحكم القريب",
    dribbling: "المراوغة",
    acceleration: "التسارع",
    agility: "الرشاقة",
    first_touch: "اللمسة الأولى",
    passing: "التمرير",
    shooting: "التسديد",
    finishing: "الإنهاء",
    coordination: "التناسق",
    balance: "التوازن",
    composure: "الهدوء",
    defending: "الدفاع",
    decision_making: "اتخاذ القرار",
  },
};

const LOCALIZED_COPY: Record<SupportedLocale, LocaleCopy> = {
  en: {
    invalidReason:
      "No football action detected — the footage does not clearly show a ball, pitch, or football-specific movement.",
    invalidFeedback:
      "PitchRusch only scores football highlights. This clip appears to be non-football content (or the camera never shows enough football context). Upload a clip where both the player and the ball are clearly visible in a football setting.",
    strictModeReason:
      "Precision mode is active: demo AI scoring is disabled to avoid unreliable football metrics.",
    strictModeFeedback:
      "Demo scoring is turned off in precision mode. Connect a production vision model to analyze player, ball, and movement accurately.",
    feedbackGeneric:
      "This score is based only on clearly visible football actions in the clip. Hidden or unclear moments are marked as not assessable.",
    recommendationPrefix: "Recommended focus areas:",
    clipSummary:
      "Football actions are visible in this clip and were assessed only where evidence is clear.",
    cameraNote:
      "Camera quality and angle affect confidence; unclear moments are not scored.",
    evidence: "Visible football action in this clip supports this score.",
    notAssessable: "This action is not clearly visible enough in this clip.",
  },
  hr: {
    invalidReason:
      "Nije prepoznata nogometna akcija — snimka ne prikazuje jasno loptu, teren ili nogometni pokret.",
    invalidFeedback:
      "PitchRusch ocjenjuje samo nogometne isječke. Ovaj video izgleda kao sadržaj koji nije nogomet (ili nema dovoljno jasnog nogometnog konteksta). Učitajte isječak gdje su igrač i lopta jasno vidljivi.",
    strictModeReason:
      "Aktivan je precizni način rada: demo AI ocjenjivanje je isključeno kako bi se izbjegle nepouzdane nogometne metrike.",
    strictModeFeedback:
      "Demo ocjenjivanje je isključeno u preciznom načinu rada. Povežite produkcijski vision model za točnu analizu igrača, lopte i kretanja.",
    feedbackGeneric:
      "Ocjena je temeljena samo na jasno vidljivim nogometnim akcijama u isječku. Nejasni trenuci označeni su kao neocjenjivi.",
    recommendationPrefix: "Preporučeni fokus za napredak:",
    clipSummary:
      "Nogometne akcije su vidljive i ocijenjene samo gdje postoji jasan dokaz.",
    cameraNote:
      "Kvaliteta i kut kamere utječu na pouzdanost; nejasni dijelovi se ne ocjenjuju.",
    evidence: "Jasno vidljiva nogometna akcija podupire ovu ocjenu.",
    notAssessable: "Ova akcija nije dovoljno jasno vidljiva u ovom isječku.",
  },
  de: {
    invalidReason:
      "Keine klare Fußballaktion erkannt — im Video sind Ball, Platz oder fußballspezifische Bewegung nicht eindeutig sichtbar.",
    invalidFeedback:
      "PitchRusch bewertet nur Fußball-Highlights. Dieser Clip wirkt nicht wie Fußballinhalt (oder zeigt zu wenig klaren Fußballkontext). Lade einen Clip hoch, in dem Spieler und Ball klar sichtbar sind.",
    strictModeReason:
      "Präzisionsmodus aktiv: Demo-KI-Bewertung ist deaktiviert, um unzuverlässige Fußballmetriken zu vermeiden.",
    strictModeFeedback:
      "Demo-Bewertung ist im Präzisionsmodus deaktiviert. Verbinde ein produktives Vision-Modell für eine präzise Analyse von Spieler, Ball und Bewegungen.",
    feedbackGeneric:
      "Diese Bewertung basiert nur auf klar sichtbaren Fußballaktionen im Clip. Unklare Szenen werden als nicht bewertbar markiert.",
    recommendationPrefix: "Empfohlene Schwerpunkte:",
    clipSummary:
      "Fußballaktionen sind sichtbar und wurden nur bei klarer Evidenz bewertet.",
    cameraNote:
      "Kameraqualität und Perspektive beeinflussen die Sicherheit; unklare Momente werden nicht bewertet.",
    evidence: "Sichtbare Fußballaktion im Clip stützt diese Bewertung.",
    notAssessable: "Diese Aktion ist in diesem Clip nicht klar genug sichtbar.",
  },
  bs: {
    invalidReason:
      "Nije otkrivena nogometna akcija — snimak ne prikazuje jasno loptu, teren ili nogometno kretanje.",
    invalidFeedback:
      "PitchRusch ocjenjuje samo nogometne highlighte. Ovaj klip izgleda kao sadržaj koji nije nogomet (ili nema dovoljno jasnog nogometnog konteksta). Učitaj klip gdje su igrač i lopta jasno vidljivi.",
    strictModeReason:
      "Aktivan je precizni režim: demo AI ocjenjivanje je isključeno da bi se izbjegle nepouzdane metrike.",
    strictModeFeedback:
      "Demo ocjenjivanje je isključeno u preciznom režimu. Poveži produkcijski vision model za tačnu analizu igrača, lopte i kretanja.",
    feedbackGeneric:
      "Ocjena je zasnovana samo na jasno vidljivim nogometnim akcijama u klipu. Nejasni momenti su označeni kao neocjenjivi.",
    recommendationPrefix: "Preporučeni fokus:",
    clipSummary:
      "Nogometne akcije su vidljive i ocijenjene samo kada postoji jasan dokaz.",
    cameraNote:
      "Kvalitet i ugao kamere utiču na pouzdanost; nejasni dijelovi se ne ocjenjuju.",
    evidence: "Jasno vidljiva nogometna akcija podržava ovu ocjenu.",
    notAssessable: "Ova akcija nije dovoljno jasno vidljiva u ovom klipu.",
  },
  es: {
    invalidReason:
      "No se detectó una acción de fútbol clara: el video no muestra claramente balón, campo o movimiento específico de fútbol.",
    invalidFeedback:
      "PitchRusch solo puntúa highlights de fútbol. Este clip parece no ser contenido de fútbol (o no muestra contexto suficiente). Sube un clip donde jugador y balón se vean claramente.",
    strictModeReason:
      "Modo de precisión activo: la puntuación demo de IA está desactivada para evitar métricas poco fiables.",
    strictModeFeedback:
      "La puntuación demo está desactivada en modo de precisión. Conecta un modelo de visión en producción para analizar jugador, balón y movimientos con precisión.",
    feedbackGeneric:
      "Esta puntuación se basa solo en acciones de fútbol claramente visibles en el clip. Los momentos no claros se marcan como no evaluables.",
    recommendationPrefix: "Áreas recomendadas para mejorar:",
    clipSummary:
      "Hay acciones de fútbol visibles y se evaluaron solo donde la evidencia es clara.",
    cameraNote:
      "La calidad y el ángulo de cámara afectan la confianza; los momentos poco claros no se puntúan.",
    evidence: "La acción de fútbol visible en el clip respalda esta puntuación.",
    notAssessable: "Esta acción no se ve con suficiente claridad en este clip.",
  },
  pt: {
    invalidReason:
      "Nenhuma ação de futebol foi detetada com clareza — o vídeo não mostra claramente bola, campo ou movimento específico de futebol.",
    invalidFeedback:
      "O PitchRusch só avalia destaques de futebol. Este clipe parece não ser conteúdo de futebol (ou não mostra contexto suficiente). Carregue um clipe em que jogador e bola estejam claramente visíveis.",
    strictModeReason:
      "Modo de precisão ativo: a pontuação demo de IA está desativada para evitar métricas pouco fiáveis.",
    strictModeFeedback:
      "A pontuação demo está desativada no modo de precisão. Ligue um modelo de visão em produção para analisar jogador, bola e movimentos com precisão.",
    feedbackGeneric:
      "Esta pontuação baseia-se apenas em ações de futebol claramente visíveis no clipe. Momentos pouco claros são marcados como não avaliáveis.",
    recommendationPrefix: "Focos recomendados:",
    clipSummary:
      "Há ações de futebol visíveis e a avaliação foi feita apenas onde há evidência clara.",
    cameraNote:
      "A qualidade e o ângulo da câmara afetam a confiança; momentos pouco claros não são pontuados.",
    evidence: "A ação de futebol visível no clipe sustenta esta pontuação.",
    notAssessable: "Esta ação não está suficientemente visível neste clipe.",
  },
  sr: {
    invalidReason:
      "Nije detektovana jasna fudbalska akcija — snimak ne prikazuje jasno loptu, teren ili fudbalsko kretanje.",
    invalidFeedback:
      "PitchRusch ocenjuje samo fudbalske highlight snimke. Ovaj klip deluje kao sadržaj koji nije fudbal (ili nema dovoljno jasnog konteksta). Otpremi klip gde su igrač i lopta jasno vidljivi.",
    strictModeReason:
      "Aktivan je precizan režim: demo AI ocenjivanje je isključeno da bi se izbegle nepouzdane metrike.",
    strictModeFeedback:
      "Demo ocenjivanje je isključeno u preciznom režimu. Poveži produkcioni vision model za tačnu analizu igrača, lopte i kretanja.",
    feedbackGeneric:
      "Ocena je zasnovana samo na jasno vidljivim fudbalskim akcijama u klipu. Nejasni momenti su označeni kao neocenjivi.",
    recommendationPrefix: "Preporučeni fokus:",
    clipSummary:
      "Fudbalske akcije su vidljive i ocenjene samo gde postoji jasan dokaz.",
    cameraNote:
      "Kvalitet i ugao kamere utiču na pouzdanost; nejasni delovi se ne ocenjuju.",
    evidence: "Jasno vidljiva fudbalska akcija podržava ovu ocenu.",
    notAssessable: "Ova akcija nije dovoljno jasno vidljiva u ovom klipu.",
  },
  fr: {
    invalidReason:
      "Aucune action de football claire détectée : la vidéo ne montre pas clairement le ballon, le terrain ou un mouvement spécifique au football.",
    invalidFeedback:
      "PitchRusch évalue uniquement des highlights de football. Ce clip semble ne pas être du contenu football (ou manque de contexte clair). Importez un clip où le joueur et le ballon sont clairement visibles.",
    strictModeReason:
      "Mode précision actif : le scoring IA de démonstration est désactivé pour éviter des métriques peu fiables.",
    strictModeFeedback:
      "Le scoring démo est désactivé en mode précision. Connectez un modèle de vision en production pour analyser précisément joueur, ballon et mouvements.",
    feedbackGeneric:
      "Cette note est basée uniquement sur les actions de football clairement visibles dans le clip. Les moments incertains sont marqués comme non évaluables.",
    recommendationPrefix: "Axes de progression recommandés :",
    clipSummary:
      "Des actions de football sont visibles et évaluées uniquement quand la preuve est claire.",
    cameraNote:
      "La qualité et l’angle de caméra influencent la confiance ; les moments flous ne sont pas notés.",
    evidence: "Une action de football visible dans le clip justifie cette note.",
    notAssessable: "Cette action n’est pas suffisamment visible dans ce clip.",
  },
  it: {
    invalidReason:
      "Nessuna azione calcistica chiara rilevata: il video non mostra chiaramente palla, campo o movimento tipico del calcio.",
    invalidFeedback:
      "PitchRusch valuta solo highlight calcistici. Questo clip sembra non essere contenuto calcistico (o manca contesto chiaro). Carica un clip in cui giocatore e palla siano chiaramente visibili.",
    strictModeReason:
      "Modalità precisione attiva: il punteggio demo AI è disattivato per evitare metriche non affidabili.",
    strictModeFeedback:
      "Il punteggio demo è disattivato in modalità precisione. Collega un modello vision in produzione per analizzare con precisione giocatore, palla e movimenti.",
    feedbackGeneric:
      "Questo punteggio si basa solo su azioni calcistiche chiaramente visibili nel clip. I momenti non chiari sono segnati come non valutabili.",
    recommendationPrefix: "Aree consigliate su cui lavorare:",
    clipSummary:
      "Sono visibili azioni calcistiche e la valutazione è fatta solo dove l’evidenza è chiara.",
    cameraNote:
      "Qualità e angolo della camera influenzano la confidenza; i momenti poco chiari non vengono valutati.",
    evidence: "L’azione calcistica visibile nel clip supporta questo punteggio.",
    notAssessable: "Questa azione non è abbastanza visibile in questo clip.",
  },
  nl: {
    invalidReason:
      "Geen duidelijke voetbalactie gedetecteerd: de video toont geen bal, veld of voetbalspecifieke beweging duidelijk genoeg.",
    invalidFeedback:
      "PitchRusch beoordeelt alleen voetbalhighlights. Deze clip lijkt geen voetbalcontent te zijn (of mist duidelijke context). Upload een clip waarin speler en bal duidelijk zichtbaar zijn.",
    strictModeReason:
      "Precisie-modus actief: demo AI-score is uitgeschakeld om onbetrouwbare metrieken te vermijden.",
    strictModeFeedback:
      "Demo-score staat uit in precisie-modus. Koppel een productie vision-model om speler, bal en bewegingen nauwkeurig te analyseren.",
    feedbackGeneric:
      "Deze score is alleen gebaseerd op duidelijk zichtbare voetbalacties in de clip. Onduidelijke momenten zijn gemarkeerd als niet beoordeelbaar.",
    recommendationPrefix: "Aanbevolen focuspunten:",
    clipSummary:
      "Voetbalacties zijn zichtbaar en alleen beoordeeld waar het bewijs duidelijk is.",
    cameraNote:
      "Camerakwaliteit en hoek beïnvloeden de betrouwbaarheid; onduidelijke momenten worden niet gescoord.",
    evidence: "Zichtbare voetbalactie in de clip ondersteunt deze score.",
    notAssessable: "Deze actie is niet duidelijk genoeg zichtbaar in deze clip.",
  },
  tr: {
    invalidReason:
      "Net bir futbol aksiyonu tespit edilemedi; görüntüde top, saha veya futbola özgü hareketler yeterince açık değil.",
    invalidFeedback:
      "PitchRusch yalnızca futbol özetlerini puanlar. Bu klip futbol içeriği gibi görünmüyor (veya yeterli futbol bağlamı yok). Oyuncu ve topun net göründüğü bir klip yükleyin.",
    strictModeReason:
      "Hassas mod aktif: güvenilir olmayan metrikleri önlemek için demo AI puanlama kapatıldı.",
    strictModeFeedback:
      "Demo puanlama hassas modda kapalı. Oyuncu, top ve hareketleri doğru analiz etmek için üretim vision modeli bağlayın.",
    feedbackGeneric:
      "Bu puan sadece klipte açıkça görülen futbol aksiyonlarına dayanır. Belirsiz anlar değerlendirilemez olarak işaretlenir.",
    recommendationPrefix: "Önerilen gelişim odakları:",
    clipSummary:
      "Klipte futbol aksiyonları görülüyor ve sadece açık kanıt olan kısımlar değerlendirildi.",
    cameraNote:
      "Kamera kalitesi ve açı güveni etkiler; belirsiz anlar puanlanmaz.",
    evidence: "Klipte görülen futbol aksiyonu bu puanı destekliyor.",
    notAssessable: "Bu aksiyon bu klipte yeterince net görünmüyor.",
  },
  ar: {
    invalidReason:
      "لم يتم اكتشاف لقطة كرة قدم واضحة؛ الفيديو لا يُظهر الكرة أو الملعب أو حركة كروية بشكل كافٍ.",
    invalidFeedback:
      "PitchRusch يقيّم فقط لقطات كرة القدم. هذا المقطع يبدو غير متعلق بكرة القدم (أو لا يحتوي سياقًا واضحًا). ارفع مقطعًا يظهر فيه اللاعب والكرة بوضوح.",
    strictModeReason:
      "وضع الدقة مفعّل: تم إيقاف التقييم التجريبي للذكاء الاصطناعي لتجنب مقاييس غير موثوقة.",
    strictModeFeedback:
      "التقييم التجريبي متوقف في وضع الدقة. اربط نموذج رؤية إنتاجي لتحليل اللاعب والكرة والحركة بدقة.",
    feedbackGeneric:
      "هذه الدرجة مبنية فقط على اللقطات الكروية الواضحة في الفيديو. اللحظات غير الواضحة تُصنّف كغير قابلة للتقييم.",
    recommendationPrefix: "نقاط التركيز المقترحة:",
    clipSummary:
      "تظهر لقطات كرة قدم في هذا المقطع وتم تقييم ما لديه دليل واضح فقط.",
    cameraNote:
      "جودة وزاوية الكاميرا تؤثران على الثقة؛ اللحظات غير الواضحة لا يتم تقييمها.",
    evidence: "اللقطة الكروية الظاهرة في الفيديو تدعم هذه الدرجة.",
    notAssessable: "هذه اللقطة غير واضحة بما يكفي للتقييم في هذا الفيديو.",
  },
};

function normalizeLocale(locale?: string): SupportedLocale {
  const base = String(locale ?? "en").toLowerCase().split("-")[0];
  if (base in LOCALIZED_COPY) return base as SupportedLocale;
  return "en";
}

function formatMetricLabel(locale: SupportedLocale, key: string): string {
  return METRIC_LABELS[locale]?.[key] ?? key.replace(/_/g, " ");
}

function localizeVisibilityPayload(
  payload: VisibilityAnalysisPayload,
  copy: LocaleCopy,
): VisibilityAnalysisPayload {
  const metrics = Object.fromEntries(
    Object.entries(payload.metrics).map(([k, v]) => {
      if (!v) return [k, v];
      if (v.status === "assessable") {
        return [k, { ...v, evidence: copy.evidence }];
      }
      return [k, { ...v, reason: copy.notAssessable }];
    }),
  ) as VisibilityAnalysisPayload["metrics"];

  return {
    ...payload,
    clip_summary: copy.clipSummary,
    camera: { ...payload.camera, assessment_note: copy.cameraNote },
    metrics,
  };
}

function hashToUnit(input: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(31, h) + input.charCodeAt(i);
  }
  return Math.abs(h % 1000) / 1000;
}

function scoreInRange(input: string, salt: number, min = 58, max = 92): number {
  const u = hashToUnit(input, salt);
  return Math.round(min + u * (max - min));
}

function confInRange(input: string, salt: number, min = 0.42, max = 0.92): number {
  const u = hashToUnit(input, salt);
  return Math.round((min + u * (max - min)) * 100) / 100;
}

function na(reason: string): MetricAssessment {
  return { status: "not_assessable", reason };
}

function ok(
  input: string,
  salt: number,
  evidence: string,
): MetricAssessment {
  return {
    status: "assessable",
    score: scoreInRange(input, salt),
    confidence: confInRange(input, salt + 20),
    evidence,
  };
}

/**
 * Deterministic visibility-first mock: clip understanding varies by `videoId`;
 * only visible/relevant metrics receive scores.
 */
export const mockVideoAnalysisProvider: VideoAnalysisProvider = {
  async analyzeVideo({ videoId, locale }) {
    await new Promise((r) => setTimeout(r, 900));
    const copy = LOCALIZED_COPY[normalizeLocale(locale)];
    const demoScoringEnabled =
      process.env.NEXT_PUBLIC_ALLOW_DEMO_AI_SCORING === "true";

    if (!demoScoringEnabled) {
      return {
        valid_for_football_analysis: false,
        clip_type: "unclear",
        invalid_reason: copy.strictModeReason,
        overall_score: 0,
        overall_confidence: 0,
        feedback_text: copy.strictModeFeedback,
        visibility_analysis: null,
        legacy: null,
        v2: null,
      };
    }

    const scenario = Math.floor(hashToUnit(videoId, 0) * 8);

    if (scenario === 7) {
      const invalid: VideoAnalysisScores = {
        valid_for_football_analysis: false,
        clip_type: "non_football",
        invalid_reason: copy.invalidReason,
        overall_score: 0,
        overall_confidence: 0,
        feedback_text: copy.invalidFeedback,
        visibility_analysis: null,
        legacy: null,
        v2: null,
      };
      return invalid;
    }

    let draft: VisibilityAnalysisDraft;

    switch (scenario) {
      case 0: {
        draft = {
          schema_version: 1,
          clip_type: "training_drill",
          clip_summary:
            "Close-up footwork in a cone grid: repeated tight touches and changes of direction with the ball staying under control.",
          visible_actions: [
            "close_control",
            "dribbling",
            "ball_control",
            "training_drill",
          ],
          camera: {
            quality: "adequate",
            assessment_note:
              "The framing stays on feet and ball, which supports judging touches; upper-body and wider pitch context are mostly out of frame.",
          },
          metrics: {
            ball_control: ok(
              videoId,
              1,
              "Touches stay close to the foot through the turns shown in the clip.",
            ),
            close_control: ok(
              videoId,
              2,
              "Direction changes are executed without the ball running away in the visible sequence.",
            ),
            dribbling: ok(
              videoId,
              3,
              "Short bursts with the ball stay under the player in the drill pattern.",
            ),
            agility: ok(
              videoId,
              4,
              "Quick lateral shifts between cones are visible and look coordinated.",
            ),
            shooting: na("No strike or goal attempt appears in this footage."),
            passing: na("No pass to a teammate is visible."),
            finishing: na("No shot on goal or end product is shown."),
            decision_making: na(
              "No match context or passing options are visible to judge choices.",
            ),
            defending: na("No defending duel or recovery run appears."),
            acceleration: na(
              "Only short drill steps are visible, not an open-field sprint.",
            ),
            first_touch: na(
              "The clip does not show receiving a pass; touches are already in possession.",
            ),
            coordination: ok(
              videoId,
              5,
              "Foot rhythm matches the cone pattern in what we can see.",
            ),
            balance: ok(
              videoId,
              6,
              "The player stays upright through the cuts shown.",
            ),
            composure: na(
              "Pressure from opponents is not visible, so composure under challenge cannot be scored.",
            ),
          },
        };
        break;
      }
      case 1: {
        draft = {
          schema_version: 1,
          clip_type: "match_play",
          clip_summary:
            "Wide-angle match moment: player receives and drives forward, then a shot toward goal from outside the box.",
          visible_actions: [
            "match_play",
            "first_touch",
            "dribbling",
            "shooting",
            "acceleration",
          ],
          camera: {
            quality: "strong",
            assessment_note:
              "Wide shot shows approach and strike; some detail of foot placement at contact is limited by distance.",
          },
          metrics: {
            first_touch: ok(
              videoId,
              11,
              "First touch moves the ball into the run visible right after receipt.",
            ),
            dribbling: ok(
              videoId,
              12,
              "A short carry under pressure is visible before the strike.",
            ),
            acceleration: ok(
              videoId,
              13,
              "The player clearly accelerates into space in the clip.",
            ),
            shooting: ok(
              videoId,
              14,
              "A shot from range is visible; contact and ball flight can be partially judged.",
            ),
            finishing: ok(
              videoId,
              15,
              "End product (shot) is in frame; outcome vs keeper is only partly visible.",
            ),
            decision_making: ok(
              videoId,
              16,
              "Choosing to drive and shoot from this position is observable in the sequence.",
            ),
            agility: ok(
              videoId,
              17,
              "Sharp adjustment before the shot is visible.",
            ),
            ball_control: ok(
              videoId,
              18,
              "The ball stays in play through the carry shown.",
            ),
            passing: na("No pass is selected in the highlighted sequence."),
            defending: na("The player is in possession; no defending action to score."),
            close_control: na(
              "Emphasis is on line and shot, not sustained tight dribble in a grid.",
            ),
            coordination: ok(
              videoId,
              19,
              "Approach steps and strike timing appear linked in what we see.",
            ),
            balance: ok(
              videoId,
              20,
              "The player stays balanced through the shot motion visible.",
            ),
            composure: ok(
              videoId,
              21,
              "Execution under opponent proximity (visible) supports a composure read.",
            ),
          },
        };
        break;
      }
      case 2: {
        draft = {
          schema_version: 1,
          clip_type: "goalkeeper_training",
          clip_summary:
            "Keeper angle: diving save to the side after a shot from inside the area.",
          visible_actions: ["goalkeeper_action", "match_play", "shooting"],
          camera: {
            quality: "adequate",
            assessment_note:
              "Focus is on the keeper; the shooter is partly in frame. Outfield footwork detail is limited.",
          },
          metrics: {
            agility: ok(
              videoId,
              31,
              "Explosive dive and extension are visible.",
            ),
            coordination: ok(
              videoId,
              32,
              "Dive and hand contact with the ball line up in the clip.",
            ),
            balance: ok(
              videoId,
              33,
              "Landing and recovery from the dive are partly visible.",
            ),
            composure: na(
              "Keeper decision-making is partly inferable but not fully visible (distribution after save is cut).",
            ),
            shooting: na(
              "Strike mechanics belong to the shooter; this angle prioritizes the save.",
            ),
            finishing: na("Not scored from this keeper-centric framing."),
            passing: na("No passing action visible for the outfield player here."),
            dribbling: na("No dribble sequence for the keeper save clip."),
            ball_control: na("Outfield control is not the focus of this footage."),
            close_control: na("Not applicable to the save action shown."),
            first_touch: na("No reception focus in this clip."),
            acceleration: na("Short dive burst only; not a field sprint."),
            defending: na("No outfield defending duel."),
            decision_making: na(
              "Limited view of options before the shot limits decision scoring.",
            ),
          },
        };
        break;
      }
      case 3: {
        draft = {
          schema_version: 1,
          clip_type: "static_skills",
          clip_summary:
            "Juggling and aerial touches in place; no defenders or goal in view.",
          visible_actions: ["juggling", "ball_control", "coordination"],
          camera: {
            quality: "limited",
            assessment_note:
              "Single fixed angle and occasional blur reduce confidence on fine touch quality.",
          },
          metrics: {
            ball_control: ok(
              videoId,
              41,
              "Rhythm of touches while juggling is visible despite average clarity.",
            ),
            coordination: ok(
              videoId,
              42,
              "Repeated contacts show timing between foot and ball.",
            ),
            balance: ok(
              videoId,
              43,
              "The player stays centered through the juggling sequence shown.",
            ),
            composure: na("No pressure or game context appears."),
            dribbling: na("No ground dribble against space or opponents."),
            passing: na("No passes."),
            shooting: na("No strike."),
            finishing: na("No attempt on goal."),
            defending: na("No defending."),
            decision_making: na("No tactical choices visible."),
            acceleration: na("On-the-spot work only."),
            agility: na("Small hops only; not enough for a full agility read."),
            first_touch: na("Throws from hands / juggle, not a typical first touch reception."),
            close_control: ok(
              videoId,
              44,
              "Keeps the ball within a small vertical window in the frames we have.",
            ),
          },
        };
        break;
      }
      case 4: {
        draft = {
          schema_version: 1,
          clip_type: "one_v_one",
          clip_summary:
            "1v1 in a wide channel: attacker feints past a defender, then crosses.",
          visible_actions: [
            "one_v_one",
            "dribbling",
            "defending",
            "passing",
            "match_play",
          ],
          camera: {
            quality: "strong",
            assessment_note:
              "Both players and the ball stay in frame for the duel.",
          },
          metrics: {
            dribbling: ok(
              videoId,
              51,
              "Feint and lateral exit from the defender are visible.",
            ),
            agility: ok(
              videoId,
              52,
              "Sharp change of direction to beat the defender is clear.",
            ),
            defending: ok(
              videoId,
              53,
              "Defender stance and attempted tackle timing are visible.",
            ),
            passing: ok(
              videoId,
              54,
              "The cross after the beat is in frame.",
            ),
            decision_making: ok(
              videoId,
              55,
              "Choice to go outside then cross is observable.",
            ),
            ball_control: ok(
              videoId,
              56,
              "Ball stays under the attacker through the 1v1.",
            ),
            close_control: ok(
              videoId,
              57,
              "Touch tightness in the duel area is visible.",
            ),
            shooting: na("The player crosses instead of shooting in this clip."),
            finishing: na("No shot on goal in the sequence."),
            first_touch: na(
              "Clip starts mid-duel; reception before that is not shown.",
            ),
            acceleration: ok(
              videoId,
              58,
              "Burst past the defender is visible.",
            ),
            balance: ok(
              videoId,
              59,
              "Contact from the defender is partly visible; balance through it can be partially judged.",
            ),
            composure: ok(
              videoId,
              60,
              "Execution in a live duel supports a composure read.",
            ),
            coordination: ok(
              videoId,
              61,
              "Footwork and upper body work together in the feint.",
            ),
          },
        };
        break;
      }
      case 5: {
        draft = {
          schema_version: 1,
          clip_type: "sprint_highlight",
          clip_summary:
            "Long lens: player sprinting off the ball into space; ball is often small in frame.",
          visible_actions: ["sprinting", "match_play"],
          camera: {
            quality: "limited",
            assessment_note:
              "Distance and motion are clear; ball proximity and foot detail are often hard to verify.",
          },
          metrics: {
            acceleration: ok(
              videoId,
              71,
              "Clear increase in speed over several strides is visible.",
            ),
            agility: na(
              "Mostly straight-line work; lateral agility is not really shown.",
            ),
            ball_control: na(
              "Ball is too small or off-frame too often for a fair control score.",
            ),
            dribbling: na("No sustained on-ball sequence in clear view."),
            passing: na("No pass in the highlighted sprint."),
            shooting: na("No shot."),
            finishing: na("No attempt."),
            defending: na("No defending action."),
            decision_making: na(
              "Run without visible passing options limits decision scoring.",
            ),
            first_touch: na("No reception in clip."),
            close_control: na("Not visible at this zoom."),
            coordination: ok(
              videoId,
              72,
              "Arm drive and stride rhythm are visible for a coordination note.",
            ),
            balance: ok(
              videoId,
              73,
              "Straight-line sprint posture is visible.",
            ),
            composure: na("No on-ball pressure moment to judge."),
          },
        };
        break;
      }
      default: {
        draft = {
          schema_version: 1,
          clip_type: "passing_drill",
          clip_summary:
            "Quick wall passes and one-twos in a small box; emphasis on weight and angle.",
          visible_actions: ["passing", "first_touch", "ball_control", "training_drill"],
          camera: {
            quality: "adequate",
            assessment_note:
              "Medium shot shows passes and receptions; full body mechanics are partly cropped.",
          },
          metrics: {
            passing: ok(
              videoId,
              81,
              "Pass weight into the partner’s path is visible in the exchanges.",
            ),
            first_touch: ok(
              videoId,
              82,
              "Touches to set the next pass are visible in the drill.",
            ),
            ball_control: ok(
              videoId,
              83,
              "The ball is managed quickly between passes in frame.",
            ),
            decision_making: na(
              "Drill is structured; match-like decisions are not really visible.",
            ),
            shooting: na("No shot."),
            finishing: na("No goal attempt."),
            defending: na("No defenders."),
            dribbling: na("Very short carries only; not a dribbling showcase."),
            acceleration: na("Small-area tempo only."),
            agility: ok(
              videoId,
              84,
              "Quick shifts to receive are partly visible.",
            ),
            close_control: ok(
              videoId,
              85,
              "Touches stay tight in the box drill.",
            ),
            coordination: ok(
              videoId,
              86,
              "Foot and pass timing line up in what we see.",
            ),
            balance: ok(
              videoId,
              87,
              "Stable through quick exchanges in frame.",
            ),
            composure: na("Opponent pressure is absent in the drill view."),
          },
        };
      }
    }

    const { overall_score, overall_confidence } = overallFromAssessableMetrics(
      draft.metrics,
    );

    const payload: VisibilityAnalysisPayload = {
      ...draft,
      overall_confidence,
    };
    const localizedPayload = localizeVisibilityPayload(payload, copy);

    const weakest = Object.entries(localizedPayload.metrics)
      .filter(([, value]) => value?.status === "assessable")
      .map(([key, value]) => ({ key, score: (value as MetricAssessment & { score: number }).score }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((entry) => formatMetricLabel(normalizeLocale(locale), entry.key));
    const recText =
      weakest.length > 0
        ? ` ${copy.recommendationPrefix} ${weakest.join(", ")}.`
        : "";

    const assessedEntries = Object.entries(localizedPayload.metrics).filter(
      ([, value]) => value?.status === "assessable",
    ) as [string, Extract<MetricAssessment, { status: "assessable" }>][];
    const top =
      assessedEntries.sort((a, b) => b[1].score - a[1].score)[0]?.[0] ??
      "ball_control";
    const scores: CoreSkillScores = {
      speed:
        localizedPayload.metrics.acceleration?.status === "assessable"
          ? localizedPayload.metrics.acceleration.score
          : null,
      technique:
        localizedPayload.metrics.coordination?.status === "assessable"
          ? localizedPayload.metrics.coordination.score
          : null,
      ball_control:
        localizedPayload.metrics.ball_control?.status === "assessable"
          ? localizedPayload.metrics.ball_control.score
          : null,
      agility:
        localizedPayload.metrics.agility?.status === "assessable"
          ? localizedPayload.metrics.agility.score
          : null,
      shooting:
        localizedPayload.metrics.shooting?.status === "assessable"
          ? localizedPayload.metrics.shooting.score
          : null,
      passing:
        localizedPayload.metrics.passing?.status === "assessable"
          ? localizedPayload.metrics.passing.score
          : null,
      decision_making:
        localizedPayload.metrics.decision_making?.status === "assessable"
          ? localizedPayload.metrics.decision_making.score
          : null,
      creativity:
        localizedPayload.metrics.dribbling?.status === "assessable"
          ? localizedPayload.metrics.dribbling.score
          : null,
    };

    const result: VideoAnalysisScores = {
      valid_for_football_analysis: true,
      clip_type: draft.clip_type,
      invalid_reason: null,
      overall_score,
      overall_confidence,
      feedback_text: `${copy.feedbackGeneric}${recText}`.trim(),
      visibility_analysis: localizedPayload,
      legacy: null,
      v2: {
        confidence: Math.round(overall_confidence * 100),
        scores,
        strengths: [formatMetricLabel(normalizeLocale(locale), top)],
        improvements: weakest.length
          ? [
              `${copy.recommendationPrefix.replace(/:$/, "")} ${weakest[0]}.`,
            ]
          : ["Film a clearer full-action rep to unlock sharper tips."],
        badges: ["Fast Feet"],
        coach_feedback: localizedPayload.clip_summary,
        player_friendly_summary:
          "Strong clip — keep training with the same energy and upload your next highlight.",
      },
    };
    return result;
  },
};
