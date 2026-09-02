import { writeFile } from "node:fs/promises";

const login = process.env.GITHUB_USERNAME;
const token = process.env.GITHUB_TOKEN;

if (!login || !token) {
  throw new Error("GITHUB_USERNAME and GITHUB_TOKEN must be set.");
}

const dayMs = 24 * 60 * 60 * 1000;
const now = new Date();
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const from = new Date(today.getTime() - 30 * dayMs);
const to = now;

const query = `
  query ActivityGraph($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          contributionDays: weeks {
            contributionDays { date contributionCount }
          }
        }
      }
    }
  }
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "venexene-activity-graph",
  },
  body: JSON.stringify({ query, variables: { login, from: from.toISOString(), to: to.toISOString() } }),
});

if (!response.ok) throw new Error(`GitHub GraphQL returned HTTP ${response.status}.`);
const payload = await response.json();
if (payload.errors?.length) throw new Error(payload.errors.map(({ message }) => message).join("; "));

const returnedDays = payload.data?.user?.contributionsCollection?.contributionCalendar?.contributionDays?.flat();
if (!returnedDays) throw new Error("GitHub did not return a contribution calendar.");

// The GraphQL range boundaries are time-based, so GitHub can omit a partial
// first or last day. Keep the chart's 31 calendar-day timeline stable.
const countsByDate = new Map(returnedDays.map(({ date, contributionCount }) => [date, contributionCount]));
const days = Array.from({ length: 31 }, (_, index) => {
  const date = new Date(from.getTime() + index * dayMs).toISOString().slice(0, 10);
  return { date, contributionCount: countsByDate.get(date) ?? 0 };
});

const counts = days.map((day) => day.contributionCount);
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
const circles = points.map(({ x, y }, index) => `<circle cx="${x}" cy="${y}" r="3"><title>${days[index].date}: ${counts[index]} contributions</title></circle>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">GitHub Activity Graph for ${login}</title>
  <desc id="desc">Daily GitHub contributions during the last 31 days.</desc>
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
