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

const makePills = (stack) => {
  let x = 28;
  return stack.map((item) => {
    const width = item.length * 8 + 30;
    const pill = `<rect x="${x}" y="172" width="${width}" height="28" rx="14" fill="${accent}" fill-opacity=".16" stroke="${accent}" stroke-opacity=".65"/><text x="${x + width / 2}" y="191" text-anchor="middle" fill="#fff" font-size="12" font-weight="600">${escapeXml(item)}</text>`;
    x += width + 8;
    return pill;
  }).join("");
};

await mkdir("assets/projects", { recursive: true });
await Promise.all(projects.map(async (project) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="220" viewBox="0 0 450 220" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(project.name)}</title>
  <desc id="desc">${escapeXml(project.type)}</desc>
  <rect width="450" height="220" rx="10" fill="#000" stroke="#fff"/>
  <rect x="0" y="0" width="7" height="220" rx="3.5" fill="${accent}"/>
  <circle cx="418" cy="32" r="8" fill="${accent}"/>
  <text x="28" y="44" fill="#fff" font-family="Arial, sans-serif" font-size="29" font-weight="700">${escapeXml(project.name)}</text>
  <text x="28" y="69" fill="${accent}" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1.1">${escapeXml(project.type)}</text>
  <path d="M28 86H422" stroke="#333"/>
  <text x="28" y="116" fill="#d1d5db" font-family="Arial, sans-serif" font-size="16">${escapeXml(project.description[0])}</text>
  <text x="28" y="140" fill="#d1d5db" font-family="Arial, sans-serif" font-size="16">${escapeXml(project.description[1])}</text>
  ${makePills(project.stack)}
</svg>\n`;
  await writeFile(`assets/projects/${project.file}.svg`, svg);
}));
