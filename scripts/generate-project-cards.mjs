import { mkdir, writeFile } from "node:fs/promises";

const projects = [
  {
    file: "gorder",
    name: "Gorder",
    type: "ORDER PROCESSING SERVICE",
    description: ["Kafka-driven orders with JWT, RBAC,", "PostgreSQL, rate limiting and Prometheus."],
    stack: ["Go", "Gin", "Kafka", "PostgreSQL"],
  },
  {
    file: "goracle",
    name: "Goracle",
    type: "RUSSIAN-LANGUAGE GO KNOWLEDGE BASE",
    description: ["Russian notes and diagrams on Go internals,", "concurrency, networking and memory model."],
    stack: ["Go", "MkDocs", "GitHub Pages"],
  },
  {
    file: "temgo",
    name: "Temgo",
    type: "TERMINAL POMODORO TIMER",
    description: ["A focused TUI with JSON plans, history,", "desktop notifications, CI and releases."],
    stack: ["Go", "Bubble Tea", "Lipgloss"],
  },
  {
    file: "nango",
    name: "Nango",
    type: "URL SHORTENER WITH ANALYTICS",
    description: ["Base62 links with daily, monthly and", "user-agent analytics powered by sqlc."],
    stack: ["Go", "PostgreSQL", "Docker"],
  },
  {
    file: "gonsai",
    name: "Gonsai",
    type: "COMMENT TREE + FULL-TEXT SEARCH",
    description: ["Nested comments, recursive CTE, FTS5", "highlighting and pure net/http."],
    stack: ["Go", "SQLite", "Docker"],
  },
  {
    file: "gong",
    name: "Gong",
    type: "DELAYED NOTIFICATION SERVICE",
    description: ["RabbitMQ TTL and DLX delivery with", "exponential backoff and ten retries."],
    stack: ["Go", "RabbitMQ", "PostgreSQL"],
  },
];

const escapeXml = (text) => text.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
}[character]));

const accent = "#00e5ff";
const githubHeaders = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};

const fetchJson = async (url) => {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", ...githubHeaders },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
    return await response.json();
  } catch {
    return null;
  }
};

const getCommitCount = async (url) => {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", ...githubHeaders },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
    const commits = await response.json();
    const lastPage = response.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/)?.[1];
    return lastPage ? Number(lastPage) : commits.length;
  } catch {
    return "—";
  }
};

const getProjectData = async (project) => {
  const repositoryUrl = `https://api.github.com/repos/venexene/${project.file}`;
  const runsUrl = `${repositoryUrl}/actions/runs?per_page=20`;
  const commitsUrl = `${repositoryUrl}/commits?per_page=1`;
  const [repository, runs, commits] = await Promise.all([fetchJson(repositoryUrl), fetchJson(runsUrl), getCommitCount(commitsUrl)]);
  const signalRuns = runs?.workflow_runs?.filter((run) => ["push", "pull_request"].includes(run.event));
  const latestRun = signalRuns?.[0] ?? runs?.workflow_runs?.[0];
  const status = !latestRun
    ? { label: "NO CI", color: "#6b7280" }
    : latestRun.status !== "completed"
      ? { label: "CI RUNNING", color: "#facc15" }
      : latestRun.conclusion === "success"
        ? { label: "CI PASSED", color: accent }
        : { label: "CI FAILED", color: "#fb7185" };
  return { stars: repository?.stargazers_count ?? "—", commits, status };
};

const makePills = (stack) => {
  let x = 28;
  return stack.map((item) => {
    const width = item.length * 7.2 + 25;
    const pill = `<rect x="${x}" y="180" width="${width}" height="27" rx="6" fill="#0c1620" stroke="#24515b"/><text x="${x + width / 2}" y="198" text-anchor="middle" fill="#e5f8fb" font-family="Arial, sans-serif" font-size="11" font-weight="700">${escapeXml(item)}</text>`;
    x += width + 7;
    return pill;
  }).join("");
};

const makeFooter = ({ stars, commits, status }) => `<path d="M28 224H422" stroke="#2b2b2b"/><path d="M159 233V260M291 233V260" stroke="#252f35"/><text x="93" y="241" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1">STARS</text><text x="93" y="258" text-anchor="middle" fill="#e7faff" font-family="Arial, sans-serif" font-size="13" font-weight="700">★ ${stars}</text><text x="225" y="241" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1">COMMITS</text><text x="225" y="258" text-anchor="middle" fill="#e7faff" font-family="Arial, sans-serif" font-size="13" font-weight="700">${commits}</text><text x="357" y="241" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1">CI STATUS</text><text x="357" y="258" text-anchor="middle" fill="${status.color}" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing=".4">${status.label}</text>`;

const metrics = new Map(await Promise.all(projects.map(async (project) => [project.file, await getProjectData(project)])));
await mkdir("assets/projects", { recursive: true });
await Promise.all(projects.map(async (project) => {
  const data = metrics.get(project.file);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="270" viewBox="0 0 450 270" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(project.name)}</title>
  <desc id="desc">${escapeXml(project.type)}. ${data.stars} stars, ${data.commits} commits, ${data.status.label}.</desc>
  <rect width="450" height="270" rx="10" fill="#000" stroke="#fff"/>
  <rect x="0" y="0" width="7" height="270" rx="3.5" fill="${accent}"/>
  <text x="422" y="33" text-anchor="end" fill="#60717a" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1.1">REPOSITORY</text>
  <text x="28" y="46" fill="#fff" font-family="Arial, sans-serif" font-size="29" font-weight="700">${escapeXml(project.name)}</text>
  <text x="28" y="70" fill="${accent}" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1.1">${escapeXml(project.type)}</text>
  <path d="M28 87H422" stroke="#333"/>
  <text x="28" y="118" fill="#d9e0e5" font-family="Arial, sans-serif" font-size="15">${escapeXml(project.description[0])}</text>
  <text x="28" y="142" fill="#d9e0e5" font-family="Arial, sans-serif" font-size="15">${escapeXml(project.description[1])}</text>
  <text x="28" y="168" fill="#71808a" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1.1">BUILT WITH</text>
  ${makePills(project.stack)}
  ${makeFooter(data)}
</svg>\n`;
  await writeFile(`assets/projects/${project.file}.svg`, svg);
}));
