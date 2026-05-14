#!/usr/bin/env python3
"""Patch i18n-benefits/*.json: neutral copy, no premium upsell on benefits page."""
from __future__ import annotations

import json
from pathlib import Path

PATCH_DIR = Path(__file__).resolve().parent / "i18n-benefits"

UPDATES: dict[str, dict[str, str]] = {
    "en": {
        "lockedBenefitsIntro": "Extra perks can unlock when you hit referral milestones (details will show here).",
        "playerBenefitsStatusIntro": "Recognition and visibility tied to your player account (status updates soon).",
        "scoutBenefitsStatusIntro": "Core discovery tools included with your scout access.",
        "invite3PlayersReward": "Earn 1 month of extra player perks when milestones are met.",
        "hintStatsCard": "See profile and video performance in one place.",
    },
    "hr": {
        "lockedBenefitsIntro": "Dodatne pogodnosti mogu se otključati referral prekretnicama (detalji će biti ovdje).",
        "playerBenefitsStatusIntro": "Priznanje i vidljivost vezani uz tvoj igrački račun (detalji uskoro).",
        "scoutBenefitsStatusIntro": "Osnovni alati za otkrivanje dok pregledavaš kao skaut.",
        "invite3PlayersReward": "1 mjesec dodatnih pogodnosti za igrače kad ispuniš uvjete.",
        "hintStatsCard": "Uspješnost profila i videa na jednom mjestu.",
    },
    "bs": {
        "lockedBenefitsIntro": "Dodatne pogodnosti se mogu otključati referral prekretnicama (detalji će biti ovdje).",
        "playerBenefitsStatusIntro": "Priznanje i vidljivost vezani za tvoj igrački račun (detalji uskoro).",
        "scoutBenefitsStatusIntro": "Osnovni alati za otkrivanje dok pregledavaš kao skaut.",
        "invite3PlayersReward": "1 mjesec dodatnih pogodnosti za igrače kad ispuniš uslove.",
        "hintStatsCard": "Uspješnost profila i videa na jednom mjestu.",
    },
    "sr": {
        "lockedBenefitsIntro": "Dodatne pogodnosti mogu da se otključaju referral prekretnicama (detalji će biti ovde).",
        "playerBenefitsStatusIntro": "Priznanje i vidljivost vezani za tvoj igrački nalog (detalji uskoro).",
        "scoutBenefitsStatusIntro": "Osnovni alati za otkrivanje dok pregledaš kao skaut.",
        "invite3PlayersReward": "1 mesec dodatnih pogodnosti za igrače kad ispuniš uslove.",
        "hintStatsCard": "Uspješnost profila i snimaka na jednom mestu.",
    },
    "de": {
        "lockedBenefitsIntro": "Zusätzliche Vorteile können sich über Empfehlungs-Meilensteine freischalten (Details folgen).",
        "playerBenefitsStatusIntro": "Anerkennung und Sichtbarkeit für dein Spielerkonto (Details folgen).",
        "scoutBenefitsStatusIntro": "Kernfunktionen für die Spielersuche mit deinem Scout-Zugang.",
        "invite3PlayersReward": "1 Monat zusätzlicher Spieler-Vorteile, sobald die Meilensteine erreicht sind.",
        "hintStatsCard": "Profil- und Video-Performance an einem Ort.",
    },
    "es": {
        "lockedBenefitsIntro": "Ventajas extra al cumplir hitos de referidos (los detalles aparecerán aquí).",
        "playerBenefitsStatusIntro": "Reconocimiento y visibilidad ligados a tu cuenta de jugador (detalles pronto).",
        "scoutBenefitsStatusIntro": "Herramientas básicas de descubrimiento con tu acceso de scout.",
        "invite3PlayersReward": "1 mes de ventajas extra para jugadores al cumplir los hitos.",
        "hintStatsCard": "Rendimiento de perfil y vídeos en un solo lugar.",
    },
    "fr": {
        "lockedBenefitsIntro": "Des avantages supplémentaires peuvent se débloquer via les jalons de parrainage (détails ici bientôt).",
        "playerBenefitsStatusIntro": "Reconnaissance et visibilité liées à votre compte joueur (détails bientôt).",
        "scoutBenefitsStatusIntro": "Outils de découverte de base avec votre accès scout.",
        "invite3PlayersReward": "1 mois d’avantages joueur supplémentaires une fois les jalons atteints.",
        "hintStatsCard": "Performance du profil et des vidéos au même endroit.",
    },
    "it": {
        "lockedBenefitsIntro": "Vantaggi extra sbloccabili con i traguardi referral (dettagli qui a breve).",
        "playerBenefitsStatusIntro": "Riconoscimento e visibilità legati al tuo account giocatore (dettagli a breve).",
        "scoutBenefitsStatusIntro": "Strumenti base di scouting con il tuo accesso da osservatore.",
        "invite3PlayersReward": "1 mese di vantaggi extra per i giocatori al raggiungimento degli obiettivi.",
        "hintStatsCard": "Prestazioni di profilo e video in un unico posto.",
    },
    "pt": {
        "lockedBenefitsIntro": "Vantagens extra ao cumprires marcos de referência (detalhes aparecerão aqui).",
        "playerBenefitsStatusIntro": "Reconhecimento e visibilidade ligados à tua conta de jogador (detalhes em breve).",
        "scoutBenefitsStatusIntro": "Ferramentas básicas de descoberta com o teu acesso de scout.",
        "invite3PlayersReward": "1 mês de vantagens extra para jogadores ao cumprires os marcos.",
        "hintStatsCard": "Desempenho de perfil e vídeos num só lugar.",
    },
    "nl": {
        "lockedBenefitsIntro": "Extra voordelen kunnen ontgrendelen bij referral-mijlpalen (details volgen hier).",
        "playerBenefitsStatusIntro": "Erkenning en zichtbaarheid voor je spelersaccount (details volgen).",
        "scoutBenefitsStatusIntro": "Basis-tools voor ontdekken met je scouttoegang.",
        "invite3PlayersReward": "1 maand extra spelersvoordelen wanneer mijlpalen zijn gehaald.",
        "hintStatsCard": "Profiel- en videoprestaties op één plek.",
    },
    "tr": {
        "lockedBenefitsIntro": "Ek avantajlar davet kilometre taşlarıyla açılabilir (ayrıntılar burada görünecek).",
        "playerBenefitsStatusIntro": "Oyuncu hesabınla bağlı tanınma ve görünürlük (detaylar yakında).",
        "scoutBenefitsStatusIntro": "Scout erişiminle birlikte gelen temel keşif araçları.",
        "invite3PlayersReward": "Kilometre taşları tamamlandığında 1 ay ekstra oyuncu avantajı.",
        "hintStatsCard": "Profil ve video performansını tek yerde gör.",
    },
    "ar": {
        "lockedBenefitsIntro": "مزايا إضافية قد تُفتح عند مراحل الإحالة (ستظهر التفاصيل هنا).",
        "playerBenefitsStatusIntro": "الاعتراف والظهور المرتبطان بحسابك كلاعب (تفاصيل قريبًا).",
        "scoutBenefitsStatusIntro": "أدوات اكتشاف أساسية مع وصولك ككشّاف.",
        "invite3PlayersReward": "شهر إضافي من مزايا اللاعب عند استيفاء المراحل.",
        "hintStatsCard": "أداء الملف والفيديو في مكان واحد.",
    },
}


def main() -> int:
    for loc, pairs in UPDATES.items():
        path = PATCH_DIR / f"{loc}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        for k, v in pairs.items():
            data[k] = v
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("updated", path.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
