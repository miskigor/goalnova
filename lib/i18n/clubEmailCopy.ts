import { loadMergedMessages } from "@/i18n/loadLocaleMessages";
import type { AppLocale } from "@/i18n/routing";

type EmailCopy = Record<string, string>;

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

async function loadCopy(locale: AppLocale): Promise<EmailCopy> {
  const messages = await loadMergedMessages(locale);
  const ns = messages.clubEmails;
  if (ns && typeof ns === "object" && !Array.isArray(ns)) {
    return ns as EmailCopy;
  }
  return {};
}

export async function clubEmailT(
  locale: AppLocale,
  key: string,
  vars: Record<string, string> = {},
): Promise<string> {
  const copy = await loadCopy(locale);
  const template = copy[key] ?? key;
  return fill(template, vars);
}

export async function membershipStatusLabel(
  locale: AppLocale,
  status: string,
): Promise<string> {
  if (status === "active") return clubEmailT(locale, "membershipActive");
  if (status === "rejected") return clubEmailT(locale, "membershipRejected");
  return clubEmailT(locale, "membershipPending");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function defaultContactName(locale: AppLocale): Promise<string> {
  return clubEmailT(locale, "defaultContactName");
}

type StaffPartnershipInput = {
  clubName: string;
  country: string;
  contact: string;
  email: string;
  instagram: string;
  website: string;
  estimatedPlayers: string;
  message: string | null;
  adminUrl: string;
};

export async function staffPartnershipEmail(
  locale: AppLocale,
  input: StaffPartnershipInput,
): Promise<{ subject: string; text: string; html: string }> {
  const dash = await clubEmailT(locale, "dash");
  const country = input.country || dash;
  const contact = input.contact || dash;
  const email = input.email || dash;
  const instagram = input.instagram || dash;
  const website = input.website || dash;
  const estimatedPlayers = input.estimatedPlayers || dash;
  const subject = await clubEmailT(locale, "staffPartnershipSubject", {
    clubName: input.clubName,
  });
  const intro = await clubEmailT(locale, "staffPartnershipIntro");
  const labelClub = await clubEmailT(locale, "labelClub");
  const labelCountry = await clubEmailT(locale, "labelCountry");
  const labelContact = await clubEmailT(locale, "labelContact");
  const labelEmail = await clubEmailT(locale, "labelEmail");
  const labelInstagram = await clubEmailT(locale, "labelInstagram");
  const labelWebsite = await clubEmailT(locale, "labelWebsite");
  const labelPlayers = await clubEmailT(locale, "labelEstimatedPlayers");
  const labelMessage = await clubEmailT(locale, "labelMessage");
  const ctaText = await clubEmailT(locale, "staffPartnershipCtaText", {
    adminUrl: input.adminUrl,
  });
  const ctaHtml = await clubEmailT(locale, "staffPartnershipCtaHtml");

  const text = [
    intro,
    "",
    `${labelClub}: ${input.clubName}`,
    `${labelCountry}: ${country}`,
    `${labelContact}: ${contact}`,
    `${labelEmail}: ${email}`,
    `${labelInstagram}: ${instagram}`,
    `${labelWebsite}: ${website}`,
    `${labelPlayers}: ${estimatedPlayers}`,
    "",
    input.message ? `${labelMessage}:\n${input.message}` : "",
    "",
    ctaText,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>${escapeHtml(intro)}</p>
    <ul>
      <li><strong>${escapeHtml(labelClub)}:</strong> ${escapeHtml(input.clubName)}</li>
      <li><strong>${escapeHtml(labelCountry)}:</strong> ${escapeHtml(country)}</li>
      <li><strong>${escapeHtml(labelContact)}:</strong> ${escapeHtml(contact)}</li>
      <li><strong>${escapeHtml(labelEmail)}:</strong> ${escapeHtml(email)}</li>
      <li><strong>${escapeHtml(labelInstagram)}:</strong> ${escapeHtml(instagram)}</li>
      <li><strong>${escapeHtml(labelWebsite)}:</strong> ${escapeHtml(website)}</li>
      <li><strong>${escapeHtml(labelPlayers)}:</strong> ${escapeHtml(estimatedPlayers)}</li>
    </ul>
    ${
      input.message
        ? `<p><strong>${escapeHtml(labelMessage)}:</strong><br>${escapeHtml(input.message)}</p>`
        : ""
    }
    <p><a href="${escapeHtml(input.adminUrl)}">${escapeHtml(ctaHtml)}</a></p>
  `.trim();

  return { subject, text, html };
}

export async function clubReceivedEmail(
  locale: AppLocale,
  input: { contactName: string; clubName: string; siteUrl: string },
): Promise<{ subject: string; text: string; html: string }> {
  const subject = await clubEmailT(locale, "clubReceivedSubject", {
    clubName: input.clubName,
  });
  const hi = await clubEmailT(locale, "clubReceivedHi", { contactName: input.contactName });
  const body1 = await clubEmailT(locale, "clubReceivedBody1", { clubName: input.clubName });
  const body2 = await clubEmailT(locale, "clubReceivedBody2");
  const signoff = await clubEmailT(locale, "signoff");
  const text = [hi, "", body1, "", body2, "", `Site: ${input.siteUrl}`, "", signoff].join("\n");
  const html = `
    <p>${escapeHtml(hi)}</p>
    <p>${escapeHtml(body1)}</p>
    <p>${escapeHtml(body2)}</p>
    <p><a href="${escapeHtml(input.siteUrl)}">pitchrusch.com</a></p>
    <p>${escapeHtml(signoff)}</p>
  `.trim();
  return { subject, text, html };
}

export async function clubApprovedEmail(
  locale: AppLocale,
  input: {
    contactName: string;
    clubName: string;
    inviteCode: string;
    clubUrl: string;
    dashboardUrl: string;
  },
): Promise<{ subject: string; text: string; html: string }> {
  const subject = await clubEmailT(locale, "approvedSubject", {
    inviteCode: input.inviteCode,
  });
  const hi = await clubEmailT(locale, "approvedHi", { contactName: input.contactName });
  const body1 = await clubEmailT(locale, "approvedBody1", { clubName: input.clubName });
  const invite = await clubEmailT(locale, "approvedInvite", { inviteCode: input.inviteCode });
  const share = await clubEmailT(locale, "approvedShare");
  const premium = await clubEmailT(locale, "approvedPremium");
  const profile = await clubEmailT(locale, "approvedProfile");
  const dashboard = await clubEmailT(locale, "approvedDashboard");
  const partner = await clubEmailT(locale, "approvedPartner");
  const signoff = await clubEmailT(locale, "signoff");
  const text = [
    hi,
    "",
    body1,
    "",
    invite,
    "",
    share,
    premium,
    "",
    `${profile}: ${input.clubUrl}`,
    `${dashboard}: ${input.dashboardUrl}`,
    "",
    partner,
    "",
    signoff,
  ].join("\n");
  const html = `
    <p>${escapeHtml(hi)}</p>
    <p>${escapeHtml(body1)}</p>
    <p><strong>${escapeHtml(invite)}</strong></p>
    <p>${escapeHtml(share)}</p>
    <p>${escapeHtml(premium)}</p>
    <ul>
      <li><a href="${escapeHtml(input.clubUrl)}">${escapeHtml(profile)}</a></li>
      <li><a href="${escapeHtml(input.dashboardUrl)}">${escapeHtml(dashboard)}</a></li>
    </ul>
    <p>${escapeHtml(partner)}</p>
    <p>${escapeHtml(signoff)}</p>
  `.trim();
  return { subject, text, html };
}

export async function playerJoinEmail(
  locale: AppLocale,
  input: {
    clubName: string;
    playerName: string;
    username: string;
    country: string;
    playerEmail: string;
    status: string;
    dashboardUrl: string;
  },
): Promise<{ subject: string; text: string; html: string }> {
  const subject = await clubEmailT(locale, "joinSubject", {
    playerName: input.playerName,
    clubName: input.clubName,
  });
  const intro = await clubEmailT(locale, "joinIntro", { clubName: input.clubName });
  const labelPlayer = await clubEmailT(locale, "labelPlayer");
  const labelUsername = await clubEmailT(locale, "labelUsername");
  const labelCountry = await clubEmailT(locale, "labelCountry");
  const labelEmail = await clubEmailT(locale, "labelEmail");
  const labelStatus = await clubEmailT(locale, "labelStatus");
  const status = await membershipStatusLabel(locale, input.status);
  const ctaHtml = await clubEmailT(locale, "joinCtaHtml");
  const ctaText = await clubEmailT(locale, "joinCtaText", {
    dashboardUrl: input.dashboardUrl,
  });
  const text = [
    intro,
    "",
    `${labelPlayer}: ${input.playerName}`,
    `${labelUsername}: @${input.username}`,
    `${labelCountry}: ${input.country}`,
    `${labelEmail}: ${input.playerEmail}`,
    `${labelStatus}: ${status}`,
    "",
    ctaText,
  ].join("\n");
  const html = `
    <p>${escapeHtml(intro)}</p>
    <ul>
      <li><strong>${escapeHtml(labelPlayer)}:</strong> ${escapeHtml(input.playerName)}</li>
      <li><strong>${escapeHtml(labelUsername)}:</strong> @${escapeHtml(input.username)}</li>
      <li><strong>${escapeHtml(labelCountry)}:</strong> ${escapeHtml(input.country)}</li>
      <li><strong>${escapeHtml(labelEmail)}:</strong> ${escapeHtml(input.playerEmail)}</li>
      <li><strong>${escapeHtml(labelStatus)}:</strong> ${escapeHtml(status)}</li>
    </ul>
    <p><a href="${escapeHtml(input.dashboardUrl)}">${escapeHtml(ctaHtml)}</a></p>
  `.trim();
  return { subject, text, html };
}
