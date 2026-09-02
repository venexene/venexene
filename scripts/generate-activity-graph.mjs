import { writeFile } from "node:fs/promises";

const login = process.env.GITHUB_USERNAME;

if (!login) {
  throw new Error("GITHUB_USERNAME must be set.");
}

const dayMs = 24 * 60 * 60 * 1000;
const now = new Date();
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const from = new Date(today.getTime() - 30 * dayMs);
const response = await fetch(`https://github.com/users/${encodeURIComponent(login)}/contributions`, {
  headers: {
    Accept: "text/html",
    "User-Agent": "venexene-activity-graph",
  },
});

if (!response.ok) throw new Error(`GitHub contribution calendar returned HTTP ${response.status}.`);
const calendarHtml = await response.text();
const levelsByDate = new Map();
for (const match of calendarHtml.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"/g)) {
  levelsByDate.set(match[1], Number(match[2]));
}
if (levelsByDate.size === 0) throw new Error("GitHub did not return a public contribution calendar.");

// GitHub exposes public contribution intensity (0–4) in the profile calendar.
// It is stable for a static README and does not require a profile access token.
const days = Array.from({ length: 31 }, (_, index) => {
  const date = new Date(from.getTime() + index * dayMs).toISOString().slice(0, 10);
  return { date, activityLevel: levelsByDate.get(date) ?? 0 };
});

const counts = days.map((day) => day.activityLevel);
const maximum = Math.max(...counts, 1);
const width = 900;
const height = 250;
const left = 42;
const right = 22;
const top = 58;
const bottom = 48;
const chartWidth = width - left - right;
const chartHeight = height - top - bottom;
const point = (count, index) => ({
  x: left + (chartWidth * index) / (counts.length - 1),
  y: top + chartHeight - (count / maximum) * chartHeight,
});
const points = counts.map(point);
const line = points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
const area = `${left},${top + chartHeight} ${line} ${width - right},${top + chartHeight}`;
const dateLabel = (index) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" })
  .format(new Date(`${days[index].date}T00:00:00Z`));
const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
  const y = top + chartHeight - ratio * chartHeight;
  return `<path d="M${left} ${y}H${width - right}"/>`;
}).join("");
const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
  const y = top + chartHeight - ratio * chartHeight;
  return `<text x="${left - 10}" y="${y + 4}" text-anchor="end">${Math.round(maximum * ratio)}</text>`;
}).join("");
const labels = [0, 7, 14, 21, 30].map((index) => {
  const { x } = points[index];
  return `<text x="${x}" y="${height - 20}" text-anchor="middle">${dateLabel(index)}</text>`;
}).join("");
const circles = points.map(({ x, y }, index) => `<circle cx="${x}" cy="${y}" r="3"><title>${days[index].date}: activity level ${counts[index]} of 4</title></circle>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">GitHub Activity Graph for ${login}</title>
  <desc id="desc">Daily public GitHub contribution activity during the last 31 days.</desc>
  <defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#00e5ff" stop-opacity=".35"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/></linearGradient></defs>
  <rect width="100%" height="100%" rx="8" fill="#000" stroke="#fff"/>
  <text x="${left}" y="31" fill="#fff" font-family="Arial, sans-serif" font-size="18" font-weight="600">GitHub Activity Graph</text>
  <text x="${width - right}" y="31" fill="#a6a6a6" font-family="Arial, sans-serif" font-size="12" text-anchor="end">Last 31 days</text>
  <g fill="none" stroke="#3b3b3b" stroke-width="1" stroke-dasharray="3 4">${gridLines}</g>
  <g fill="#a6a6a6" font-family="Arial, sans-serif" font-size="11">${gridValues}</g>
  <polygon points="${area}" fill="url(#fill)"/>
  <polyline points="${line}" fill="none" stroke="#00e5ff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
  <g fill="#fff" stroke="#00e5ff" stroke-width="2">${circles}</g>
  <g fill="#a6a6a6" font-family="Arial, sans-serif" font-size="11">${labels}</g>
</svg>\n`;

await writeFile("activity-graph.svg", svg);
