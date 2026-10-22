// Canonical skill name → other ways people write it.
// Matching is exact after normalization (see src/lib/skills.ts), so every alias must be listed here.
// Deliberately no fuzzy matching: "Java" and "JavaScript" look similar but are different skills.

export const SKILL_SYNONYMS: Record<string, string[]> = {
  // Languages
  JavaScript: ['js', 'ecmascript', 'es6', 'es2015', 'vanilla js'],
  TypeScript: ['ts'],
  Python: ['py', 'python3'],
  Java: ['java se', 'java ee', 'jakarta ee'],
  'C#': ['csharp', 'c sharp'],
  'C++': ['cpp', 'c plus plus'],
  Go: ['golang'],
  Kotlin: [],
  Swift: [],
  PHP: [],
  Ruby: [],
  Rust: [],
  SQL: ['structured query language'],
  HTML: ['html5'],
  CSS: ['css3'],
  Bash: ['shell', 'shell scripting', 'bash scripting'],
  PowerShell: [],

  // Frontend
  React: ['react.js', 'reactjs', 'react js'],
  'React Native': ['react-native'],
  'Next.js': ['nextjs', 'next js', 'next'],
  Vue: ['vue.js', 'vuejs', 'vue js'],
  Angular: ['angularjs', 'angular.js'],
  Svelte: ['sveltekit'],
  Redux: ['redux toolkit', 'rtk'],
  'Tailwind CSS': ['tailwind', 'tailwindcss'],
  Sass: ['scss'],
  Webpack: [],
  Vite: [],

  // Backend
  'Node.js': ['node', 'nodejs', 'node js'],
  Express: ['express.js', 'expressjs'],
  NestJS: ['nest.js', 'nest'],
  '.NET': ['dotnet', 'dot net', '.net core', 'asp.net', 'asp.net core'],
  Spring: ['spring boot', 'spring framework'],
  Django: [],
  Flask: [],
  FastAPI: [],
  Laravel: [],
  'REST API': ['rest', 'restful', 'restful api', 'rest apis'],
  GraphQL: ['gql'],

  // Data
  PostgreSQL: ['postgres', 'psql', 'postgre'],
  MySQL: [],
  'Microsoft SQL Server': ['mssql', 'ms sql', 'sql server', 't-sql', 'tsql'],
  Oracle: ['oracle db', 'oracle database', 'pl/sql'],
  MongoDB: ['mongo'],
  Redis: [],
  Elasticsearch: ['elastic', 'elastic search'],
  Kafka: ['apache kafka'],
  Pandas: [],
  'Power BI': ['powerbi', 'microsoft power bi'],
  Tableau: [],
  'Machine Learning': ['ml'],

  // Cloud & DevOps
  AWS: ['amazon web services'],
  Azure: ['microsoft azure'],
  'Google Cloud': ['gcp', 'google cloud platform'],
  Docker: [],
  Kubernetes: ['k8s'],
  Terraform: [],
  'CI/CD': ['ci cd', 'cicd', 'continuous integration', 'continuous delivery', 'continuous deployment'],
  'GitHub Actions': [],
  'GitLab CI': ['gitlab ci/cd'],
  Jenkins: [],
  Linux: ['unix'],
  Git: ['github', 'gitlab', 'bitbucket'],

  // Testing
  Jest: [],
  Vitest: [],
  Cypress: [],
  Playwright: [],
  Selenium: [],
  'Unit testing': ['unit tests', 'unit test'],

  // Practices & tools
  Agile: ['agilne', 'agilny vyvoj'],
  Scrum: [],
  Kanban: [],
  Jira: ['atlassian jira'],
  Confluence: [],
  Figma: [],
  'UX design': ['ux', 'user experience'],
  'UI design': ['ui', 'user interface design'],

  // Office
  Excel: ['ms excel', 'microsoft excel', 'excel tabulky'],
  Word: ['ms word', 'microsoft word'],
  PowerPoint: ['ms powerpoint', 'microsoft powerpoint'],
  'Microsoft Office': ['ms office', 'office 365', 'microsoft 365', 'm365'],
  SAP: [],
}
