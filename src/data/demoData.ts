import { BACKUP_FORMAT, BACKUP_VERSION, importData, type Backup } from '../db/backup'
import { db as defaultDb, type JobFitDb } from '../db/db'
import type { Application, JobPosting, JobRequirements } from '../db/schema'
import { addDays, todayIso } from '../lib/applications'

// Made-up sample data, so the app can be tried without an API key or a real CV.
// Requirements and the sample AI insights are written by hand: loading the demo never calls the API.
// Dates are relative to "today", so follow-ups and statistics always look realistic.

/** Marks the demo profile, so the app can tell the user they are looking at sample data. */
export const DEMO_PROFILE_TEXT = 'Ukážkové CV – vymyslená osoba, slúži len na vyskúšanie aplikácie.'

const requirements = (overrides: Partial<JobRequirements>): JobRequirements => ({
  mustHaveSkills: [],
  niceToHaveSkills: [],
  seniority: 'unknown',
  location: null,
  workMode: 'unknown',
  salary: null,
  languages: [],
  ...overrides,
})

export function buildDemoBackup(today: string, now: Date = new Date()): Backup {
  const timestamp = now.toISOString()
  const day = (offset: number) => addDays(today, offset)

  const postings: JobPosting[] = [
    {
      id: 'demo-posting-frontend',
      title: 'Frontend Developer (React)',
      company: 'Ukážka Tech s.r.o.',
      url: '',
      text: [
        '(Ukážkový inzerát)',
        'Hľadáme frontend developera do tímu, ktorý vyvíja webovú aplikáciu pre logistiku.',
        'Požadujeme: React, TypeScript, prácu s REST API, angličtinu na úrovni B2.',
        'Výhodou: Next.js, Jest, Docker.',
        'Hybridná práca, Bratislava. Mzda od 2 400 € brutto.',
      ].join('\n'),
      requirements: requirements({
        mustHaveSkills: ['React', 'TypeScript', 'REST API'],
        niceToHaveSkills: ['Next.js', 'Jest', 'Docker'],
        seniority: 'mid',
        location: 'Bratislava',
        workMode: 'hybrid',
        salary: 'od 2 400 € brutto',
        languages: [{ language: 'English', level: 'B2' }],
      }),
      createdAt: timestamp,
    },
    {
      id: 'demo-posting-fullstack',
      title: 'Full-stack Developer',
      company: 'Demo Soft a.s.',
      url: '',
      text: [
        '(Ukážkový inzerát)',
        'Pridaj sa k nám ako full-stack developer.',
        'Musíš ovládať JavaScript, Node.js, PostgreSQL a Docker.',
        'Plusom je AWS a GraphQL. Práca plne na diaľku.',
      ].join('\n'),
      requirements: requirements({
        mustHaveSkills: ['JavaScript', 'Node.js', 'PostgreSQL', 'Docker'],
        niceToHaveSkills: ['AWS', 'GraphQL'],
        seniority: 'senior',
        workMode: 'remote',
      }),
      createdAt: timestamp,
    },
    {
      id: 'demo-posting-analyst',
      title: 'Dátový analytik',
      company: 'Vzorová banka',
      url: '',
      text: [
        '(Ukážkový inzerát)',
        'Do oddelenia reportingu hľadáme dátového analytika.',
        'Požiadavky: SQL, Python, Power BI. Výhodou je pokročilý Excel. Nemčina výhodou.',
      ].join('\n'),
      requirements: requirements({
        mustHaveSkills: ['SQL', 'Python', 'Power BI'],
        niceToHaveSkills: ['Excel'],
        seniority: 'junior',
        location: 'Košice',
        workMode: 'onsite',
        languages: [{ language: 'German', level: '' }],
      }),
      createdAt: timestamp,
    },
  ]

  const application = (fields: Partial<Application> & Pick<Application, 'id' | 'company' | 'position'>): Application => ({
    postingId: null,
    status: 'saved',
    appliedDate: null,
    responseDate: null,
    followUpDate: null,
    notes: '',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...fields,
  })

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: timestamp,
    data: {
      profiles: [
        {
          id: 'me',
          rawText: DEMO_PROFILE_TEXT,
          fullName: '',
          address: '',
          cv: {
            skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'REST API', 'Tailwind CSS', 'Jest', 'Git', 'Figma'],
            experience: [
              {
                position: 'Frontend Developer',
                company: 'Príklad Digital s.r.o.',
                period: '2022 – súčasnosť',
                description:
                  'Vyvíjam rezervačný systém v Reacte a TypeScripte. Zaviedol som unit testy v Jeste a skrátil čas načítania hlavnej stránky o 35 %.',
              },
              {
                position: 'Junior Web Developer',
                company: 'Webové štúdio Vzor',
                period: '2020 – 2022',
                description: 'Tvoril som webové stránky pre klientov podľa návrhov vo Figme. Napojenie na REST API a správa obsahu.',
              },
            ],
            education: [{ institution: 'Technická univerzita (ukážka)', degree: 'Informatika, Bc.', period: '2017 – 2020' }],
            languages: [
              { language: 'Slovenčina', level: 'materinský jazyk' },
              { language: 'Angličtina', level: 'C1' },
            ],
            certificates: ['Meta Front-End Developer (ukážka)'],
          },
          updatedAt: timestamp,
        },
      ],
      postings,
      analyses: [
        {
          id: 'demo-posting-frontend',
          postingId: 'demo-posting-frontend',
          profileId: 'me',
          score: 78,
          matchedSkills: ['React', 'TypeScript', 'REST API', 'Jest'],
          missingMustHave: [],
          missingNiceToHave: ['Next.js', 'Docker'],
          insights: {
            strengths: [
              'Všetky povinné technológie (React, TypeScript, REST API) používaš v súčasnej práci.',
              'Konkrétny merateľný výsledok: zrýchlenie načítania o 35 %.',
              'Skúsenosť s testovaním v Jeste, ktorý inzerát uvádza ako výhodu.',
            ],
            gaps: [
              {
                gap: 'Next.js',
                mitigation: 'Malý vlastný projekt v Next.js nadväzuje na React; v pohovore spomeň, že ho aktívne skúšaš.',
              },
              { gap: 'Docker', mitigation: 'Krátky kurz a kontajnerizácia vlastného projektu stačia na základnú orientáciu.' },
            ],
            highlights: ['Rezervačný systém v Reacte a TypeScripte', 'Zavedenie unit testov a zrýchlenie stránky'],
            rewrites: [
              {
                original: 'Zaviedol som unit testy v Jeste a skrátil čas načítania hlavnej stránky o 35 %.',
                suggestion: 'Skrátil som čas načítania hlavnej stránky o 35 % a zaviedol unit testy v Jeste.',
              },
            ],
          },
          coverLetter: null,
          createdAt: timestamp,
        },
      ],
      applications: [
        application({
          id: 'demo-app-frontend',
          company: 'Ukážka Tech s.r.o.',
          position: 'Frontend Developer (React)',
          postingId: 'demo-posting-frontend',
          status: 'interview',
          appliedDate: day(-12),
          responseDate: day(-5),
          followUpDate: day(2),
          notes: 'Technické kolo s dvoma vývojármi.',
        }),
        application({
          id: 'demo-app-fullstack',
          company: 'Demo Soft a.s.',
          position: 'Full-stack Developer',
          postingId: 'demo-posting-fullstack',
          status: 'applied',
          appliedDate: day(-9),
          followUpDate: day(-2),
        }),
        application({
          id: 'demo-app-analyst',
          company: 'Vzorová banka',
          position: 'Dátový analytik',
          postingId: 'demo-posting-analyst',
          status: 'rejected',
          appliedDate: day(-25),
          responseDate: day(-18),
        }),
        application({ id: 'demo-app-studio', company: 'Príklad Studio', position: 'UI Developer', status: 'saved' }),
        application({
          id: 'demo-app-junior',
          company: 'Testovacia firma',
          position: 'Junior Frontend Developer',
          status: 'no_response',
          appliedDate: day(-40),
        }),
      ],
    },
  }
}

/** Replaces all data with the demo. Goes through the normal import, so it is validated like any backup. */
export async function loadDemoData(database: JobFitDb = defaultDb): Promise<void> {
  await importData(JSON.stringify(buildDemoBackup(todayIso())), database)
}
