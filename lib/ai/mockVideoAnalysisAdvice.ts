/** Per-video / per-metric demo advice (mock AI only). */

export type AdviceLocale =
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

export type WeakestMetric = { key: string; label: string; score: number };

export function pickFrom<T>(items: T[], videoId: string, salt: number): T {
  if (items.length === 0) throw new Error("pickFrom: empty pool");
  const idx = Math.floor(hashToUnit(videoId, salt) * items.length);
  return items[Math.min(items.length - 1, idx)]!;
}

function hashToUnit(input: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(31, h) + input.charCodeAt(i);
  }
  return Math.abs(h % 1000) / 1000;
}

const CLIP_SUMMARY_HR: Record<string, string> = {
  training_drill:
    "Krupni plan stopala u vježbi sa stožcima: čvrsti dodiri i promjene smjera uz kontrolu lopte.",
  match_play:
    "Isječak iz utakmice: kretanje igrača s loptom u kontaktu s prostorom oko sebe.",
  goalkeeper_training:
    "Vratarska vježba: reakcija, postavljanje i dodiri s loptom u kratkom kadru.",
  static_skills:
    "Statična vještina s loptom: ponavljanje dodira i koordinacije na malom prostoru.",
  one_v_one:
    "Duel 1v1: pokušaj driblinga, promjena smjera i odluka nakon pobjede u duelu.",
  sprint_highlight:
    "Sprint bez lopte u kadru: ubrzanje i tranzicija u prostor.",
  passing_drill:
    "Brze kombinacije u boxu: dodavanje, prvi dodir i tempo između partnera.",
  shooting_at_goal:
    "Trening pred golom: igrač napreduje s loptom, branič ili vratnik u kadru, udarac prema mreži.",
};

const DRILL_TIPS_HR: Record<string, string[]> = {
  ball_control: [
    "U ovom klipu {metric} je najslabija točka. Sljedeći trening: kvadrat 4×4 m — 12 dodira unutra-vani bez zaustavljanja lopte (3 serije, odmor 45 s).",
    "Za {metric}: vježba „osmica“ oko dva stožca — 6 minuta, smanji dodir na svakom krugu. Cilj je tiha lopta blizu stopala.",
    "{metric} traži više pažnje. 3×2 min jonglering + odmah nakon toga 10 dodira u trku kroz mini slalom.",
  ],
  close_control: [
    "{metric} je ovdje limitirajući faktor. Radi „toe-taps“ 30 s + odmah 8 promjena smjera uz stožac (4 serije).",
    "Fokus na {metric}: uži kanal od 3 stožca, prolazak samo vanjskom stranom stopala (3×6 prolaza).",
  ],
  dribbling: [
    "{metric} može bolje. 1v1 protiv konusa: feint lijevo-desno pa eksplozija (8 pokušaja po strani).",
    "Za jači {metric}: „inside-outside“ dribling 15 m × 6 serija, broji dodire — svaki put manje dodira za istu udaljenost.",
    "Slabiji {metric} u klipu. Zig-zag oko 5 stožaca na 20 m, završi šutom u mini gol (5 serija).",
  ],
  acceleration: [
    "{metric} je prostor za rast. 3×20 m sprint s loptom — start iz ležećeg položaja, cilj prvi dodir nakon 5 m.",
    "Radi {metric}: reakcijski start na zvižduk + 15 m sprint bez lopte (6×), odmor 90 s.",
  ],
  agility: [
    "{metric} treba rad. T-test s loptom: 4× puni krug, fokus na nisku poziciju kukova.",
    "Za {metric}: lateral shuffle 5 m + cut unutra s loptom (3×8).",
  ],
  first_touch: [
    "{metric} je ključan. Zidno dodavanje: primiti vanjskom, dodati unutarnjom — 3×20 dodira svaka noga.",
    "Slab {metric}: partner baca loptu iz različitih kutova, primiti u otvoreni prostor (4×12).",
  ],
  passing: [
    "{metric} je ispod prosjeka klipa. Trikut dodavanja 10 m: 2 dodira i potez — 4 min rada po strani.",
    "Za {metric}: „pass and move“ u boxu 12×12 m, 90 s on/off × 4 (tempo bez gubljenja preciznosti).",
  ],
  shooting: [
    "{metric} treba repetitivni rad. 8 šuteva s ruba kaznenog: prvi dodir van, drugi šut (4 lijevo + 4 desno).",
    "Fokus {metric}: 1v1 s vratarem-konom, završi u donji kut (6 pokušaja).",
  ],
  finishing: [
    "{metric}: 1 dodir iz semi-ubacivanja partnera, završi u suprotni kut (10 golova).",
    "Radi {metric} u boxu 1v0 — prvi dodir naprijed, završnica u prvi kut (5× obje noge).",
  ],
  defending: [
    "{metric}: shadow defending 10 m — ostani side-on, ne skači na feint (6 duels).",
    "Za {metric}: 2v1 obrambeni, zatvori liniju dodavanja prije nego što kreneš na loptu (4 serije).",
  ],
  decision_making: [
    "{metric}: small-sided 3v3, pravilo „2 dodira max“ — prisili brže odluke (3×4 min).",
    "Slab {metric} u klipu. Gledaj snimku pauzirano: gdje je bio slobodan partner? Zapiši 3 situacije i ponovi sutra.",
  ],
  coordination: [
    "{metric}: ladder drills 2 min + odmah lopta kroz slalom (4 serije).",
    "Za {metric}: koordinacija bez lopte (skokovi) pa odmah kombinacija s loptom (3×3 min).",
  ],
  balance: [
    "{metric}: jednonožni dodiri 30 s svaka noga, zatim dribling kroz stožce (3 serije).",
  ],
  composure: [
    "{metric}: pressure drill — partner pritišće leđa, zadrži loptu 8 s u boxu (5×).",
  ],
  default: [
    "Fokus na {metric}: 15 min specifičnog rada uz 4 stožca, snimi 2. seriju za usporedbu.",
    "Slabija {metric} u klipu — ponovi istu vježbu sutra sporije, pa u trećem treningu povećaj tempo.",
  ],
};

const DRILL_TIPS_EN: Record<string, string[]> = {
  ball_control: [
    "In this clip {metric} is the main gap. Next session: 4×4 m square — 12 inside-outside touches without stopping (3 sets, 45 s rest).",
    "For {metric}: figure-8 around two cones for 6 minutes, fewer touches each lap.",
    "{metric} needs work. 3×2 min juggling then 10 touches through a mini slalom immediately after.",
  ],
  dribbling: [
    "{metric} can improve. 1v1 vs a cone: feint left-right then explode (8 tries each side).",
    "Sharpen {metric}: inside-outside dribble 15 m × 6 sets — count touches, reduce each round.",
    "Weaker {metric} here. Zig-zag through 5 cones over 20 m, finish with a mini-goal shot (5 sets).",
  ],
  passing: [
    "{metric} is below clip average. Triangle passing 10 m: two touches and move — 4 min each side.",
    "For {metric}: pass-and-move in a 12×12 m box, 90 s on/off × 4.",
  ],
  shooting: [
    "{metric} needs reps. 8 shots from the edge of the box: first touch out, second shot (4 left + 4 right).",
  ],
  acceleration: [
    "{metric} is room to grow. 3×20 m sprint with ball — start from kneeling, first touch after 5 m.",
  ],
  first_touch: [
    "{metric} is key. Wall pass: receive with outside, pass with inside — 3×20 each foot.",
  ],
  default: [
    "Focus on {metric}: 15 min of specific cone work, film set 2 for comparison.",
    "Weaker {metric} in this clip — repeat the same drill slower tomorrow, then add tempo on day three.",
  ],
};

const WEEKLY_EN: Record<string, string[]> = {
  training_drill: [
    "Mon: slalom + {m1} (25 min). Tue: wall + first touch. Wed: stretch. Thu: {m2} in a box. Fri: film a new drill clip.",
    "Mon: {m1} cones 4×8. Tue: 10 min juggling then {m2}. Wed: rest. Thu: 6×30 m tempo runs. Fri: highlight same drill.",
  ],
  match_play: [
    "Mon: review footage + notes on {m1}. Tue: reaction starts. Wed: recovery. Thu: 3v3 focus {m2}. Fri: film a match clip.",
  ],
  one_v_one: [
    "Mon: feint + {m1} (12 duels). Tue: {m2} angle closing. Wed: recovery. Thu: 1v1 touch limit. Fri: new duel clip.",
  ],
  sprint_highlight: [
    "Mon: sprint without ball 6×20 m. Tue: {m1} with ball after sprint. Wed: stretch. Thu: {m2} agility. Fri: full sprint highlight.",
  ],
  passing_drill: [
    "Mon: triangle {m1}. Tue: wall pass {m2}. Wed: rest. Thu: rondo 5v2. Fri: film a passing combo.",
  ],
  shooting_at_goal: [
    "Mon: 12 shots on goal — focus {m1}. Tue: 1v1 + finish {m2}. Wed: stretch. Thu: dribble then shoot (8×). Fri: film a new highlight with the goal in frame.",
  ],
  default: [
    "Mon: {m1} (25 min). Tue: {m2} technical work. Wed: recovery. Thu: small-sided 20 min. Fri: new highlight.",
  ],
};

const HABIT_TIPS_HR = [
  "Prije svake serije: 2 duboka daha + pogled na prostor iznad lopte — bolje odluke pod pritiskom.",
  "Snimi prvu i zadnju seriju treninga — usporedi tempo i broj dodira, ne samo osjećaj.",
  "Nakon greške: reset 3 s, isti zadatak ponovno bez povećanja brzine.",
  "Drži loptu bliže tijelu kad se brineš brzinu — manje gubitaka u tight space.",
];

const FILMING_TIPS_HR = [
  "Sljedeći klip: snimaj s visine kukova, cijela akcija u kadru, bez rezanja usred pokreta.",
  "Probaj stativ ili stabilnu ruku; mutna slika smanjuje koliko AI može ocijeniti.",
  "Snimi istu vježbu iz dva kuta (straga + 45°) — AI dobiva više dokaza.",
  "Drži klip 8–15 s: početak akcije, vrhunac i završetak moraju biti vidljivi.",
];

const WEEKLY_HR: Record<string, string[]> = {
  training_drill: [
    "Pon: slalom + {m1} (25 min). Uto: zid + prvi dodir. Sri: istezanje. Čet: {m2} u boxu. Pet: snimi novi drill klip.",
    "Pon: {m1} stožci 4×8. Uto: jonglering 10 min pa {m2}. Sri: odmor. Čet: tempo run 6×30 m. Pet: highlight iste vježbe.",
  ],
  match_play: [
    "Pon: pregled snimke + bilješke o {m1}. Uto: reakcijski starti. Sri: oporavak. Čet: 3v3 fokus {m2}. Pet: snimi match situaciju.",
    "Pon: {m1} u small-sided. Uto: {m2} 1v1. Sri: lagani jog. Čet: kombinacije u boxu. Pet: novi match clip.",
  ],
  one_v_one: [
    "Pon: feint + {m1} (12 duels). Uto: {m2} zatvaranje kutova. Sri: oporavak. Čet: 1v1 s ograničenim dodirima. Pet: novi duel klip.",
  ],
  sprint_highlight: [
    "Pon: sprint bez lopte 6×20 m. Uto: {m1} s loptom nakon sprinta. Sri: istezanje. Čet: {m2} agility. Pet: snimi puni sprint highlight.",
  ],
  passing_drill: [
    "Pon: trikut {m1}. Uto: wall pass {m2}. Sri: odmor. Čet: rondo 5v2. Pet: snimi passing kombinaciju.",
  ],
  shooting_at_goal: [
    "Pon: 12 šuteva na gol fokus {m1}. Uto: 1v1 + završnica {m2}. Sri: istezanje. Čet: dribling pa šut (8×). Pet: snimi novi highlight s golom u kadru.",
    "Pon: {m1} u shootout boxu. Uto: {m2} first touch + šut. Sri: odmor. Čet: 6× penali. Pet: isti drill, snimi iz 45° kuta.",
  ],
  default: [
    "Pon: {m1} (25 min). Uto: {m2} tehnički rad. Sri: oporavak. Čet: small-sided 20 min. Pet: novi highlight.",
  ],
};

const BADGE_HR: Record<string, string> = {
  dribbling: "Oštar dribler",
  ball_control: "Kontrolor lopte",
  close_control: "Majstor dodira",
  acceleration: "Raketa",
  agility: "Agilni plesač",
  passing: "Distributor",
  shooting: "Snajper",
  finishing: "Završničar",
  defending: "Čvrst branič",
  decision_making: "Taktičar",
  first_touch: "Prvi dodir pro",
  default: "Brza stopala",
};

const PLAYER_SUMMARY_HR = [
  "Solidan klip — tempo ti odgovara, sljedeći korak je fokus na jednu slabiju metriku po treningu.",
  "Dobra energija u kadru. Drži isti ritam, ali sutra uspori prvu seriju da preciznost skoči.",
  "Vidi se rad — nastavi snimati iste situacije pa usporedi ocjene za tjedan dana.",
  "Klip pokazuje potencijal; sljedeći highlight neka bude malo duži i jasniji za AI analizu.",
];

export function localizedClipSummary(
  locale: AdviceLocale,
  clipType: string,
  fallbackEn: string,
): string {
  if (locale === "hr") {
    return CLIP_SUMMARY_HR[clipType] ?? fallbackEn;
  }
  return fallbackEn;
}

export function buildVariedImprovements(
  locale: AdviceLocale,
  videoId: string,
  weakest: WeakestMetric[],
): string[] {
  const tips = locale === "hr" ? DRILL_TIPS_HR : DRILL_TIPS_EN;
  const habits =
    locale === "hr"
      ? HABIT_TIPS_HR
      : [
          "Before each set: two deep breaths + scan the space — better decisions under pressure.",
          "Film your first and last set — compare tempo and touch count.",
          "After a mistake: 3 s reset, same task again without adding speed.",
        ];
  const filming =
    locale === "hr"
      ? FILMING_TIPS_HR
      : [
          "Next clip: hip height, full action in frame, no mid-movement cuts.",
          "Use a tripod or steady hand — blur limits what AI can score.",
          "Film the same drill from two angles (behind + 45°).",
        ];

  const out: string[] = [];
  weakest.slice(0, 3).forEach((m, rank) => {
    const pool = tips[m.key] ?? tips.default ?? [];
    if (pool.length === 0) return;
    const raw = pickFrom(pool, videoId, 50 + rank * 7);
    out.push(raw.replace(/\{metric\}/g, m.label));
  });
  if (out.length === 0) {
    out.push(
      locale === "hr"
        ? "Snimi jasniji klip s cijelom akcijom pa ponovno pokreni analizu za preciznije savjete."
        : "Film a clearer full-action clip and re-run analysis for sharper tips.",
    );
  }
  out.push(pickFrom(habits, videoId, 90));
  out.push(pickFrom(filming, videoId, 91));
  return out.slice(0, 6);
}

export function buildVariedWeeklyPlan(
  locale: AdviceLocale,
  videoId: string,
  clipType: string,
  weakest: WeakestMetric[],
): string {
  const m1 = weakest[0]?.label ?? "kontrola lopte";
  const m2 = weakest[1]?.label ?? weakest[0]?.label ?? "prvi dodir";
  const plans = locale === "hr" ? WEEKLY_HR : WEEKLY_EN;
  const pool = plans[clipType] ?? plans.default ?? plans.default!;
  const template = pickFrom(pool, videoId, 100);
  return template.replace(/\{m1\}/g, m1).replace(/\{m2\}/g, m2);
}

export function badgeForTopMetric(
  locale: AdviceLocale,
  topMetricKey: string,
  videoId: string,
): string {
  if (locale === "hr") {
    const base = BADGE_HR[topMetricKey] ?? BADGE_HR.default!;
    const extras = ["", " ⚡", " ★"];
    return base + pickFrom(extras, videoId, 120);
  }
  const en: Record<string, string> = {
    dribbling: "Sharp Dribbler",
    ball_control: "Ball Master",
    acceleration: "Rocket",
    passing: "Playmaker",
    shooting: "Sniper",
    default: "Fast Feet",
  };
  return en[topMetricKey] ?? en.default!;
}

export function variedPlayerSummary(
  locale: AdviceLocale,
  videoId: string,
  scenario: number,
): string {
  if (locale === "hr") {
    return pickFrom(PLAYER_SUMMARY_HR, videoId, 130 + scenario);
  }
  return pickFrom(
    [
      "Strong clip — keep the same energy and upload your next highlight.",
      "Good work on camera — focus one weak metric per session this week.",
      "Visible effort — film the same drill again in 7 days to track progress.",
    ],
    videoId,
    130 + scenario,
  );
}
