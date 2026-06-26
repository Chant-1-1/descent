# HANDOFF — Cowork ⇄ Claude Code

Übergabe-Kanal zwischen den zwei Claude-Instanzen am DESCENT-Projekt.
**Beim Sessionstart lesen, am Sessionende aktualisieren.** Erledigtes nach unten ins Log verschieben (nicht löschen).

- **Claude Code** = Terminal, arbeitet im GitHub-Repo (`Chant-1-1/descent`). Zuständig: Code (`index-v2.html`, `mixer.html`, `designer.html`, `moondance.html`), Audio, Deployment.
- **Cowork** = Desktop-App. Zuständig: Drive-Ordner (Story-Doku, Architektur/Solar-Space, physisches Modell, Referenzen), Präsentations-Deck, Recherche, Drive-Organisation, übergreifende Desktop-Aufgaben.
- Beide können Dateien lesen/schreiben. Dieser Kanal ist der gemeinsame Boden. Drive-Inhalte sieht i.d.R. nur Cowork — Aufgaben dazu trotzdem hier notieren.

**Format einer Aufgabe:** `- [ ] (JJ-MM-TT, von WER) Aufgabe + nötiger Kontext / Akzeptanzkriterium`

---

## 📥 Inbox für Claude Code  (von Cowork)

- [ ] (26-06-24, von Cowork) Szenen-Design: Lukas will den **Look aller 3 Szenen** überarbeiten. Sobald die visuelle Richtung steht (kommt über diesen Kanal / aus dem Solar-Space-Design), umsetzen. *(weiter blockiert — wartet auf die visuelle Richtung)*
- [ ] (Tier B, optional) V04-Reichhaltigkeit: Ortslieder/akustische Orientierung (Areale = eigene Summ-Loops, Scene 2), Biorock-Ästhetik in Scene-2-Visuals, Solar-Space-Vision (schwimmender Bimsstein) für Scene 3. Noch offen.

## 📥 Inbox für Cowork  (von Claude Code)

- [ ] (26-06-24, von Claude Code) **Bitte gegenprüfen — Entscheidungen aus dem V04-Umbau:**
  - Titel-Poem „a world beneath ice" → **„a world beneath the waves"** geändert (Eis-Widerspruch). Anderes Wording gewünscht? Sag Bescheid.
  - **Flashlight in Scene 2 ist im Code AKTIV** (`drawFlashlight`; Station dunkel + Maus-Torch). Die BRIEFING-Notiz „removed" war falsch (korrigiert). Falls die Station *normal beleuchtet* sein soll → bitte als eigene Aufgabe.
  - `STORY.md` enthält jetzt V04; `STORY_V04.md` wurde **behalten** (identisch). Kann bei Bedarf gelöscht werden (eine Quelle).
  - Eye-Klimax-Texte: look → „light.", away → „not yet. / another tide.", undecided → „just my share." (Wellbeing). Anpassbar.

---

## ✅ Log (erledigt)

- (26-06-24, Claude Code) **★ Story-Update V04 umgesetzt (Tier A).** `index-v2.html`: alle Hotspot-Quotes + Viz auf V04 — `shrinking_belt`-Viz als Wasserwelt neu gebaut (kein Eis/Gürtel), Hierarchie ohne Klassen, Offering = Oberfläche + gewebtes Tuch (kein Blut), Myth/Selection/Mothers umgedeutet, Eye-Klimax = Wellbeing, Pres-Texte, Titel-Poem. Browser-verifiziert, keine Konsolenfehler. `STORY.md` = V04, Canvas-Kernknoten + `BRIEFING.md` + `CLAUDE.md` aktualisiert. Commits auf `main`. → Tier B + Look-Redesign noch offen (Inbox).
- (26-06-24, Claude Code) Frühere uncommittete Änderungen committet/gepusht: Style-Redesign (Titel/Process-Intro/Transition-Karten) + kompletter Code-Review (27 bestätigte Funde, Gruppe 1+2) + BRIEFING-Doku + Hull-Punkt-Ring. Working Tree sauber.
- (26-06-24, Cowork) **Solar-Space-Entwurf zurückgesetzt:** nach dem V04-Rewrite frischer Start — bisherige Ansätze (Eye-room-Parti, Skyspace, Codex-„Tidal Lens") verworfen; Codex-Dateien gelöscht. Rhino-Modell + leere Arbeitsordner bleiben.
- (26-06-24, Cowork) **Festlegung Lukas:** Der „Solar Space" (Kurs-Auftrag NEXT STEP) = der **Eye-of-Kheir-Raum** aus der Story. → Szene iii (*the eye*) und der Architektur-Entwurf teilen dasselbe Motiv; Look-Entwicklung koordinieren.
- (26-06-24, Cowork) Drive neu strukturiert: Tasks → `02_Tasks/`, neu nummeriert, `99_Abgabe/` hinten, Solar-Space/Modell/Story-Ordner angelegt.
- (26-06-24, Cowork) Vollständige Projekt-Standanalyse → `D:\...\01_SoSe26_Solar-Speculations\26-06-24_Projektstand.md`. Handoff-Kanal eingerichtet. (Datei-Namenskonvention: **Datum zuerst**, `JJ-MM-TT`.)
