# JobFit – asistent na hľadanie práce

> Pracovný názov, kľudne zmeň.

## Cieľ projektu

Webová aplikácia, ktorá beží **celá v prehliadači** a nemá žiadny backend. Pomáha pri hľadaní práce:

1. Porovná moje CV s konkrétnym pracovným inzerátom.
2. Ukáže zhodu, chýbajúce zručnosti a čo v CV zvýrazniť.
3. Sleduje stav všetkých mojich žiadostí o prácu.

Je to môj portfolio projekt. Kód preto musí byť čistý, otestovaný a zdokumentovaný a každé dôležité rozhodnutie musí byť vysvetliteľné na pohovore.

## Obmedzenia (povinné)

- **Žiadny server ani platená infraštruktúra.** Statický build nasadený zadarmo na GitHub Pages.
- **AI = Google Gemini API (free tier).** Používateľ zadá vlastný API kľúč v nastaveniach. Kľúč sa ukladá len do `localStorage` v jeho prehliadači a nikam inam sa neposiela.
- **Názov modelu je konfigurovateľný** v nastaveniach. Predvolená hodnota: `gemini-3.5-flash-lite`. Ak model neexistuje, zobraz zrozumiteľnú chybu.
- **Všetky dáta lokálne** v IndexedDB.
- **Žiadny scraping** pracovných portálov. Text inzerátu používateľ vloží ručne.

## Tech stack

- Vite + React + TypeScript (strict mode)
- Tailwind CSS
- Dexie.js (IndexedDB)
- `@google/genai` SDK priamo z prehliadača
- Zod na validáciu odpovedí z AI
- pdf.js na čítanie textu z PDF životopisu
- Vitest na unit testy
- GitHub Actions: lint, test, build a deploy na GitHub Pages

Ak máš dôvod zvoliť niečo iné, najprv navrhni zmenu a vysvetli prečo. Nič nemeň bez môjho súhlasu.

## Funkcie

### 1. Profil / CV
- Vloženie textu CV alebo nahranie PDF (text vytiahne pdf.js).
- Gemini prevedie CV na štruktúrovaný JSON:
  - zručnosti (normalizované názvy)
  - skúsenosti (pozícia, firma, obdobie, popis)
  - vzdelanie
  - jazyky
  - certifikáty
- Používateľ vie výsledok ručne upraviť a uložiť.
- **Anonymizácia pred odoslaním do API:** e-mail, telefón, adresa a celé meno sa nahradia placeholdermi. Rieš to deterministickým kódom (regex), nie cez AI.

### 2. Analýza inzerátu
- Vloženie textu inzerátu, voliteľne s URL a názvom firmy.
- Gemini vytiahne štruktúrované požiadavky:
  - povinné zručnosti a „nice-to-have" zručnosti
  - seniorita
  - lokalita, remote / hybrid
  - plat, ak je uvedený
  - jazykové požiadavky

### 3. Porovnanie CV a inzerátu
- **Skóre zhody počíta deterministický kód, nie AI.**
  - Porovnanie normalizovaných zručností vrátane slovníka synoným (napr. `JS` = `JavaScript`, `Postgres` = `PostgreSQL`).
  - Rozdielna váha pre povinné a voliteľné zručnosti.
  - Algoritmus musí byť jednoduchý, otestovaný a vysvetlený v README.
- Gemini dodá kvalitatívnu časť:
  - silné stránky pre túto pozíciu
  - medzery a ako ich zmierniť
  - ktoré body z CV zvýrazniť
  - návrhy preformulovania bodov v CV
- **Prísne pravidlo v prompte: AI si nikdy nesmie vymyslieť skúsenosť ani zručnosť, ktorú CV neobsahuje.**
- Voliteľne: návrh motivačného listu v slovenčine alebo angličtine.

### 4. Tracker žiadostí
- Každá žiadosť má:
  - firmu a pozíciu
  - prepojenie na analyzovaný inzerát
  - stav: Uložené → Poslané → Pohovor → Ponuka / Zamietnuté / Bez odpovede
  - dátumy a poznámky
  - dátum na follow-up
- Dva pohľady: kanban (presúvanie medzi stavmi) a tabuľka (filtrovanie, triedenie).
- Na úvodnej obrazovke zoznam žiadostí, pri ktorých je čas na follow-up.
- Jednoduché štatistiky:
  - počet žiadostí
  - miera odpovede
  - priemerný čas do odpovede

### 5. Dáta
- Export a import všetkých dát ako JSON (záloha a prenos medzi zariadeniami).
- Tlačidlo na vymazanie všetkých dát.

## Práca s Gemini API

- Na štruktúrované odpovede použi `responseSchema` / JSON mode a každú odpoveď validuj cez Zod.
- Pri nevalidnej odpovedi skús jeden retry, potom zobraz chybu.
- **Rate limity free tieru:**
  - pri chybe 429 exponenciálny backoff
  - jasná správa používateľovi, čo sa deje
- **Cache:** výsledky ukladaj podľa hashu vstupu (SHA-256), aby sa ten istý inzerát ani CV neposielali opakovane.
- Prompty drž krátke, posielaj len potrebné dáta a maj ich v samostatnom priečinku `src/prompts/`.
- Všetky volania API cez jeden modul (`src/lib/gemini.ts`), aby sa dal v testoch ľahko namockovať.

## Súkromie

- V aplikácii aj v README jasne uveď, že pri free tieri môže Google odoslané dáta použiť na zlepšovanie svojich modelov. Práve preto aplikácia anonymizuje CV.
- Žiadna analytika ani tracking.

## UI

- Rozhranie v slovenčine. Kód, komentáre, commity a README v angličtine.
- Čistý, jednoduchý dizajn, funkčný aj na mobile.
- Dark mode.
- Prázdne stavy s vysvetlením, čo robiť, a viditeľné stavy načítavania a chýb.
- Prvé spustenie: krátky onboarding (zadaj API kľúč → nahraj CV → vlož prvý inzerát).

## Testy

Vitest pokryje minimálne:
- anonymizáciu CV
- normalizáciu zručností a synonymá
- výpočet skóre zhody
- Zod schémy a spracovanie nevalidnej odpovede z AI
- export a import dát
- prácu s Gemini modulom s namockovaným API, vrátane chyby 429

## README (v angličtine)

- čo aplikácia robí a prečo vznikla
- odkaz na živé demo a screenshoty
- architektúra (krátky diagram)
- dôležité rozhodnutia a ich dôvody (prečo bez backendu, prečo skóre počíta kód a nie AI, anonymizácia, cache)
- ako spustiť lokálne
- ako získať Gemini API kľúč
- upozornenie o súkromí
- čo by som vylepšil ďalej

## Postup práce

Postupuj po fázach. Po každej fáze sa zastav, zhrň, čo si spravil, a počkaj na moje potvrdenie.

1. **Základ:** projekt, stack, linting, testy, CI, deploy prázdnej appky na GitHub Pages.
2. **Dáta:** Dexie schéma, typy, export a import.
3. **Gemini modul:** nastavenia API kľúča a modelu, wrapper, validácia, retry, cache.
4. **Profil / CV:** vrátane PDF a anonymizácie.
5. **Analýza inzerátu a porovnanie.**
6. **Tracker žiadostí:** kanban, tabuľka, štatistiky.
7. **Doladenie:** onboarding, prázdne stavy, mobil, dark mode, README a screenshoty.

## Pravidlá pre teba (Claude Code)

- Pred každou fázou mi napíš krátky plán.
- **Vysvetľuj dôležité rozhodnutia.** Chcem každej časti rozumieť a vedieť ju obhájiť na pohovore.
- Malé, zmysluplné commity s popisnými správami (Conventional Commits).
- Žiadne zbytočné závislosti. Pred pridaním knižnice povedz prečo.
- Žiadne API kľúče ani osobné dáta v kóde ani v repozitári.
