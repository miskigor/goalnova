-- Backfill legacy AI analysis rows where free-text fields were saved in English.
-- We replace those legacy strings with locale-aware generic text, based on
-- `users.language_preference`, so existing rows render correctly in-app.

create or replace function public.goalnova_ai_locale_bucket(raw text)
returns text
language sql
immutable
as $$
  select case lower(split_part(coalesce(raw, 'en'), '-', 1))
    when 'hr' then 'hr'
    when 'de' then 'de'
    when 'bs' then 'bs'
    when 'es' then 'es'
    when 'pt' then 'pt'
    when 'sr' then 'sr'
    when 'fr' then 'fr'
    when 'it' then 'it'
    when 'nl' then 'nl'
    when 'tr' then 'tr'
    when 'ar' then 'ar'
    else 'en'
  end;
$$;

create or replace function public.goalnova_ai_is_legacy_english(raw text)
returns boolean
language sql
immutable
as $$
  select coalesce(raw, '') ~* '\m(the|clip|visible|ball|camera|score|only|not|no|appears|shown)\M';
$$;

create or replace function public.goalnova_ai_copy(locale_key text, copy_key text)
returns text
language sql
immutable
as $$
  select case copy_key
    when 'clip_summary' then
      case locale_key
        when 'hr' then 'Nogometne akcije su vidljive i ocijenjene samo gdje postoji jasan dokaz.'
        when 'de' then 'Fussballaktionen sind sichtbar und wurden nur bei klarer Evidenz bewertet.'
        when 'bs' then 'Nogometne akcije su vidljive i ocijenjene samo kada postoji jasan dokaz.'
        when 'es' then 'Las acciones de futbol son visibles y se evaluaron solo donde la evidencia es clara.'
        when 'pt' then 'As acoes de futebol estao visiveis e foram avaliadas apenas quando ha evidencia clara.'
        when 'sr' then 'Fudbalske akcije su vidljive i ocenjene samo gde postoji jasan dokaz.'
        when 'fr' then 'Les actions de football sont visibles et evaluees uniquement quand la preuve est claire.'
        when 'it' then 'Le azioni calcistiche sono visibili e valutate solo dove l evidenza e chiara.'
        when 'nl' then 'Voetbalacties zijn zichtbaar en alleen beoordeeld waar het bewijs duidelijk is.'
        when 'tr' then 'Klipte futbol aksiyonlari goruluyor ve sadece acik kanit olan kisimlar degerlendirildi.'
        when 'ar' then 'تظهر لقطات كرة قدم في هذا المقطع وتم تقييم ما لديه دليل واضح فقط.'
        else 'Football actions are visible and assessed only where evidence is clear.'
      end
    when 'camera_note' then
      case locale_key
        when 'hr' then 'Kvaliteta i kut kamere utjecu na pouzdanost; nejasni dijelovi se ne ocjenjuju.'
        when 'de' then 'Kameraqualitaet und Perspektive beeinflussen die Sicherheit; unklare Momente werden nicht bewertet.'
        when 'bs' then 'Kvalitet i ugao kamere uticu na pouzdanost; nejasni dijelovi se ne ocjenjuju.'
        when 'es' then 'La calidad y el angulo de camara afectan la confianza; los momentos poco claros no se puntuan.'
        when 'pt' then 'A qualidade e o angulo da camara afetam a confianca; momentos pouco claros nao sao pontuados.'
        when 'sr' then 'Kvalitet i ugao kamere uticu na pouzdanost; nejasni delovi se ne ocenjuju.'
        when 'fr' then 'La qualite et l angle de camera influencent la confiance; les moments flous ne sont pas notes.'
        when 'it' then 'Qualita e angolo della camera influenzano la confidenza; i momenti poco chiari non vengono valutati.'
        when 'nl' then 'Camerakwaliteit en hoek beinvloeden de betrouwbaarheid; onduidelijke momenten worden niet gescoord.'
        when 'tr' then 'Kamera kalitesi ve aci guveni etkiler; belirsiz anlar puanlanmaz.'
        when 'ar' then 'جودة وزاوية الكاميرا تؤثران على الثقة؛ اللحظات غير الواضحة لا يتم تقييمها.'
        else 'Camera quality and angle affect confidence; unclear moments are not scored.'
      end
    when 'evidence' then
      case locale_key
        when 'hr' then 'Jasno vidljiva nogometna akcija podupire ovu ocjenu.'
        when 'de' then 'Sichtbare Fussballaktion im Clip stuetzt diese Bewertung.'
        when 'bs' then 'Jasno vidljiva nogometna akcija podrzava ovu ocjenu.'
        when 'es' then 'La accion de futbol visible en el clip respalda esta puntuacion.'
        when 'pt' then 'A acao de futebol visivel no clipe sustenta esta pontuacao.'
        when 'sr' then 'Jasno vidljiva fudbalska akcija podrzava ovu ocenu.'
        when 'fr' then 'Une action de football visible dans le clip justifie cette note.'
        when 'it' then 'L azione calcistica visibile nel clip supporta questo punteggio.'
        when 'nl' then 'Zichtbare voetbalactie in de clip ondersteunt deze score.'
        when 'tr' then 'Klipte gorulen futbol aksiyonu bu puani destekliyor.'
        when 'ar' then 'اللقطة الكروية الظاهرة في الفيديو تدعم هذه الدرجة.'
        else 'Visible football action in this clip supports this score.'
      end
    when 'not_assessable' then
      case locale_key
        when 'hr' then 'Ova akcija nije dovoljno jasno vidljiva u ovom isjecku.'
        when 'de' then 'Diese Aktion ist in diesem Clip nicht klar genug sichtbar.'
        when 'bs' then 'Ova akcija nije dovoljno jasno vidljiva u ovom klipu.'
        when 'es' then 'Esta accion no se ve con suficiente claridad en este clip.'
        when 'pt' then 'Esta acao nao esta suficientemente visivel neste clipe.'
        when 'sr' then 'Ova akcija nije dovoljno jasno vidljiva u ovom klipu.'
        when 'fr' then 'Cette action n est pas suffisamment visible dans ce clip.'
        when 'it' then 'Questa azione non e abbastanza visibile in questo clip.'
        when 'nl' then 'Deze actie is niet duidelijk genoeg zichtbaar in deze clip.'
        when 'tr' then 'Bu aksiyon bu klipte yeterince net gorunmuyor.'
        when 'ar' then 'هذه اللقطة غير واضحة بما يكفي للتقييم في هذا الفيديو.'
        else 'This action is not clearly visible enough in this clip.'
      end
    when 'feedback' then
      case locale_key
        when 'hr' then 'Analiza se temelji samo na jasno vidljivim nogometnim akcijama. Fokusiraj se na metrike s najnizom ocjenom za iduci napredak.'
        when 'de' then 'Die Analyse basiert nur auf klar sichtbaren Fussballaktionen. Konzentriere dich auf die niedrigsten Metriken, um dich zu verbessern.'
        when 'bs' then 'Analiza je zasnovana samo na jasno vidljivim nogometnim akcijama. Fokusiraj se na metrike s najnizom ocjenom za napredak.'
        when 'es' then 'Este analisis se basa solo en acciones de futbol claramente visibles. Enfocate en las metricas mas bajas para mejorar.'
        when 'pt' then 'Esta analise baseia se apenas em acoes de futebol claramente visiveis. Foque se nas metricas mais baixas para evoluir.'
        when 'sr' then 'Analiza je zasnovana samo na jasno vidljivim fudbalskim akcijama. Fokusiraj se na metrike sa najnizom ocenom za napredak.'
        when 'fr' then 'Cette analyse se base uniquement sur les actions clairement visibles. Concentre toi sur les metriques les plus faibles pour progresser.'
        when 'it' then 'Questa analisi si basa solo su azioni calcistiche chiaramente visibili. Concentrati sulle metriche piu basse per migliorare.'
        when 'nl' then 'Deze analyse is alleen gebaseerd op duidelijk zichtbare voetbalacties. Focus op je laagste metrics om te verbeteren.'
        when 'tr' then 'Bu analiz yalnizca net gorulen futbol aksiyonlarina dayanir. Gelismek icin en dusuk metriklere odaklan.'
        when 'ar' then 'يعتمد هذا التحليل فقط على اللقطات الكروية الواضحة. ركّز على أقل المؤشرات لتحسين الأداء.'
        else 'This analysis is based only on clearly visible football actions. Focus on your lowest-rated metrics to improve your next clip.'
      end
    else null
  end;
$$;

with analysis_locale as (
  select
    a.id,
    public.goalnova_ai_locale_bucket(u.language_preference) as locale_key,
    a.visibility_analysis
  from public.ai_analyses a
  join public.users u on u.id = a.user_id
),
rewritten_metrics as (
  select
    al.id,
    jsonb_object_agg(
      m.key,
      jsonb_set(
        jsonb_set(
          m.value,
          '{evidence}',
          to_jsonb(
            case
              when public.goalnova_ai_is_legacy_english(m.value->>'evidence')
                then public.goalnova_ai_copy(al.locale_key, 'evidence')
              else coalesce(m.value->>'evidence', '')
            end
          ),
          true
        ),
        '{reason}',
        to_jsonb(
          case
            when public.goalnova_ai_is_legacy_english(m.value->>'reason')
              then public.goalnova_ai_copy(al.locale_key, 'not_assessable')
            else coalesce(m.value->>'reason', '')
          end
        ),
        true
      )
    ) as metrics_json
  from analysis_locale al
  join lateral jsonb_each(coalesce(al.visibility_analysis->'metrics', '{}'::jsonb)) as m(key, value) on true
  group by al.id
)
update public.ai_analyses a
set
  feedback_text = case
    when public.goalnova_ai_is_legacy_english(a.feedback_text)
      then public.goalnova_ai_copy(public.goalnova_ai_locale_bucket(u.language_preference), 'feedback')
    else a.feedback_text
  end,
  visibility_analysis = case
    when a.visibility_analysis is null then a.visibility_analysis
    else jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            a.visibility_analysis,
            '{clip_summary}',
            to_jsonb(
              case
                when public.goalnova_ai_is_legacy_english(a.visibility_analysis->>'clip_summary')
                  then public.goalnova_ai_copy(public.goalnova_ai_locale_bucket(u.language_preference), 'clip_summary')
                else coalesce(a.visibility_analysis->>'clip_summary', '')
              end
            ),
            true
          ),
          '{camera,assessment_note}',
          to_jsonb(
            case
              when public.goalnova_ai_is_legacy_english(a.visibility_analysis#>>'{camera,assessment_note}')
                then public.goalnova_ai_copy(public.goalnova_ai_locale_bucket(u.language_preference), 'camera_note')
              else coalesce(a.visibility_analysis#>>'{camera,assessment_note}', '')
            end
          ),
          true
        ),
        '{camera,quality}',
        to_jsonb(
          case lower(coalesce(a.visibility_analysis#>>'{camera,quality}', ''))
            when 'strong' then
              case public.goalnova_ai_locale_bucket(u.language_preference)
                when 'hr' then 'jako'
                when 'de' then 'stark'
                when 'bs' then 'jako'
                when 'es' then 'alta'
                when 'pt' then 'forte'
                when 'sr' then 'jako'
                when 'fr' then 'forte'
                when 'it' then 'alta'
                when 'nl' then 'sterk'
                when 'tr' then 'yuksek'
                when 'ar' then 'قوي'
                else 'strong'
              end
            when 'adequate' then
              case public.goalnova_ai_locale_bucket(u.language_preference)
                when 'hr' then 'solidno'
                when 'de' then 'ausreichend'
                when 'bs' then 'solidno'
                when 'es' then 'aceptable'
                when 'pt' then 'adequada'
                when 'sr' then 'solidno'
                when 'fr' then 'correcte'
                when 'it' then 'adeguata'
                when 'nl' then 'voldoende'
                when 'tr' then 'yeterli'
                when 'ar' then 'مقبول'
                else 'adequate'
              end
            when 'limited' then
              case public.goalnova_ai_locale_bucket(u.language_preference)
                when 'hr' then 'ograniceno'
                when 'de' then 'begrenzt'
                when 'bs' then 'ograniceno'
                when 'es' then 'limitada'
                when 'pt' then 'limitada'
                when 'sr' then 'ograniceno'
                when 'fr' then 'limitee'
                when 'it' then 'limitata'
                when 'nl' then 'beperkt'
                when 'tr' then 'sinirli'
                when 'ar' then 'محدود'
                else 'limited'
              end
            else coalesce(a.visibility_analysis#>>'{camera,quality}', '')
          end
        ),
        true
      ),
      '{metrics}',
      coalesce((select rm.metrics_json from rewritten_metrics rm where rm.id = a.id), '{}'::jsonb),
      true
    )
  end
from public.users u
where u.id = a.user_id;

drop function if exists public.goalnova_ai_copy(text, text);
drop function if exists public.goalnova_ai_is_legacy_english(text);
drop function if exists public.goalnova_ai_locale_bucket(text);
