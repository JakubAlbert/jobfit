# JobFit

A job search assistant that runs entirely in the browser. It compares your CV with a job posting,
shows the match and missing skills, suggests what to highlight, and (soon) tracks your applications.

**Live demo:** https://jakubalbert.github.io/jobfit/

> Work in progress. Screenshots, architecture and the full write-up will be added in the final phase.

## How the match score works

The score is computed by plain, deterministic code ([`src/lib/matchScore.ts`](src/lib/matchScore.ts)),
not by AI. The same CV and posting always give the same number, and every point can be explained.
AI is only used to *extract* skills from free text and to write the qualitative advice.

1. **Normalize every skill** ([`src/lib/skills.ts`](src/lib/skills.ts)): lowercase, remove diacritics
   and version numbers, then look the name up in a synonym dictionary
   ([`src/data/skillSynonyms.ts`](src/data/skillSynonyms.ts)). So `JS`, `javascript` and `JavaScript`
   are one skill, as are `Postgres` and `PostgreSQL`, or `React 18` and `ReactJS`.
2. **Match exactly** after normalization. There is intentionally no fuzzy matching: `Java` and
   `JavaScript` look similar but are different skills.
3. **Weight the groups.** A must-have skill is worth 2 points, a nice-to-have skill 1 point.
   A skill listed in both groups counts once, as must-have.

```
score = 100 × (2 × matched must-have + 1 × matched nice-to-have)
            / (2 × all must-have     + 1 × all nice-to-have)
```

Example: the posting requires React and TypeScript and lists Git as an advantage; the CV has React
and Git. Score = 100 × (2 + 1) / (4 + 1) = **60 %**.

If a posting lists no skills at all, there is no score (a 0 % would be misleading).
Languages are shown next to the score but are not part of it: levels such as "B2", "fluent" or
"komunikatívne" are too inconsistent to compare reliably in code.

Extracted skills can be edited by hand, because the score depends on them and AI extraction can
be wrong.

## Privacy

- There is no backend. All data (CV, postings, applications) is stored in IndexedDB in your browser.
- AI features use the **Google Gemini API with your own key**. The key is stored only in your
  browser's `localStorage` and is sent only to Google.
- **On the free tier, Google may use submitted data to improve its models.** That is why the CV is
  anonymized before it is sent: name, address, email, phone numbers and profile links are replaced
  with placeholders by deterministic code ([`src/lib/anonymize.ts`](src/lib/anonymize.ts)), and the
  app shows exactly what will be sent.
- No analytics or tracking.

## Run locally

Requires Node.js 24.

```bash
npm install
npm run dev     # http://localhost:5173/jobfit/
npm test        # unit tests (Vitest)
npm run lint    # oxlint
npm run build   # production build into dist/
```

Get a free Gemini API key at [Google AI Studio](https://aistudio.google.com/apikey) and enter it in
the app under *Nastavenia* (Settings).
