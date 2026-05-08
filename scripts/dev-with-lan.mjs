#!/usr/bin/env node
/**
 * Starts `next dev` for LAN access from a phone (same Wi‑Fi).
 *
 * Env (optional):
 *   PORT=3001           — dev port (default 3001)
 *   DEV_BIND_HOST=…    — bind address (default 0.0.0.0). If mobitel ne vidi server,
 *                        probaj: DEV_BIND_HOST=192.168.0.89 npm run dev
 *   NEXT_DEV_LAN_HOST=… — usually auto-set to your Wi‑Fi IPv4 for Next.js dev origins
 */
import { spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";

function listLanIPv4() {
  /** @type {{ iface: string; address: string }[]} */
  const out = [];
  const nets = os.networkInterfaces();
  for (const iface of Object.keys(nets)) {
    for (const net of nets[iface] ?? []) {
      if (net?.family !== "IPv4" || net.internal) continue;
      out.push({ iface, address: net.address });
    }
  }
  return out;
}

function firstPreferredLanIPv4() {
  const rows = listLanIPv4();
  const score = (a) =>
    a.address.startsWith("192.168.")
      ? 3
      : a.address.startsWith("10.")
        ? 2
        : /^172\.(1[6-9]|2\d|3[01])\./.test(a.address)
          ? 2
          : 1;
  rows.sort((x, y) => score(y) - score(x));
  return rows[0]?.address ?? "";
}

function checkPortListenable(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    const done = (ok) => {
      try {
        s.close();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    s.once("error", (err) => {
      if (err && "code" in err && err.code === "EADDRINUSE") done(false);
      else done(true);
    });
    s.once("listening", () => done(true));
    s.listen(Number(port), "0.0.0.0");
  });
}

const bindHost = (process.env.DEV_BIND_HOST ?? "0.0.0.0").trim() || "0.0.0.0";
/** Default 3001 — česti LAN bookmark. Drugačiji port: PORT=3000 npm run dev */
const port = (process.env.PORT ?? "3001").trim() || "3001";

async function main() {
  const ok = await checkPortListenable(port);
  if (!ok) {
    console.error(
      `\n[PitchRusch dev] Port ${port} je ZAUZET — drugi proces ga drži (stari Next?).\n` +
        `  Zaustavi ga (Ctrl+C u drugom terminalu) ili probaj:\n` +
        `    PORT=3010 npm run dev\n`,
    );
    process.exit(1);
  }

  const ip = firstPreferredLanIPv4();
  const allIps = listLanIPv4();

  process.env.NEXT_DISABLE_CROSS_SITE_DEV_BLOCK = "1";
  if (ip && !process.env.NEXT_DEV_LAN_HOST?.trim()) {
    process.env.NEXT_DEV_LAN_HOST = ip;
  }

  console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("  PitchRusch dev — LAN za mobitel");
  console.error("");
  console.error(
    `  Slušam:  http://${bindHost === "0.0.0.0" ? "0.0.0.0 (sve interface)" : bindHost}:${port}/`,
  );
  console.error("");
  if (bindHost === "0.0.0.0" && allIps.length > 0) {
    console.error("  Probaj na mobitelu (isti Wi‑Fi, http ne https):");
    for (const { iface, address } of allIps) {
      console.error(`    • http://${address}:${port}/     (${iface})`);
      console.error(`    • http://${address}:${port}/hr   (${iface})`);
    }
  } else if (bindHost !== "0.0.0.0") {
    console.error(`  Mobitel:  http://${bindHost}:${port}/`);
    console.error(`            http://${bindHost}:${port}/hr`);
  } else {
    console.error("  Nisam našao IPv4 na ovom Macu — u Safari upiši IP ručno iz");
    console.error("  System Settings → Network (Wi‑Fi) → Details …");
  }
  console.error("");
  console.error("  Ako NE otvara:");
  console.error("    • iOS: Settings → Privacy → Local Network → Safari = ON");
  console.error("    • VPN isključi (Mac i mobitel)");
  console.error("    • Mac firewall: dopusti „node“ / Terminal dolazne veze");
  console.error("    • Router: isključi „AP isolation“ / „client isolation“ (Wi‑Fi)");
  console.error("    • Probaj vezati IP Maca:");
  console.error(`        DEV_BIND_HOST=${ip || "192.168.0.89"} npm run dev`);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const args = ["next", "dev", "--hostname", bindHost, "--webpack", "-p", port];

  const child = spawn("npx", args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) process.exit(1);
    process.exit(code ?? 0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
