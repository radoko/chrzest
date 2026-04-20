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

    window.addEventListener("hashchange", () => {
      const newHash = readHashFromUrl();
      if (newHash && data.guests && data.guests[newHash]) {
        persistHash(newHash);
        applyGuest(data.guests[newHash]);
      }
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
