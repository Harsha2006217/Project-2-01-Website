/* ============================================================
   Hond of kat? — Project 2 · Harsha Kanaparthi
   JavaScript in 8 genummerde blokken. Geen libraries.
   Alles werkt ook zonder JavaScript: de proeven staan in de HTML,
   alleen de tabel, filters en zoekvelden zijn verrijking.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 1. Meetgegevens ----------
     Bron: onze eigen testnotities in Liner.ai (zie 02-Productbewijs).
     confidence in procenten; oordeel = goed / let-op / fout. */
  var METINGEN = [
    { proef: 1, label: "1",  aanbod: "Gewone hondenfoto's",              voorspelling: "hond",        confidence: 90,    oordeel: "goed",   toelichting: "Geen echte fouten op de aangeboden foto's." },
    { proef: 2, label: "2",  aanbod: "Willekeurige objecten",            voorspelling: "overig",      confidence: 90,    oordeel: "goed",   toelichting: "Correct als niet-dier herkend." },
    { proef: 3, label: "3a", aanbod: "Extra foto's zonder dier — voor",  voorspelling: "overig",      confidence: 90,    oordeel: "goed",   toelichting: "Uitgangssituatie." },
    { proef: 3, label: "3b", aanbod: "Extra foto's zonder dier — na",    voorspelling: "overig",      confidence: 98,    oordeel: "goed",   toelichting: "+8 procentpunt na uitbreiden van de categorie." },
    { proef: 4, label: "4",  aanbod: "Half verscholen dier",             voorspelling: "juiste dier", confidence: 99.96, oordeel: "let-op", toelichting: "Hoogste zekerheid, terwijl er amper een dier zichtbaar is." },
    { proef: 5, label: "5a", aanbod: "Hond én kat in één foto",          voorspelling: "hond",        confidence: 75,    oordeel: "fout",   toelichting: "25% ging naar kat; het model moet één antwoord kiezen." },
    { proef: 5, label: "5b", aanbod: "Hond én kat — herhaling",          voorspelling: "hond of kat", confidence: 50,    oordeel: "fout",   toelichting: "50/50: het model gokt." },
    { proef: 6, label: "6a", aanbod: "Hybride, eerste beeld",            voorspelling: "hond",        confidence: 60,    oordeel: "let-op", toelichting: "35% ging naar kat; samen 95%, de rest naar overig." },
    { proef: 6, label: "6b", aanbod: "Hybride, katachtig beeld",         voorspelling: "kat",         confidence: 99,    oordeel: "let-op", toelichting: "Duidelijker beeld geeft hogere zekerheid." },
    { proef: 6, label: "6c", aanbod: "Hybride, hondachtig beeld",        voorspelling: "hond",        confidence: 99,    oordeel: "let-op", toelichting: "Zelfde effect, andere kant op." }
  ];

  var OORDEEL_TEKST = { "goed": "Ging goed", "let-op": "Let op", "fout": "Fout / gok" };

  function nl(getal) {
    return getal.toFixed(getal % 1 === 0 ? 0 : 2).replace(".", ",") + "%";
  }

  /* ---------- 2. Hoofdmenu ---------- */
  var menuknop = document.querySelector(".menuknop");
  var menu = document.getElementById("hoofdmenu");
  if (menuknop && menu) {
    menuknop.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      menuknop.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Na een klik op een menu-item klapt het menu dicht op smalle schermen.
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && window.matchMedia("(max-width: 60em)").matches) {
        menu.classList.remove("is-open");
        menuknop.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        menuknop.setAttribute("aria-expanded", "false");
        menuknop.focus();
      }
    });
  }

  /* ---------- 3. Leesmodus (onthouden in localStorage) ---------- */
  var leesknop = document.querySelector(".leesknop");
  var SLEUTEL = "project2-leesmodus";
  function zetLeesmodus(aan) {
    document.documentElement.classList.toggle("leesmodus", aan);
    if (leesknop) {
      leesknop.setAttribute("aria-pressed", aan ? "true" : "false");
      leesknop.lastElementChild.textContent = aan ? "Leesmodus uit" : "Leesmodus";
    }
    try { localStorage.setItem(SLEUTEL, aan ? "1" : "0"); } catch (e) { /* privémodus: niet erg */ }
    meetHeader();
  }
  if (leesknop) {
    var bewaard = "0";
    try { bewaard = localStorage.getItem(SLEUTEL) || "0"; } catch (e) { /* niets */ }
    zetLeesmodus(bewaard === "1");
    leesknop.addEventListener("click", function () {
      zetLeesmodus(!document.documentElement.classList.contains("leesmodus"));
    });
  }

  /* ---------- 4. Headerhoogte meten ----------
     De header is sticky en wordt hoger als het menu uitklapt of de
     tekst groter wordt. We zetten de echte hoogte in een CSS-variabele,
     zodat ankers niet onder de header verdwijnen. */
  function meetHeader() {
    var kop = document.querySelector(".kop");
    if (kop) {
      document.documentElement.style.setProperty("--header-hoogte", kop.offsetHeight + "px");
    }
  }
  meetHeader();
  window.addEventListener("resize", meetHeader);

  /* ---------- 5. Voortgangsbalk en actief menu-item ---------- */
  var balk = document.getElementById("voortgangsbalk");
  function bijwerken() {
    if (balk) {
      var totaal = document.documentElement.scrollHeight - window.innerHeight;
      var pct = totaal > 0 ? (window.scrollY / totaal) * 100 : 0;
      balk.style.width = Math.min(100, Math.max(0, pct)) + "%";
    }
  }
  window.addEventListener("scroll", bijwerken, { passive: true });
  bijwerken();

  var secties = document.querySelectorAll("main section[id]");
  var links = document.querySelectorAll(".menu a");
  if ("IntersectionObserver" in window && secties.length) {
    var waarnemer = new IntersectionObserver(function (items) {
      items.forEach(function (item) {
        if (!item.isIntersecting) return;
        links.forEach(function (a) {
          var actief = a.getAttribute("href") === "#" + item.target.id;
          if (actief) { a.setAttribute("aria-current", "true"); } else { a.removeAttribute("aria-current"); }
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secties.forEach(function (s) { waarnemer.observe(s); });
  }

  /* ---------- 6. Filter op de proefkaarten ---------- */
  var chips = document.querySelectorAll(".chip");
  var proeven = document.querySelectorAll(".proef");
  var filterstatus = document.getElementById("filter-status");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var keuze = chip.dataset.filter;
      chips.forEach(function (c) {
        var actief = c === chip;
        c.classList.toggle("is-actief", actief);
        c.setAttribute("aria-pressed", actief ? "true" : "false");
      });
      var zichtbaar = 0;
      proeven.forEach(function (p) {
        var toon = keuze === "alles" || p.dataset.soort === keuze;
        p.classList.toggle("verborgen", !toon);
        if (toon) zichtbaar++;
      });
      if (filterstatus) { filterstatus.textContent = zichtbaar + " van de " + proeven.length + " proeven zichtbaar."; }
    });
  });

  /* ---------- 7. Tabel: bouwen, zoeken en sorteren ---------- */
  var tbody = document.getElementById("metingenrijen");
  var zoek = document.getElementById("zoek");
  var sortering = document.getElementById("sortering");
  var telling = document.getElementById("telling");

  function tekenTabel() {
    if (!tbody) return;
    var term = zoek ? zoek.value.trim().toLowerCase() : "";
    var rijen = METINGEN.filter(function (m) {
      if (!term) return true;
      return (m.aanbod + " " + m.voorspelling + " " + m.toelichting + " " + m.label).toLowerCase().indexOf(term) !== -1;
    });
    var wijze = sortering ? sortering.value : "volgorde";
    rijen = rijen.slice().sort(function (a, b) {
      if (wijze === "hoog") return b.confidence - a.confidence;
      if (wijze === "laag") return a.confidence - b.confidence;
      return a.label.localeCompare(b.label, "nl");
    });

    tbody.textContent = "";
    rijen.forEach(function (m) {
      var tr = document.createElement("tr");

      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = "Proef " + m.label;
      tr.appendChild(th);

      [m.aanbod, m.voorspelling].forEach(function (tekst) {
        var td = document.createElement("td");
        td.textContent = tekst;
        tr.appendChild(td);
      });

      var tdC = document.createElement("td");
      tdC.className = "cijfer";
      tdC.textContent = nl(m.confidence);
      tr.appendChild(tdC);

      var tdO = document.createElement("td");
      var span = document.createElement("span");
      span.className = "oordeel " + m.oordeel;
      span.textContent = OORDEEL_TEKST[m.oordeel];
      tdO.appendChild(span);
      var klein = document.createElement("div");
      klein.className = "noot";
      klein.textContent = m.toelichting;
      tdO.appendChild(klein);
      tr.appendChild(tdO);

      tbody.appendChild(tr);
    });

    if (telling) {
      telling.textContent = rijen.length === METINGEN.length
        ? METINGEN.length + " metingen uit zes proeven."
        : rijen.length + " van de " + METINGEN.length + " metingen gevonden.";
    }
  }
  if (zoek) zoek.addEventListener("input", tekenTabel);
  if (sortering) sortering.addEventListener("change", tekenTabel);
  tekenTabel();

  /* ---------- 8. Woordenlijst zoeken ---------- */
  var termzoek = document.getElementById("termzoek");
  var termen = document.querySelectorAll("#termenlijst .term");
  var termtelling = document.getElementById("termtelling");
  function filterTermen() {
    var q = termzoek.value.trim().toLowerCase();
    var zichtbaar = 0;
    termen.forEach(function (t) {
      var past = !q || t.textContent.toLowerCase().indexOf(q) !== -1;
      t.classList.toggle("verborgen", !past);
      if (past) zichtbaar++;
    });
    if (termtelling) {
      termtelling.textContent = q
        ? zichtbaar + " van de " + termen.length + " termen gevonden."
        : termen.length + " termen uitgelegd.";
    }
  }
  if (termzoek) { termzoek.addEventListener("input", filterTermen); filterTermen(); }
})();
