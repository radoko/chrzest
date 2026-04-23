(function () {
  const STORAGE_KEY = "gniewoslaw-chrzest-hash";
  const DATA_URL = "guests.json";

  const $ = (id) => document.getElementById(id);

  function readHashFromUrl() {
    const raw = window.location.hash || "";
    const clean = raw.replace(/^#/, "").trim();
    return clean || null;
  }

  function persistHash(hash) {
    try {
      localStorage.setItem(STORAGE_KEY, hash);
    } catch (_) { /* storage may be unavailable */ }
  }

  function loadPersistedHash() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function resolveHash() {
    const fromUrl = readHashFromUrl();
    if (fromUrl) {
      persistHash(fromUrl);
      return fromUrl;
    }
    return loadPersistedHash();
  }

  function formatNames(names) {
    if (!names || names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + " i " + names[1];
    return names.slice(0, -1).join(", ") + " i " + names[names.length - 1];
  }

  function childNameGenitive(name) {
    const map = {
      "Gniewosław Okomski": "Gniewosława Okomskiego",
    };
    return map[name] || name;
  }

  function applyEvent(event) {
    if (!event) return;
    $("childName").textContent = childNameGenitive(event.childName);
    $("eventDate").textContent = event.dateLabel;

    const c = event.ceremony;
    $("ceremonyTime").textContent = c.time;
    $("ceremonyPlace").textContent = c.locationName;
    $("ceremonyHint").textContent = c.locationHint;
    const ceremonyLink = $("ceremonyLink");
    ceremonyLink.href = c.mapsUrl;
    ceremonyLink.querySelector("span").textContent = c.mapsLabel;

    const r = event.reception;
    $("receptionTime").textContent = r.time;
    $("receptionPlace").textContent = r.locationName;
    $("receptionHint").textContent = r.locationHint;
    const receptionLink = $("receptionLink");
    receptionLink.href = r.mapsUrl;
    receptionLink.querySelector("span").textContent = r.mapsLabel;

    if (event.parents) {
      $("parentsNames").textContent =
        event.parents.mother.split(" ")[0] +
        " i " +
        event.parents.father.split(" ")[0] +
        " Okomscy";
    }
  }

  function applyGuest(guest) {
    $("greetingText").textContent = guest.greeting;
    document.body.classList.add("personalized");
    $("missingBlock").hidden = true;
    document.title = "Chrzest Gniewosława — zaproszenie dla " + formatNames(guest.names);
  }

  function showMissing() {
    document.body.classList.remove("personalized");
    $("missingBlock").hidden = false;
    $("greetingText").textContent = "Drogi Gościu";
  }

  function watchOnlineStatus() {
    const pill = $("offlinePill");
    function update() {
      pill.hidden = navigator.onLine;
    }
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  async function loadData() {
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load guests.json");
    return res.json();
  }

  async function main() {
    watchOnlineStatus();

    let data;
    try {
      data = await loadData();
    } catch (err) {
      console.warn("Could not fetch data", err);
      showMissing();
      return;
    }

    applyEvent(data.event);

    const hash = resolveHash();
    if (hash && data.guests && data.guests[hash]) {
      applyGuest(data.guests[hash]);
    } else {
      showMissing();
    }

    initCalendar();

    window.addEventListener("hashchange", () => {
      const newHash = readHashFromUrl();
      if (newHash && data.guests && data.guests[newHash]) {
        persistHash(newHash);
        applyGuest(data.guests[newHash]);
      }
    });
  }

  // ── Calendar integration ────────────────────────────────────────────
  const EVENTS = [
    {
      uid: "msza-gniewoslaw-chrzest-2026@radoko.github.io",
      title: "Chrzest Gniewosława — Msza Święta",
      startUtc: "20260621T110000Z",
      endUtc:   "20260621T123000Z",
      startLocal: "2026-06-21T13:00:00+02:00",
      endLocal:   "2026-06-21T14:30:00+02:00",
      location: "Kościół pw. Najświętszego Serca Pana Jezusa, Koszutka, Katowice",
      description: "Uroczystość Sakramentu Chrztu Świętego Gniewosława Okomskiego.\\nKoszutka: https://koszutka.pl/",
      url: "https://koszutka.pl/",
    },
    {
      uid: "przyjecie-gniewoslaw-chrzest-2026@radoko.github.io",
      title: "Chrzest Gniewosława — Przyjęcie",
      startUtc: "20260621T123000Z",
      endUtc:   "20260621T180000Z",
      startLocal: "2026-06-21T14:30:00+02:00",
      endLocal:   "2026-06-21T20:00:00+02:00",
      location: "Restauracja Smak Róży",
      description: "Przyjęcie rodzinne po chrzcie Gniewosława.\\nSmak Róży: https://smakrozy.pl/",
      url: "https://smakrozy.pl/",
    },
  ];

  function icsEscape(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function nowStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + "T" +
           p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + "Z";
  }

  function buildICS() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Gniewoslaw Chrzest//PL",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];
    const stamp = nowStamp();
    for (const e of EVENTS) {
      lines.push(
        "BEGIN:VEVENT",
        "UID:" + e.uid,
        "DTSTAMP:" + stamp,
        "DTSTART:" + e.startUtc,
        "DTEND:" + e.endUtc,
        "SUMMARY:" + icsEscape(e.title),
        "LOCATION:" + icsEscape(e.location),
        "DESCRIPTION:" + icsEscape(e.description),
        "URL:" + e.url,
        "END:VEVENT"
      );
    }
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function downloadICS() {
    const blob = new Blob([buildICS()], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chrzest-gniewoslaw.ics";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
  }

  function googleCalUrl(e) {
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: e.title,
      dates: e.startUtc + "/" + e.endUtc,
      location: e.location,
      details: e.description.replace(/\\n/g, "\n"),
    });
    return "https://calendar.google.com/calendar/render?" + p.toString();
  }

  function outlookCalUrl(e) {
    const p = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: e.title,
      startdt: e.startLocal,
      enddt:   e.endLocal,
      location: e.location,
      body: e.description.replace(/\\n/g, "\n"),
    });
    return "https://outlook.live.com/calendar/0/deeplink/compose?" + p.toString();
  }

  function initCalendar() {
    const btn = $("calendarBtn");
    const menu = $("calendarMenu");
    const googleLink = $("googleCalLink");
    const outlookLink = $("outlookCalLink");
    if (!btn || !menu) return;

    googleLink.href = googleCalUrl(EVENTS[0]);
    outlookLink.href = outlookCalUrl(EVENTS[0]);

    function toggleMenu(force) {
      const willOpen = force === undefined ? !menu.classList.contains("open") : force;
      menu.classList.toggle("open", willOpen);
      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    }
    btn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
    menu.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]");
      if (action && action.dataset.action === "ics") {
        e.preventDefault();
        downloadICS();
      }
      toggleMenu(false);
    });
    document.addEventListener("click", (e) => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) toggleMenu(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggleMenu(false);
    });
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js")
        .catch((err) => console.warn("SW registration failed", err));
    });
  }

  main();
})();
