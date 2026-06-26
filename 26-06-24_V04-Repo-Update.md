# Repo-Update auf Story V04 — Auftrag an Claude Code

**Von:** Cowork · **Datum:** 2026-06-24
**Quelle der Wahrheit:** `STORY_V04.md` (liegt im Repo-Root). Bitte zuerst vollständig lesen.

Die Story wurde von V03 auf **V04** umgeschrieben. Unten steht (1) was sich konzeptionell geändert hat, (2) Datei-für-Datei was im Repo angepasst werden muss — mit Zeilen-Refs und fertigen Ersatz-Quotes.

> Reihenfolge: **Tier A = Widersprüche** (müssen geändert werden, sonst erzählt die App eine andere Welt als V04). **Tier B = neue V04-Reichhaltigkeit** (optional, schön).

---

## 1. Die 5 konzeptionellen Änderungen V03 → V04

1. **Kein Eis mehr — reine Wasserwelt.** Die App zeigt aktuell noch „Eis das sich ausbreitet / schmaler Äquator-Gürtel" — das ist FALSCH. Es gibt nur noch einen globalen Ozean + vereinzelte Bergspitzen. Der **industrielle Smog ist NICHT abgeklungen** (anders als V03).
2. **Sozialordnung: vertikal, aber KEINE Klassen.** Raus mit „UPPER/MIDDLE/THE DEEPS", „outcasts", „those at the bottom are forgotten", „proximity to light determines social standing". Nähe zum Licht = praktisch + heilig (Gesundheit/Zeremonie), **nicht** Rang.
3. **Das Eye = der Solar Space: Healthcare & Wellbeing durch dosiertes Licht.** Licht = Leben/Gesundheit. Gefahr = **zu viel** Sonne (Überdosis), nicht Test/Strafe/Blendung. „do not look directly at it" = Sicherheitsregel (nimm nicht mehr als deinen Anteil). Selektion → ehrenvolle/heilende Einladung, nicht Aussieben.
4. **Offering = sanfte, freiwillige Mond-Devotion** (Tücher/Tokens bei Flut). Raus mit Menstruationsblut + „permits"/Fruchtbarkeitskontrolle.
5. **Material: gewachsenes Biorock/Seacrete** als Welt-Baustoff (Technik kehrt zur Natur zurück); der **Solar Space** speziell = **schwimmender Bimsstein**.

Namen **Vahra/Kheir bleiben**.

---

## 2. `index-v2.html`

### 2a. Hotspot-Quotes — `getSceneHotspots()` ab L1842 (Tier A)
Ersetze die `q:`-Strings (Format/Stil beibehalten, lowercase, `\n`):

```js
// L1844 shrinking_belt  (kein Eis mehr)
q:"the sun is lethal within hours.\nthe ice is gone — all of it.\nthere is only ocean now,\nand the old mountain peaks, like bones.\nwe live around the warm vents below."

// L1848 hierarchy  (keine Klassen)
q:"the closer to the surface, the closer to the light.\nnot a ladder. not a rank.\nthe light is medicine, and we share it.\ndown here it is dark — so we sing to find each other."

// L1851 the_mothers  (klein: 'eye' -> 'light', 'upper' raus)
q:"five mothers hold the station.\none for food. one for air. one for memory.\none for the world outside. one for the light."

// L1852 offering_to_kheir  (sanfte Mond-Devotion, kein Blut/permits)
q:"on the high tides we send the moon our thanks.\na cloth. a small thing, made by hand.\nwe ask him to keep the sun gentle,\nto carry her light back to us, a little longer."

// L1854 mythology  (kein Eis; Mond mildert Sonne; Eye = dosierte Aufnahme)
q:"the sun gave us life, then turned away.\nher light still keeps us alive — and still could kill us.\nthe moon stays close, and softens her.\nthe eye is how we take her light in measure,\nand ask her, slowly, to look back."

// L1855 selection  (Ruf, das Licht zu empfangen — Heilung, kein Test)
q:"they say my name. once.\nthat's enough.\nit is my turn to go up — to the light.\nthey say it makes you well.\nthey say you come back changed."
```

`deep_parade` (L1845), `sea_level` (L1846), `air_oxygen` (L1850) bleiben. `daily_life` (L1849) bleibt; optional (Tier B) auf das Ortslieder-System zuspitzen:
```js
q:"no sun. no day. no night.\nthe machines keep our hours.\neach place has its own song — we hum it always,\nso even in the dark we know where we are."
```

### 2b. Viz-Funktionen (Tier A)
- **`drawVizBelt(a)` L1191–1270** + Label L1269–1270 + L1411: **komplett auf Wasserwelt umbauen.** Eiskappen + Äquatorgürtel **entfernen**. Stattdessen: ein globaler Ozean, verstreute Bergspitzen-Inseln, geothermale Vents, darüber die tödliche Sonne/Smog. Labels neu, z. B. „a single global ocean", „scattered mountain-peaks", „warm vents below". (Die vizId `shrinking_belt` darf intern bleiben — sonst auch L521, L542, L1082, L2209/2210 + Mixer-`DEFAULT_HOTSPOTS`/`DEFAULT_VIZ_CONFIG` mitziehen.)
- **`drawVizHierarchy(a)` L1414: umdeuten.** Vertikales Diagramm darf bleiben, aber Semantik = Nähe zum Licht (Gesundheit/Zeremonie), nicht Status. Ersetze die `levels`-Labels „UPPER LEVEL/MIDDLE LEVEL/THE DEEPS" + sub „…outcasts…" durch z. B. „near the light", „the middle modules", „the deep modules" mit subs über Licht als Pflege + Ortslieder zur Orientierung. Entferne „authority ↓", „resources ↑" und den Bottom-Satz „proximity to light determines social standing" → ersetzen durch z. B. „nearness to light is practical and sacred — not rank".
- **`drawVizMyth(a)` L1626: umdeuten** — kein „above the ice", kein „eight hundred years late"; Sonne lebensspendend+gefährlich, Mond mildert, Eye = dosierte Aufnahme.
- **`drawVizOffering(a)` L1422: umdeuten** — sanfte Mond-Devotion (Tücher/Tokens bei Flut); Blut/permits raus. An V04-Abschnitt „THE OFFERING TO THE MOON" angleichen.
- **`drawVizSelection(a)` (nach L1626): umdeuten** — „nach oben gerufen, das Licht zu empfangen / es macht dich gesund / du kommst verändert zurück"; Test/Blendung raus.
- `drawVizDaily` L1416, `drawVizMothers` L1110, `drawVizAir` L1593: inhaltlich ok; nur „upper light" o. ä. glätten.

### 2c. Eye-Klimax `drawEyeClimax()` (Tier A, Ton)
Mechanik (Phasen A/B/C, Blick) kann bleiben, aber **Framing auf Wellbeing**: „hinsehen/das Licht empfangen" = Wärme, gesund werden, „dein Anteil"; Gefahr = Überdosis, nicht Bestrafung. Vorschlag Texte:
- look → „light." / „you are made well."
- away → „not yet." / „another tide." (statt „i looked away" = Versagen)
- undecided → „just my share." 
`seenLight`-Overlay bleibt.

### 2d. Pres-Mode-Texte (Tier A, klein)
L2209/2210 Label „belt" → „waterworld"; L2217 „module 7656. the deeps." → neutraler (z. B. „module 7656. the deep modules.").

---

## 3. Weitere Repo-Dateien

- **`STORY.md`** (L1, alt) → durch V04-Inhalt ersetzen (Quelle: `STORY_V04.md`). Danach `STORY_V04.md` entweder behalten oder in `STORY.md` aufgehen lassen.
- **`Solar Speculation Story line.canvas`** → Kernknoten aktualisieren: kein Eis, Eye = Healthcare/Wellbeing, weiche Hierarchie, Biorock, Ortslieder, sanftes Offering.
- **`BRIEFING.md`** → Story-Zusammenfassung + Szenen-Notizen auf V04 (kein Eis; Eye=Wellbeing; weiche Hierarchie; neues Offering; Biorock; Ortslieder). Hinweis: Scene 1 (station) hat real **5** Hotspots (inkl. `offering_to_kheir`), nicht 4.
- **`CLAUDE.md`** → Szenen-/Hotspot-Tabellen anpassen (shrinking_belt→Wasserwelt, hierarchy-Umdeutung, Scene-Station = 5 Hotspots inkl. offering, Offering-Umdeutung). Bei der Gelegenheit veraltete Stellen fixen: **2322 statt 1322 Zeilen**, Flashlight in Scene 2 (laut BRIEFING entfernt — verifizieren/ggf. Reste raus), Intro = Process-Matrix. Oben einen Satz „Story-Stand: V04" + die 5 Änderungen.

---

## 4. Tier B — neue V04-Reichhaltigkeit (optional, wenn Zeit)
- **Ortslieder/akustische Orientierung** als Audio-Idee (verschiedene Areale = verschiedene Summ-/Gesangs-Loops) — starkes Feature für Scene 2.
- **Biorock-Ästhetik** (gewachsene, mineralische, sich selbst heilende Wände) in Scene-2-Visuals.
- **Solar Space** (schwimmender Bimsstein, halb über/unter Wasser, Eye zentral, Healthcare-Licht) als neue Vision für Scene 3 / den Eye-Raum — koordiniert mit dem separaten Solar-Space-Entwurf (siehe `26-06-24_Codex-Prompt_Solar-Space.md` im Drive).

---

## 5. Abschluss
- Verifizieren: App starten (`npm run dev`), je Szene alle Hotspots klicken — kein Eis/Gürtel mehr, keine Klassen-Sprache, Eye liest sich als Wellbeing.
- Sinnvoll gruppiert committen (z. B. „content: update story to V04 — waterworld, soft hierarchy, eye as wellbeing, moon offering, biorock"). Achtung: es lagen vorher schon ~13 uncommittete Änderungen — bitte sauber trennen.
