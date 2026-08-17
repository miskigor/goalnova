"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ClubLogoEditor } from "@/components/clubs/ClubLogoEditor";
import { ClubInviteCodeCard } from "@/components/clubs/ClubInviteCodeCard";
import { ClubOrganizationKindField } from "@/components/clubs/ClubOrganizationKindField";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import {
  rpcClubUpdateProfile,
  type ManagedClubProfile,
} from "@/lib/supabase/clubs";
import {
  parseClubOrganizationKind,
  type ClubOrganizationKind,
} from "@/lib/clubs/organizationKind";

type Props = {
  club: ManagedClubProfile;
  onClubChange: (club: ManagedClubProfile) => void;
  showDashboardLink?: boolean;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-gn-border-subtle bg-black/40 px-4 text-sm text-gn-text outline-none focus:border-gn-accent/50";

const labelClass = "block text-xs font-medium uppercase tracking-wider text-gn-text-tertiary";

export function ClubProfileEditor({ club, onClubChange, showDashboardLink = true }: Props) {
  const t = useTranslations("clubs");
  const [name, setName] = useState(club.name);
  const [city, setCity] = useState(club.city ?? "");
  const [country, setCountry] = useState(club.country ?? "");
  const [website, setWebsite] = useState(club.website ?? "");
  const [instagram, setInstagram] = useState(club.instagram ?? "");
  const [contactPerson, setContactPerson] = useState(club.contact_person ?? "");
  const [description, setDescription] = useState(club.description ?? "");
  const [organizationKind, setOrganizationKind] = useState<ClubOrganizationKind>(
    parseClubOrganizationKind(club.organization_kind),
  );
  const [logoUrl, setLogoUrl] = useState(club.logo_url);
  const [coverUrl, setCoverUrl] = useState(club.cover_url);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset fields when switching clubs; ignore later parent patches so in-progress edits stay.
  useEffect(() => {
    setName(club.name);
    setCity(club.city ?? "");
    setCountry(club.country ?? "");
    setWebsite(club.website ?? "");
    setInstagram(club.instagram ?? "");
    setContactPerson(club.contact_person ?? "");
    setDescription(club.description ?? "");
    setOrganizationKind(parseClubOrganizationKind(club.organization_kind));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identity-only sync
  }, [club.id]);

  useEffect(() => {
    setLogoUrl(club.logo_url);
  }, [club.logo_url]);

  useEffect(() => {
    setCoverUrl(club.cover_url);
  }, [club.cover_url]);

  function applyClub(next: ManagedClubProfile) {
    onClubChange(next);
    setName(next.name);
    setCity(next.city ?? "");
    setCountry(next.country ?? "");
    setWebsite(next.website ?? "");
    setInstagram(next.instagram ?? "");
    setContactPerson(next.contact_person ?? "");
    setDescription(next.description ?? "");
    setOrganizationKind(parseClubOrganizationKind(next.organization_kind));
    setLogoUrl(next.logo_url);
    setCoverUrl(next.cover_url);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError(t("manageClubNameRequired"));
      return;
    }

    setSaving(true);
    const result = await rpcClubUpdateProfile({
      clubId: club.id,
      name: trimmedName,
      city,
      country,
      website,
      instagram,
      description,
      contactPerson,
      organizationKind,
    });
    setSaving(false);

    if (result.missingRpc) {
      setError(t("manageClubSetupPending"));
      return;
    }
    if (!result.ok) {
      if (result.error === "name_required") {
        setError(t("manageClubNameRequired"));
        return;
      }
      setError(t("manageClubSaveFailed"));
      return;
    }

    if (result.club) {
      applyClub({ ...result.club, logo_url: logoUrl, cover_url: coverUrl });
    }
    setStatus(t("manageClubSaved"));
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4">
      <div>
        <h2 className="text-sm font-semibold text-gn-text">{t("manageClubTitle")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-gn-text-secondary">{t("manageClubHint")}</p>
      </div>

      <ClubInviteCodeCard clubCode={club.club_code} />

      <ClubLogoEditor
        kind="cover"
        clubId={club.id}
        clubName={name.trim() || club.name}
        logoUrl={coverUrl}
        framed={false}
        onLogoUrlChange={(url) => {
          setCoverUrl(url);
          onClubChange({
            ...club,
            name: name.trim() || club.name,
            city: city.trim() || null,
            country: country.trim() || null,
            website: website.trim() || null,
            instagram: instagram.trim() || null,
            description: description.trim() || null,
            contact_person: contactPerson.trim() || null,
            organization_kind: organizationKind,
            logo_url: logoUrl,
            cover_url: url,
          });
        }}
      />

      <ClubLogoEditor
        clubId={club.id}
        clubName={name.trim() || club.name}
        logoUrl={logoUrl}
        framed={false}
        onLogoUrlChange={(url) => {
          setLogoUrl(url);
          onClubChange({
            ...club,
            name: name.trim() || club.name,
            city: city.trim() || null,
            country: country.trim() || null,
            website: website.trim() || null,
            instagram: instagram.trim() || null,
            description: description.trim() || null,
            contact_person: contactPerson.trim() || null,
            organization_kind: organizationKind,
            logo_url: url,
            cover_url: coverUrl,
          });
        }}
      />

      <form onSubmit={(e) => void onSave(e)} className="space-y-3">
        <div>
          <label className={labelClass} htmlFor={`club-name-${club.id}`}>
            {t("fieldClubName")}
          </label>
          <input
            id={`club-name-${club.id}`}
            className={`${inputClass} mt-1`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
          />
        </div>
        <ClubOrganizationKindField
          idPrefix={`club-kind-${club.id}`}
          value={organizationKind}
          onChange={setOrganizationKind}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor={`club-city-${club.id}`}>
              {t("fieldCity")}
            </label>
            <input
              id={`club-city-${club.id}`}
              className={`${inputClass} mt-1`}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`club-country-${club.id}`}>
              {t("fieldCountry")}
            </label>
            <input
              id={`club-country-${club.id}`}
              className={`${inputClass} mt-1`}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={80}
            />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor={`club-contact-${club.id}`}>
            {t("fieldContactPerson")}
          </label>
          <input
            id={`club-contact-${club.id}`}
            className={`${inputClass} mt-1`}
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            maxLength={120}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`club-website-${club.id}`}>
            {t("fieldWebsite")}
          </label>
          <input
            id={`club-website-${club.id}`}
            className={`${inputClass} mt-1`}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={240}
            inputMode="url"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`club-instagram-${club.id}`}>
            {t("fieldInstagram")}
          </label>
          <input
            id={`club-instagram-${club.id}`}
            className={`${inputClass} mt-1`}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            maxLength={80}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`club-about-${club.id}`}>
            {t("fieldDescription")}
          </label>
          <textarea
            id={`club-about-${club.id}`}
            className="mt-1 min-h-[8rem] w-full rounded-xl border border-gn-border-subtle bg-black/40 px-4 py-3 text-sm text-gn-text outline-none focus:border-gn-accent/50"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>

        {error ? (
          <p className="text-sm text-red-200" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="text-sm text-emerald-200" role="status">
            {status}
          </p>
        ) : null}

        <button type="submit" disabled={saving} className={GN_PRIMARY_BUTTON_CLASS}>
          {saving ? t("manageClubSaving") : t("manageClubSave")}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {club.slug ? (
          <Link href={`/clubs/${club.slug}`} className={`${GN_SECONDARY_BUTTON_CLASS} min-h-10 px-4 py-2 text-xs`}>
            {t("manageClubViewPublic")}
          </Link>
        ) : null}
        {showDashboardLink ? (
          <Link
            href={`/clubs/dashboard?club=${encodeURIComponent(club.id)}`}
            className={`${GN_SECONDARY_BUTTON_CLASS} min-h-10 px-4 py-2 text-xs`}
          >
            {t("manageClubOpenDashboard")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
