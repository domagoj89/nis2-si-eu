/**
 * Cloudflare Pages Function: /subscribe
 * Accepts POST { email, source } from site.js
 * Forwards to beehiiv API (free tier handles subscriber creation)
 *
 * Environment variables required (set in Cloudflare Pages dashboard):
 *   BEEHIIV_API_KEY  — beehiiv API key (Settings → API Keys)
 *   BEEHIIV_PUB_ID   — beehiiv Publication ID (from your publication URL)
 *
 * If env vars are not set, returns 200 anyway (fail-open) so UX is never broken.
 */
export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false, error: "invalid email" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const apiKey = env.BEEHIIV_API_KEY;
  const pubId  = env.BEEHIIV_PUB_ID;

  // Fail-open: if not configured, return 200 so UX works before beehiiv is set up
  if (!apiKey || !pubId) {
    return new Response(JSON.stringify({ ok: true, note: "not configured" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const tags = buildTags(body);

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: false,
          utm_source: "nis2-narzedzia.pl",
          utm_medium: "email-gate",
          utm_campaign: body.source || "inline",
          tags: [...tags, "seq_started"],
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    const ok = res.status === 200 || res.status === 201;

    // Send sequence email 0 immediately via Resend
    if (ok && env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      const tier = tags.find(t => t === "score_low") ? "A"
                 : tags.find(t => t === "score_high") ? "C" : "B";
      await sendSequenceEmail0(email, tier, env).catch(() => {});
    }

    return new Response(JSON.stringify({ ok, status: res.status, data }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    // Network error — still return 200 so UX isn't broken
    return new Response(JSON.stringify({ ok: true, note: "upstream error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// Build Beehiiv tags from quiz answers for segmented email sequences
function buildTags(body) {
  const tags = [];
  const qa   = body.quiz_answers || {};
  const score = Number(qa.score) || 0;

  // Score tier — drives which nurture sequence subscriber receives
  if (score <= 3)      tags.push("score_low");
  else if (score <= 6) tags.push("score_mid");
  else                 tags.push("score_high");

  // Sector
  if (qa.sector) tags.push("sector_" + qa.sector);

  // Role
  if (qa.role)   tags.push("role_" + qa.role);

  // Missing items — used for personalised email subject lines + content
  if (qa.registered === "no" || qa.registered === "unknown") tags.push("missing_registration");
  if (qa.has_isms === "no" || qa.has_isms === "partial")      tags.push("missing_isms");
  if (qa.has_training === "no")                               tags.push("missing_training");
  if (qa.has_insurance === "no" || qa.has_insurance === "unknown") tags.push("missing_insurance");

  // Source tag
  if (body.source) tags.push("source_" + body.source.replace(/[^a-z0-9_]/gi, "_"));

  return tags.filter(Boolean);
}

// Immediate sequence email — sent the moment someone subscribes
async function sendSequenceEmail0(email, tier, env) {
  const EMAILS = {"A": {"subject": "Vaš akcijski načrt NIS2 — 3 dni, 3 koraki", "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Pravkar ste zaključili kviz NIS2 — vaš rezultat kaže, da je pred vami še precej dela pred rokom. <br><br> <strong>Dobra novica:</strong> Podjetja v podobnem položaju dosežejo skladnost v 60–90 dneh, če začnejo s pravimi koraki. </p> <h3 style=\"font-family:sans-serif;color:#1e3a5f;\">Vaš 3-dnevni začetni načrt:</h3> <p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"> <strong>Dan 1 (30 min) — Preverite, ali vaše podjetje spada pod NIS2:</strong><br> <a href=\"https://nis2-si.eu/kalkulator.html\" style=\"color:#1e3a5f;\">Preverite zavezanost z NIS2 kalkulatorjem →</a> <br><br> <strong>Dan 2 (20 min) — Vzpostavite brezplačni ISMS:</strong><br> <a href=\"https://nis2-si.eu/orodja/isms-online.html\" style=\"color:#1e3a5f;\">ISMS.online — brezplačen načrt za do 25 zaposlenih →</a> <br><br> <strong>Dan 3 (30 min) — Usposobite vodstvo:</strong><br> <a href=\"https://www.knowbe4.com/\" style=\"color:#1e3a5f;\">KnowBe4 — 14-dnevni preizkus →</a> <br><br> <a href=\"https://nis2-si.eu/#tracker-section\" style=\"color:#1e3a5f;\">Spremljajte napredek v sledilniku NIS2 →</a> </p>"}, "B": {"subject": "Vaš rezultat NIS2: dober začetek — tako dosežete 100 %", "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Osnove NIS2 že imate — to je dober znak. Manjkajo vam 2–3 elementi, ki jih nadzorni organi najpogosteje preverjajo. </p> <p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"> <strong>Penetracijski testi (čl. 21(2)(f)):</strong><br> <a href=\"https://nis2-si.eu/testy-penetracyjne.html\" style=\"color:#1e3a5f;\">Vodič po penetracijskem testiranju →</a> <br><br> <strong>MFA za privilegirane račune (čl. 21(2)(i)):</strong><br> <a href=\"https://nis2-si.eu/orodja/1password.html\" style=\"color:#1e3a5f;\">1Password Business — MFA + upravljalnik gesel →</a> <br><br> <strong>Varnost dobavne verige (čl. 21(2)(d)):</strong><br> <a href=\"https://nis2-si.eu/bezpieczenstwo-lancucha-dostaw.html\" style=\"color:#1e3a5f;\">Vodič za varnost dobaviteljev →</a> <br><br> <a href=\"https://nis2-si.eu/#tracker-section\" style=\"color:#1e3a5f;\">Označite napredek v sledilniku NIS2 →</a> </p>"}, "C": {"subject": "Odličen rezultat NIS2 — tukaj je vaš zadnji korak", "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Visoka stopnja pripravljenosti na NIS2 — res dober rezultat. Ena točka ostaja odprta: formalna zunanja validacija. </p> <p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"> <strong>Penetracijski test</strong> — dokaz učinkovitosti varnostnih ukrepov (čl. 21(2)(f)):<br> <a href=\"https://cobalt.io/\" style=\"color:#1e3a5f;\">Cobalt.io →</a> <br><br> <strong>Certifikacija ISO 27001</strong> — zunanja validacija celotnega ISMS:<br> <a href=\"https://nis2-si.eu/certyfikacja-iso-27001.html\" style=\"color:#1e3a5f;\">Vodič za ISO 27001 →</a> <br><br> <a href=\"https://nis2-si.eu/#tracker-section\" style=\"color:#1e3a5f;\">Preverite zadnje kontrolne točke →</a> </p>"}};

  const msg = EMAILS[tier] || EMAILS["B"];
  const footer = `<hr style="margin:2rem 0;border:none;border-top:1px solid #e5e7eb;">
<p style="font-family:sans-serif;font-size:12px;color:#9ca3af;">
  nis2-si.eu &nbsp;|&nbsp;
  <a href="https://nis2-narzedzia.pl/unsubscribe?email=${encodeURIComponent(email)}" style="color:#9ca3af;">Wypisz się</a>
</p>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      subject: msg.subject,
      html: msg.html + footer,
    }),
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
