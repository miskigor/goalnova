#!/usr/bin/env node
/** Ispiši točan LAN URL za mobitel — pokreni kad god (ne pokreće server). */
import os from "node:os";

const port = (process.env.PORT ?? "3001").trim() || "3001";
const nets = os.networkInterfaces();
/** @type { { iface: string; address: string }[] } */
const rows = [];
for (const iface of Object.keys(nets)) {
  for (const n of nets[iface] ?? []) {
    if (n?.family === "IPv4" && !n.internal) {
      rows.push({ iface, address: n.address });
    }
  }
}

console.log("");
console.log("PitchRusch — točan link za mobitel (isti Wi-Fi kao Mac):");
console.log("");
if (rows.length === 0) {
  console.log("  (nema javne IPv4 — provjeri Wi-Fi na Macu)");
} else {
  for (const { iface, address } of rows) {
    console.log(`  http://${address}:${port}/`);
    console.log(`  http://${address}:${port}/hr`);
    console.log(`     ↑ interface ${iface}`);
    console.log("");
  }
}
console.log(
  "Ako bookmark još ima stari IP (npr. 192.168.0.89), obnovi — DHCP mijenja zadnji broj.",
);
console.log("Server mora raditi: npm run dev (port " + port + ").");
console.log("");
