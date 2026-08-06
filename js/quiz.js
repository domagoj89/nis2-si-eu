/* KSC/NIS2 Compliance Quiz v2 — quiz.js */

(function () {
  "use strict";

  const REPORT_ENDPOINT    = "/generate-report";
  const SUBSCRIBE_ENDPOINT = "/subscribe";

  // ── Affiliate + tool links ──────────────────────────────────────────────────
  const LINKS = {
    reglyze:      { name: "Reglyze",      url: "https://reglyze.com",         review: "orodja/reglyze.html" },
    secfix:       { name: "Secfix",       url: "https://secfix.com",          review: "orodja/secfix.html" },
    isms_online:  { name: "ISMS.online",  url: "https://isms.online",         review: "orodja/isms-online.html" },
    knowbe4:      { name: "KnowBe4",      url: "https://knowbe4.com",         review: "szkolenia-nis2.html" },
    hiscox:       { name: "Hiscox Cyber", url: "https://hiscox.com",          review: "ubezpieczenie-cyber.html" },
    onepassword:  { name: "1Password",    url: "https://1password.com",       review: "orodja/1password.html" },
    nordlayer:    { name: "NordLayer",    url: "https://nordlayer.com",       review: "orodja/nordlayer.html" },
    cobalt:       { name: "Cobalt.io",    url: "https://cobalt.io",           review: "testy-penetracyjne.html" },
    bsi:          { name: "BSI ISO 27001",url: "https://bsigroup.com/pl-PL/", review: "iso-27001-orodja.html" },
  };

  // ── Tool recommendation by sector + budget ─────────────────────────────────
  const ISMS_RECS = {
    "annex1:free":  "reglyze",   "annex1:low":   "isms_online",
    "annex1:mid":   "secfix",    "annex1:high":  "secfix",
    "annex2:free":  "reglyze",   "annex2:low":   "reglyze",
    "annex2:mid":   "isms_online","annex2:high":  "secfix",
    "other:free":   "reglyze",   "other:low":    "reglyze",
    "other:mid":    "reglyze",   "other:high":   "isms_online",
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    step: 0,
    answers: {},
    score: 0,
    missing: [],
    email: null,
  };

  // ── Questions ──────────────────────────────────────────────────────────────
  const questions = [
    {
      id: "sector",
      title: "V katerem sektorju deluje vaše podjetje?",
      hint: "Izberite sektor, ki najbolje opisuje vašo glavno dejavnost.",
      options: [
        { value: "annex1", icon: "⚡", label: "Ključni sektor (Annexe I)",
          sub: "Energetika, promet, bančništvo, finance, zdravstvo, voda, digitalna infrastruktura, javna uprava" },
        { value: "annex2", icon: "📦", label: "Pomemben sektor (Annexe II)",
          sub: "Pošta, ravnanje z odpadki, kemikalije, živila, industrijska proizvodnja, ponudniki digitalnih storitev, MSP/IT" },
        { value: "other", icon: "🏗️", label: "Drug sektor",
          sub: "Gradbeništvo, maloprodaja, gostinstvo, zasebno izobraževanje, drugo" },
      ]
    },
    {
      id: "size",
      title: "Koliko oseb zaposluje vaše podjetje?",
      hint: "Skupaj z vsemi zaposlenimi in sodelavci.",
      options: [
        { value: "micro",  icon: "👤", label: "Manj kot 50 zaposlenih",  sub: "Mikro / malo podjetje" },
        { value: "medium", icon: "👥", label: "50–249 zaposlenih",        sub: "Srednje podjetje" },
        { value: "large",  icon: "🏢", label: "250 ali več zaposlenih",   sub: "Veliko podjetje" },
      ]
    },
    {
      id: "revenue",
      title: "Kakšen je letni prihodek vašega podjetja?",
      hint: "Letni prihodki ali bilančna vsota.",
      options: [
        { value: "small",  icon: "💶", label: "Pod 10 milijonov EUR letno",  sub: "Mikro / malo podjetje" },
        { value: "medium", icon: "💰", label: "10–50 milijonov EUR letno",   sub: "Srednje podjetje" },
        { value: "large",  icon: "💎", label: "Nad 50 milijonov EUR letno",  sub: "Veliko podjetje" },
      ]
    },
    {
      id: "budget",
      title: "Kakšen letni proračun imate za skladnost z NIS2/ZInfV-1?",
      hint: "Prilagodili bomo orodja vašim finančnim zmožnostim.",
      options: [
        { value: "free", icon: "🆓", label: "Iščem brezplačno rešitev", sub: "Brezplačen načrt ali enkratni strošek uvedbe" },
        { value: "low",  icon: "💵", label: "Do 200 EUR letno",          sub: "Osnovno orodje SaaS" },
        { value: "mid",  icon: "💳", label: "200–600 EUR letno",         sub: "Celotna platforma za skladnost" },
        { value: "high", icon: "🏦", label: "Nad 600 EUR letno",         sub: "Rešitev za podjetja" },
      ]
    },
    {
      id: "registered",
      title: "Ali je vaše podjetje že registrirano pri URSIV?",
      hint: "po ZInfV-1 (rok za registracijo pri URSIV je bil december 2025). To je prva obveznost.",
      options: [
        { value: "yes",  icon: "✅", label: "Da, že smo se registrirali", sub: "Samoidentifikacija opravljena" },
        { value: "no",   icon: "❌", label: "Ne, tega še nismo storili", sub: "Prioriteta št. 1 — rok: december 2025" },
        { value: "unknown", icon: "❓", label: "Ne vem / nisem prepričan", sub: "Skupaj bomo preverili" },
      ]
    },
    {
      id: "has_isms",
      title: "Ali imate vzpostavljen sistem upravljanja varnosti informacij (ISMS)?",
      hint: "ISMS je zbirka politik, postopkov in varnostnih kontrol — zahteva ga Art. 21 NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Da, imamo delujoč ISMS",           sub: "Dokumentirane varnostne politike in postopki" },
        { value: "partial", icon: "🔄", label: "Delamo na uvedbi",                 sub: "V teku — a še ni dokončano" },
        { value: "no",      icon: "❌", label: "Ne, na tem področju nimamo ničesar", sub: "Nimamo sistema upravljanja varnosti" },
      ]
    },
    {
      id: "has_training",
      title: "Ali so zaposleni in vodstvo opravili usposabljanje s področja kibernetske varnosti?",
      hint: "Usposabljanje vodstva je zakonska obveznost na podlagi Art. 20 NIS2.",
      options: [
        { value: "yes", icon: "✅", label: "Da, imamo redna usposabljanja",         sub: "Zaposleni in vodstvo so usposobljeni" },
        { value: "no",  icon: "❌", label: "Ne, nimamo usposabljanj na tem področju", sub: "Usposabljanje vodstva je zakonska obveznost po ZInfV-1" },
      ]
    },
    {
      id: "has_insurance",
      title: "Ali ima vaše podjetje zavarovanje pred kibernetskimi tveganji?",
      hint: "Kibernetsko zavarovanje prenaša rezidualno tveganje in je sestavni del upravljanja tveganj po NIS2.",
      options: [
        { value: "yes",     icon: "✅", label: "Da, imamo kibernetsko zavarovanje",    sub: "Tveganje je zavarovano" },
        { value: "no",      icon: "❌", label: "Ne, nimamo zavarovanja",              sub: "Spletna ponudba traja 20 minut" },
        { value: "unknown", icon: "❓", label: "Ne vem / nisem slišal za to",         sub: "Pojasnili bomo, kaj je in koliko stane" },
      ]
    },
    {
      id: "role",
      title: "Kakšno vlogo imate v podjetju?",
      hint: "Načrt bomo prilagodili vašim obveznostim in pooblastilom za odločanje.",
      options: [
        { value: "ceo",        icon: "👔", label: "Lastnik / CEO / Uprava",      sub: "Odgovarjate za odločitve in proračun" },
        { value: "it",         icon: "💻", label: "IT Manager / CTO / CISO",     sub: "Odgovarjate za tehnično uvedbo" },
        { value: "compliance", icon: "📋", label: "Compliance / Pravnik",        sub: "Odgovarjate za pravno skladnost" },
        { value: "cfo",        icon: "💰", label: "CFO / Finančni direktor",     sub: "Odgovarjate za proračun in finančno tveganje" },
      ]
    },
  ];

  const TOTAL = questions.length;

  // ── Score calculation ──────────────────────────────────────────────────────
  function computeScore() {
    const a = state.answers;
    let score = 2; // base: everyone has some basics
    const missing = [];

    if (a.registered === "yes")        { score += 2; }
    else                               { missing.push("registration"); }

    if (a.has_isms === "yes")          { score += 3; }
    else if (a.has_isms === "partial") { score += 1; missing.push("isms"); }
    else                               { missing.push("isms"); }

    if (a.has_training === "yes")      { score += 2; }
    else                               { missing.push("training"); }

    if (a.has_insurance === "yes")     { score += 1; }
    else                               { missing.push("insurance"); }

    score = Math.min(10, Math.max(1, score));
    state.score   = score;
    state.missing = missing;
    try { sessionStorage.setItem("nis2_quiz_gaps", JSON.stringify(missing)); } catch(e) {}
    return { score, missing };
  }

  function computeScope() {
    const { sector, size, revenue } = state.answers;
    if (sector === "other") return "out";
    const isLarge  = size === "large"  || revenue === "large";
    const isMedium = !isLarge && (size === "medium" || revenue === "medium");
    if (sector === "annex1" && isLarge)           return "essential";
    if (sector === "annex1" && isMedium)          return "important";
    if (sector === "annex2" && (isLarge||isMedium)) return "important";
    return "check"; // small companies in scope sectors
  }

  // ── Today actions (client-side, shown on result screen immediately) ────────
  function buildTodayActions() {
    const missing   = state.missing;
    const sector    = state.answers.sector  || "annex2";
    const budget    = state.answers.budget  || "low";
    const ismsTool  = LINKS[ISMS_RECS[sector+":"+budget] || "reglyze"];
    const actions   = [];

    if (missing.includes("registration")) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · brezplačno",
        title: "Registrirajte podjetje pri URSIV",
        desc:  "po ZInfV-1 (rok za registracijo pri URSIV je bil december 2025). Spletni obrazec za samoidentifikacijo. To je vaša prioriteta #1.",
        cta:   "Navodila korak za korakom →",
        url:   "registracija-zavezancev.html",
        affiliate: false,
      });
    }

    if (missing.includes("isms")) {
      actions.push({
        step: actions.length + 1,
        time: "20 min · brezplačen načrt",
        title: "Vzpostavite sistem ISMS — " + ismsTool.name,
        desc:  "Brezplačen načrt pokriva celotno oceno vrzeli NIS2. Po registraciji: izpolnite vgrajeni vprašalnik ZInfV-1 — umetna inteligenca samodejno ustvari politike.",
        cta:   "Začnite za €0 → " + ismsTool.name,
        url:   ismsTool.url,
        affiliate: true,
        badge: "Priporočilo #1",
      });
    }

    if (missing.includes("insurance")) {
      actions.push({
        step: actions.length + 1,
        time: "20 min · spletna ponudba",
        title: "Pridobite ponudbo kibernetskega zavarovanja",
        desc:  "Prenos tveganja je sestavni del upravljanja tveganj po NIS2. Hiscox ponudba: 20 minut online, brez pogovora z agentom.",
        cta:   "Preverite ponudbo Hiscox →",
        url:   LINKS.hiscox.url,
        affiliate: true,
      });
    }

    if (missing.includes("training")) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · 14-dnevni brezplačni preizkus",
        title: "Vzpostavite usposabljanja s področja kibernetske varnosti — KnowBe4",
        desc:  "Usposabljanje vodstva je zakonska obveznost (Art. 20 ZInfV-1). KnowBe4: spletna platforma, prvi modul poslan ekipi v 24 urah.",
        cta:   "Začnite brezplačni preizkus →",
        url:   LINKS.knowbe4.url,
        affiliate: true,
      });
    }

    // Always suggest 1Password if no training (implies basics missing)
    if (missing.includes("isms") && actions.length < 5) {
      actions.push({
        step: actions.length + 1,
        time: "30 min · 14-dnevni brezplačni preizkus",
        title: "Uvedite upravitelja gesel + MFA — 1Password",
        desc:  "Večfaktorska avtentikacija (MFA) je zahtevana z Art. 21(j) ZInfV-1. 1Password Business: nastavitev v 30 minutah, uvedba za ekipo isti dan.",
        cta:   "Začnite brezplačni preizkus →",
        url:   LINKS.onepassword.url,
        affiliate: true,
      });
    }

    return actions.slice(0, 4); // max 4 today actions
  }

  // ── GA4 helper ─────────────────────────────────────────────────────────────
  function track(event, params) {
    if (typeof gtag === "function") gtag("event", event, params || {});
  }

  // ── Render: question step ──────────────────────────────────────────────────
  function renderStep() {
    const q   = questions[state.step];
    const el  = document.getElementById("quiz-container");
    if (!el) return;

    const pct    = Math.round((state.step / TOTAL) * 100);
    const isLast = state.step === TOTAL - 1;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:${pct}%"></div>
        </div>
        <p class="text-sm text-gray" style="margin-bottom:.25rem;">Vprašanje ${state.step + 1} od ${TOTAL}</p>
        <h3>${q.title}</h3>
        <p style="color:var(--gray-500);font-size:.9rem;margin-bottom:1rem;">${q.hint}</p>
        <div class="quiz-options">
          ${q.options.map(opt => `
            <button class="quiz-option${state.answers[q.id] === opt.value ? " selected" : ""}"
                    data-value="${opt.value}" type="button">
              <span class="quiz-option__icon">${opt.icon}</span>
              <span>
                <span class="quiz-option__text">${opt.label}</span>
                <span class="quiz-option__sub">${opt.sub}</span>
              </span>
            </button>
          `).join("")}
        </div>
        <div class="quiz-nav">
          ${state.step > 0
            ? `<button class="btn btn--outline btn--sm" id="quiz-back">← Nazaj</button>`
            : `<span></span>`}
          <button class="btn btn--primary btn--sm" id="quiz-next"
                  ${state.answers[q.id] ? "" : "disabled"}>
            ${isLast ? "Izračunaj moj rezultat →" : "Naprej →"}
          </button>
        </div>
      </div>`;

    el.querySelectorAll(".quiz-option").forEach(btn => {
      btn.addEventListener("click", () => {
        state.answers[q.id] = btn.dataset.value;
        el.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        el.querySelector("#quiz-next").removeAttribute("disabled");
        track("quiz_answer", { question: q.id, answer: btn.dataset.value });
        // Auto-advance on click for faster UX
        setTimeout(() => {
          if (isLast) { computeScore(); renderScoreGate(); }
          else { state.step++; renderStep(); }
        }, 280);
      });
    });

    el.querySelector("#quiz-back")?.addEventListener("click", () => {
      state.step--;
      renderStep();
    });

    el.querySelector("#quiz-next")?.addEventListener("click", () => {
      if (!state.answers[q.id]) return;
      if (isLast) { computeScore(); renderScoreGate(); }
      else { state.step++; renderStep(); }
    });
  }

  // ── Render: score + email gate ─────────────────────────────────────────────
  function renderScoreGate() {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing } = state;
    const pct    = Math.round((score / 10) * 100);
    const scope  = computeScope();

    const scoreColor = score <= 3 ? "#dc2626"
                     : score <= 6 ? "#d97706"
                     : "#16a34a";

    const scopeMsg = {
      essential: "Vaše podjetje je <strong>ključni subjekt po ZInfV-1</strong> — najvišja raven zahtev.",
      important:  "Vaše podjetje je <strong>pomemben subjekt po ZInfV-1</strong> — izpolniti morate zahteve NIS2.",
      check:      "Vaše podjetje je morda zavezanec po ZInfV-1 — preverite izjeme za mala podjetja.",
      out:        "Vaše podjetje verjetno ni zavezanec po ZInfV-1 — vseeno priporočamo uvedbo osnov.",
    }[scope] || "";

    const gapText = missing.length === 0
      ? "Čestitamo — vzpostavili ste vse ključne varnostne ukrepe!"
      : `Manjka vam <strong>${missing.length}</strong> ključnih varnostnih ukrepov. Večino lahko uvedete v 3 dneh.`;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:100%"></div>
        </div>

        <div style="text-align:center;padding:1rem 0 .5rem;">
          <div style="font-size:.8rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;">
            Vaš rezultat skladnosti z NIS2
          </div>
          <div style="font-size:3.5rem;font-weight:800;color:${scoreColor};line-height:1;">
            ${score}<span style="font-size:1.5rem;color:var(--gray-400);font-weight:500;">/10</span>
          </div>
          <div style="margin:.75rem auto;max-width:280px;height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;transition:width 1s;"></div>
          </div>
          <p style="font-size:.9rem;color:var(--gray-600);">${scopeMsg}</p>
          <p style="font-size:.92rem;">${gapText}</p>
        </div>

        <div style="background:#f0f7ff;border-radius:12px;padding:1.25rem;margin:1rem 0;">
          <p style="font-size:.95rem;font-weight:700;color:#1a1a2e;margin:0 0 .35rem;">
            📬 Prejemite svoj 3-dnevni akcijski načrt
          </p>
          <p style="font-size:.82rem;color:#555;margin:0 0 .75rem;">
            Vaš prilagojen načrt: kaj narediti danes, jutri in ta teden.
            Pripravljene povezave do orodij + AI-poziv za Claude / ChatGPT / Gemini.
          </p>
          <form id="score-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <input type="email" name="email" placeholder="vas@email.si" required
                   style="flex:1;min-width:180px;padding:.6rem .9rem;border:1px solid #d1d5db;border-radius:8px;font-size:.95rem;">
            <button type="submit" class="btn btn--primary">Pošlji mi načrt →</button>
          </form>
          <p style="font-size:.75rem;color:#9ca3af;margin:.5rem 0 0;">Brez neželene pošte. En e-mail z načrtom + izbirni opomniki.</p>
        </div>

        <button id="quiz-skip-email" type="button"
                style="background:none;border:none;color:var(--gray-400);font-size:.8rem;cursor:pointer;width:100%;text-align:center;padding:.25rem 0;">
          Prikaži samo rezultat, brez načrta →
        </button>
      </div>`;

    track("quiz_score_shown", { score, missing: missing.join(","), scope });

    document.getElementById("score-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Pošiljanje...";
      state.email = email;
      _submitEmailAndReport(email, () => renderResult(true));
    });

    document.getElementById("quiz-skip-email")?.addEventListener("click", () => {
      track("quiz_email_skipped");
      renderResult(false);
    });
  }

  // ── Submit email to Beehiiv + trigger report ───────────────────────────────
  function _submitEmailAndReport(email, onDone) {
    const { score, missing, answers } = state;

    // Score tier tag
    const scoreTier = score <= 3 ? "score_low" : score <= 6 ? "score_mid" : "score_high";
    const tags = [scoreTier,
      "sector_" + (answers.sector || "unknown"),
      "role_"   + (answers.role   || "unknown"),
      ...(missing.includes("registration") ? ["missing_registration"] : []),
      ...(missing.includes("isms")         ? ["missing_isms"]         : []),
      ...(missing.includes("training")     ? ["missing_training"]     : []),
      ...(missing.includes("insurance")    ? ["missing_insurance"]    : []),
    ];

    // Call both endpoints in parallel
    const subscribeCall = fetch(SUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: "quiz_score_gate",
        tags,
        quiz_answers: {
          sector: answers.sector, size: answers.size, revenue: answers.revenue,
          budget: answers.budget, registered: answers.registered,
          has_isms: answers.has_isms, has_training: answers.has_training,
          has_insurance: answers.has_insurance, role: answers.role,
          score,
        },
      }),
    }).catch(() => {});

    const reportCall = fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector:        answers.sector,
        size:          answers.size,
        revenue:       answers.revenue,
        budget:        answers.budget,
        registered:    answers.registered,
        has_isms:      answers.has_isms,
        has_training:  answers.has_training,
        has_insurance: answers.has_insurance,
        role:          answers.role,
        score,
        missing,
        email,
        lang:   document.documentElement.lang || "sl",
        domain: window.location.hostname,
      }),
    }).catch(() => {});

    Promise.allSettled([subscribeCall, reportCall]).then(() => {
      track("quiz_completed", { score, sector: answers.sector, email_captured: true });
      if (onDone) onDone();
    });
  }

  // ── Render: result with today-actions ──────────────────────────────────────
  function renderResult(emailCaptured) {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing, answers } = state;
    const scope    = computeScope();
    const actions  = buildTodayActions();
    const pct      = Math.round((score / 10) * 100);
    const scoreColor = score <= 3 ? "#dc2626" : score <= 6 ? "#d97706" : "#16a34a";

    const scopeBadge = {
      essential: { text: "🚨 Ključni subjekt",        color: "#fee2e2", tc: "#991b1b" },
      important:  { text: "⚠️ Pomemben subjekt",       color: "#fefce8", tc: "#854d0e" },
      check:      { text: "🔍 Preverite izjeme",       color: "#fefce8", tc: "#854d0e" },
      out:        { text: "✅ Verjetno ni zavezanec",  color: "#dcfce7", tc: "#166534" },
    }[scope] || { text: "ZInfV-1", color: "#e5e7eb", tc: "#374151" };

    function actionCard(a) {
      const isAffiliate = a.affiliate;
      return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:1rem 1.1rem;margin-bottom:.75rem;${isAffiliate ? "border-left:3px solid var(--navy);" : ""}">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;">
            <span style="background:var(--navy);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;">${a.step}</span>
            <span style="font-size:.75rem;color:var(--gray-500);">${a.time}</span>
            ${isAffiliate && a.badge ? `<span style="background:#dcfce7;color:#166534;font-size:.68rem;font-weight:700;padding:.1rem .45rem;border-radius:4px;">${a.badge}</span>` : ""}
          </div>
          <div style="font-weight:700;font-size:.95rem;margin-bottom:.3rem;">${a.title}</div>
          <div style="font-size:.82rem;color:#555;margin-bottom:.6rem;">${a.desc}</div>
          <a href="${a.url}" ${isAffiliate ? 'target="_blank" rel="nofollow noopener"' : ''}
             style="display:inline-block;padding:.45rem .9rem;background:var(--navy);color:#fff;border-radius:6px;font-size:.82rem;font-weight:600;text-decoration:none;">
            ${a.cta}
          </a>
        </div>`;
    }

    const reskipBlock = missing.length === 0
      ? `<div style="background:#dcfce7;border-radius:10px;padding:1rem;text-align:center;margin-bottom:1rem;">
           <strong>🎉 Vaše podjetje je v dobri kondiciji!</strong><br>
           <span style="font-size:.85rem;">Vzpostavili ste vse ključne ukrepe NIS2. Razmislite o certifikaciji ISO 27001 kot dokazilu skladnosti.</span>
           <br><a href="iso-27001-orodja.html" style="font-size:.82rem;color:var(--navy);font-weight:700;">Izvedite več o ISO 27001 →</a>
         </div>`
      : actions.map(actionCard).join("");

    el.innerHTML = `
      <div class="quiz-card">

        ${emailCaptured
          ? `<div style="background:#dcfce7;border-radius:8px;padding:.6rem 1rem;font-size:.82rem;color:#166534;font-weight:600;margin-bottom:1rem;text-align:center;">
               ✅ Načrt poslan na ${state.email || "vaš e-mail"} — preverite nabiralnik
             </div>`
          : ""}

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:2.5rem;font-weight:800;color:${scoreColor};line-height:1;">
              ${score}<span style="font-size:1rem;color:var(--gray-400);font-weight:500;">/10</span>
            </div>
            <div style="font-size:.7rem;color:var(--gray-500);">Rezultat NIS2</div>
          </div>
          <div style="flex:1;min-width:140px;">
            <div style="height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-bottom:.35rem;">
              <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;"></div>
            </div>
            <span style="display:inline-block;padding:.2rem .6rem;border-radius:12px;font-size:.75rem;font-weight:700;background:${scopeBadge.color};color:${scopeBadge.tc};">
              ${scopeBadge.text}
            </span>
          </div>
        </div>

        <h3 style="font-size:1.05rem;margin-bottom:.35rem;">
          ${missing.length > 0
            ? `🏃 Naredite DANES — skupaj ~${Math.min(120, missing.length * 30)} minut`
            : "Vaš status NIS2"}
        </h3>
        <p style="font-size:.82rem;color:var(--gray-500);margin-bottom:1rem;">
          ${missing.length > 0
            ? `${missing.length} manjkajočih korakov. Spodnje lahko dokončate danes.`
            : "Vsi ključni ukrepi so vzpostavljeni."}
        </p>

        ${reskipBlock}

        ${missing.length > 0 ? `
          <div style="border-top:1px solid #e5e7eb;padding-top:1rem;margin-top:.5rem;">
            <p style="font-size:.78rem;color:var(--gray-500);margin-bottom:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">
              Naslednji koraki (rezervirajte termine)
            </p>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
              <a href="testy-penetracyjne.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔍 Penetracijski test
              </a>
              <a href="iso-27001-orodja.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🏅 Certifikacija ISO 27001
              </a>
              <a href="bezpieczenstwo-lancucha-dostaw.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔗 Varnost dobavne verige
              </a>
            </div>
          </div>` : ""}

        <div style="margin-top:1.25rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn--outline btn--sm" id="quiz-restart">← Začni znova</button>
          <a href="primerjava.html" class="btn btn--primary btn--sm">Primerjaj orodja NIS2 →</a>
        </div>

        ${!emailCaptured ? `
          <div style="margin-top:1rem;background:#f0f7ff;border-radius:8px;padding:.85rem;text-align:center;">
            <p style="font-size:.82rem;margin:0 0 .5rem;"><strong>Prejemite celoten načrt na e-mail</strong> z AI-pozivom in povezavami do orodij</p>
            <form id="late-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">
              <input type="email" placeholder="vas@email.si" required
                     style="flex:1;min-width:160px;padding:.45rem .75rem;border:1px solid #d1d5db;border-radius:6px;font-size:.85rem;">
              <button type="submit" class="btn btn--primary btn--sm">Pošlji →</button>
            </form>
          </div>` : ""}
      </div>`;

    document.getElementById("quiz-restart")?.addEventListener("click", () => {
      state.step = 0; state.answers = {}; state.score = 0;
      state.missing = []; state.email = null;
      try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
      renderStep();
    });

    document.getElementById("late-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true; btn.textContent = "Pošiljanje...";
      state.email = email;
      _submitEmailAndReport(email, () => {
        e.target.parentElement.innerHTML =
          `<p style="font-size:.82rem;color:#166534;font-weight:700;">✅ Poslano na ${email}</p>`;
      });
    });

    track("quiz_result_shown", { score, scope, email_captured: emailCaptured });
  }

  // ── FAQ accordion ──────────────────────────────────────────────────────────
  function initFaq() {
    document.querySelectorAll(".faq-question").forEach(btn => {
      btn.addEventListener("click", () => {
        const item   = btn.closest(".faq-item");
        const isOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach(i => i.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("quiz-container");
    if (container) renderStep();
    initFaq();
  });

})();