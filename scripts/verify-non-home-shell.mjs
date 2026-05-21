/**
 * Mobile non-home shell verification (390px viewport).
 * Usage: node scripts/verify-non-home-shell.mjs
 * Requires: dev server on BASE_URL, .env.local with Supabase keys.
 * Optional: SHELL_TEST_EMAIL in env / .env.local
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 390, height: 844 };

const NON_HOME_ROUTES = [
  "/hr/challenges",
  "/hr/upload",
  "/hr/premium",
  "/hr/profile",
];

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

async function resolveTestEmail(env) {
  if (process.env.SHELL_TEST_EMAIL?.trim()) {
    return process.env.SHELL_TEST_EMAIL.trim();
  }
  if (env.SHELL_TEST_EMAIL?.trim()) return env.SHELL_TEST_EMAIL.trim();

  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase URL or service role key in .env.local");
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 50 });
  if (error) throw error;
  const users = data?.users ?? [];
  if (users.length === 0) throw new Error("No users in Supabase project for shell test");
  const confirmed = users.find((u) => u.email_confirmed_at);
  return (confirmed ?? users[0]).email ?? null;
}

function supabaseStorageKey(supabaseUrl) {
  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

async function createLocalSession(email, env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey =
    env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw linkError;

  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) throw new Error("generateLink did not return hashed_token");

  const { data: verifyData, error: verifyError } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (verifyError) throw verifyError;
  if (!verifyData.session) throw new Error("verifyOtp did not return a session");

  return { session: verifyData.session, storageKey: supabaseStorageKey(url) };
}

async function injectSession(context, session, storageKey) {
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });
  await context.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
      sessionStorage.setItem("pitchrusch_fresh_login", "1");
    },
    { key: storageKey, value: payload },
  );
}

async function waitForAppShell(page, timeout = 25_000) {
  await page.waitForSelector("[data-app-root]", { timeout });
  await page.waitForSelector("[data-app-mobile-header]", { timeout });
  await page.waitForSelector("[data-app-bottom-nav]", { timeout });
}

async function runPageChecks(page, scrollMain = true) {
  return page.evaluate((doScrollMain) => {
    const doc = document.documentElement;
    const body = document.body;
    const main = document.querySelector("[data-app-main]");
    const header = document.querySelector("[data-app-mobile-header]");
    const nav = document.querySelector("[data-app-bottom-nav]");
    const trigger = document.querySelector("[data-app-mobile-profile-trigger]");
    const homeFeed = document.querySelector("[data-pitchrusch-home-feed]");

    const windowScrollYBefore = window.scrollY;

    let mainScrollChanged = false;
    let mainScrollTopAfter = 0;
    if (doScrollMain && main instanceof HTMLElement) {
      const before = main.scrollTop;
      const target = Math.min(
        Math.max(200, Math.floor(main.clientHeight * 0.5)),
        Math.max(0, main.scrollHeight - main.clientHeight - 1),
      );
      main.scrollTop = target;
      mainScrollTopAfter = main.scrollTop;
      mainScrollChanged = main.scrollTop > before || main.scrollTop > 0;
      if (!mainScrollChanged && main.scrollHeight > main.clientHeight + 8) {
        main.scrollBy({ top: 120, behavior: "instant" });
        mainScrollTopAfter = main.scrollTop;
        mainScrollChanged = main.scrollTop > 0;
      }
    }

    const windowScrollYAfter = window.scrollY;

    const headerCs = header ? getComputedStyle(header) : null;
    const navCs = nav ? getComputedStyle(nav) : null;
    const headerRect = header?.getBoundingClientRect();
    const navRect = nav?.getBoundingClientRect();
    const triggerRect = trigger?.getBoundingClientRect();

    const mainCs = main ? getComputedStyle(main) : null;
    const mainOverflowY = mainCs?.overflowY ?? "";

    return {
      docNoHScroll: doc.scrollWidth === doc.clientWidth,
      bodyNoHScroll: body.scrollWidth === body.clientWidth,
      docSizes: { sw: doc.scrollWidth, cw: doc.clientWidth },
      bodySizes: { sw: body.scrollWidth, cw: body.clientWidth },
      hasMain: Boolean(main),
      mainOverflowY,
      mainScrollHeight: main instanceof HTMLElement ? main.scrollHeight : 0,
      mainClientHeight: main instanceof HTMLElement ? main.clientHeight : 0,
      mainScrollTopAfter,
      mainScrollChanged,
      windowScrollYBefore,
      windowScrollYAfter,
      windowScrollYStable:
        windowScrollYBefore === 0 && windowScrollYAfter === 0,
      headerPosition: headerCs?.position ?? null,
      headerVisible:
        Boolean(headerRect) &&
        headerRect.height > 0 &&
        headerRect.top >= -2 &&
        headerRect.bottom > 0,
      navPosition: navCs?.position ?? null,
      navVisible:
        Boolean(navRect) &&
        navRect.height > 0 &&
        navRect.bottom <= window.innerHeight + 2,
      triggerWidth: triggerRect?.width ?? 0,
      triggerVisible:
        Boolean(triggerRect) &&
        triggerRect.width >= 40 &&
        triggerRect.height >= 40 &&
        triggerRect.right <= window.innerWidth + 1 &&
        triggerRect.left >= -1,
      hasHomeFeed: Boolean(homeFeed),
    };
  }, scrollMain);
}

async function testNonHomeRoute(page, route) {
  await page.goto(`${BASE_URL}${route}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await waitForAppShell(page);

  const short = await runPageChecks(page, true);
  const failures = [];

  if (!short.docNoHScroll) {
    failures.push(
      `doc horizontal overflow (${short.docSizes.sw} > ${short.docSizes.cw})`,
    );
  }
  if (!short.bodyNoHScroll) {
    failures.push(
      `body horizontal overflow (${short.bodySizes.sw} > ${short.bodySizes.cw})`,
    );
  }
  if (!short.hasMain) failures.push("missing [data-app-main]");
  if (short.hasHomeFeed) failures.push("unexpected home feed on non-home route");
  if (!short.mainScrollChanged && short.mainScrollHeight > short.mainClientHeight + 8) {
    failures.push(
      `[data-app-main] did not scroll (scrollHeight=${short.mainScrollHeight}, clientHeight=${short.mainClientHeight})`,
    );
  } else if (
    short.mainScrollChanged &&
    !["auto", "scroll", "overlay"].includes(short.mainOverflowY)
  ) {
    failures.push(`main overflow-y is ${short.mainOverflowY}, expected scrollable`);
  }
  if (!short.windowScrollYStable) {
    failures.push(
      `window.scrollY changed (${short.windowScrollYBefore} -> ${short.windowScrollYAfter})`,
    );
  }
  if (short.headerPosition !== "fixed") {
    failures.push(`header position=${short.headerPosition}`);
  }
  if (!short.headerVisible) failures.push("header not visible");
  if (short.navPosition !== "fixed") {
    failures.push(`bottom nav position=${short.navPosition}`);
  }
  if (!short.navVisible) failures.push("bottom nav not visible");
  if (!short.triggerVisible) {
    failures.push(
      `profile trigger width=${short.triggerWidth} (need >=40 and in viewport)`,
    );
  }

  return { route, ok: failures.length === 0, failures, metrics: short };
}

async function testHome(page) {
  await page.goto(`${BASE_URL}/hr/home`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForSelector("[data-app-root]", { timeout: 25_000 });
  await page.waitForSelector("[data-pitchrusch-home-feed]", { timeout: 45_000 });
  await page.waitForSelector("[data-pitchrusch-feed-panel]", { timeout: 45_000 });

  const home = await page.evaluate(() => {
    const main = document.querySelector("[data-app-main]");
    const feed = document.querySelector("[data-pitchrusch-home-feed]");
    const panel = document.querySelector("[data-pitchrusch-feed-panel]");
    const mainCs = main ? getComputedStyle(main) : null;
    return {
      hasFeed: Boolean(feed),
      hasFeedPanel: Boolean(panel),
      mainOverflowY: mainCs?.overflowY ?? null,
      mainHasNonHomeScrollRule:
        main instanceof HTMLElement &&
        getComputedStyle(main).overflowY === "auto",
      docNoHScroll:
        document.documentElement.scrollWidth ===
        document.documentElement.clientWidth,
    };
  });

  const failures = [];
  if (!home.hasFeed) failures.push("missing [data-pitchrusch-home-feed]");
  if (!home.hasFeedPanel) failures.push("missing [data-pitchrusch-feed-panel]");
  if (home.mainHasNonHomeScrollRule) {
    failures.push("home [data-app-main] has non-home overflow-y:auto scroll");
  }
  if (!home.docNoHScroll) failures.push("home doc horizontal overflow");

  return { route: "/hr/home", ok: failures.length === 0, failures, metrics: home };
}

async function main() {
  const env = loadEnvLocal();
  const email = await resolveTestEmail(env);
  const maskedEmail = email.replace(/(^.).*(@.*$)/, "$1***$2");
  console.log(`Using test account: ${maskedEmail}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const { session, storageKey } = await createLocalSession(email, env);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    isMobile: true,
    hasTouch: true,
    locale: "hr-HR",
  });
  await injectSession(context, session, storageKey);
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/hr/challenges`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForAppShell(page);

    const results = [];
    for (const route of NON_HOME_ROUTES) {
      results.push(await testNonHomeRoute(page, route));
    }
    results.push(await testHome(page));

    let allOk = true;
    for (const r of results) {
      const status = r.ok ? "PASS" : "FAIL";
      console.log(`${status} ${r.route}`);
      if (!r.ok) {
        allOk = false;
        for (const f of r.failures) console.log(`  - ${f}`);
      }
    }

    console.log(allOk ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
    process.exit(allOk ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
