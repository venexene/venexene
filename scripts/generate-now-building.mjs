import { readFile, writeFile } from "node:fs/promises";

const projects = [
  { file: "gorder", name: "Gorder", type: "ORDER PROCESSING SERVICE" },
  { file: "goracle", name: "Goracle", type: "GO KNOWLEDGE BASE" },
  { file: "temgo", name: "Temgo", type: "TERMINAL POMODORO TIMER" },
  { file: "nango", name: "Nango", type: "URL SHORTENER WITH ANALYTICS" },
  { file: "gonsai", name: "Gonsai", type: "COMMENT TREE + FULL-TEXT SEARCH" },
  { file: "gong", name: "Gong", type: "DELAYED NOTIFICATION SERVICE" },
];
const cachePath = "assets/now-building.json";
const metricsPath = "assets/projects/metrics.json";
const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
const escapeXml = (text) => text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character]));

const readJson = async (path, fallback) => {
  try { return JSON.parse(await readFile(path, "utf8")); } catch { return fallback; }
};
const fetchJson = async (url, { authenticated = true } = {}) => {
  try {
    const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", ...(authenticated ? headers : {}) }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
    return await response.json();
  } catch { return null; }
};

const cached = await readJson(cachePath, {
  file: "goracle", name: "Goracle", type: "GO KNOWLEDGE BASE", commit: "Waiting for the next project sync", updatedAt: "2026-09-17T08:18:21Z",
  status: { label: "CI PASSED", color: "#00e5ff" },
});
const metrics = await readJson(metricsPath, {});
const projectByFile = new Map(projects.map((project) => [project.file, project]));
const statusFromRuns = (runs) => {
  const signalRuns = runs?.workflow_runs?.filter((run) => ["push", "pull_request"].includes(run.event));
  const latestRun = signalRuns?.[0] ?? runs?.workflow_runs?.[0];
  if (!latestRun) return { label: "NO CI", color: "#6b7280" };
  if (latestRun.status !== "completed") return { label: "CI RUNNING", color: "#facc15" };
  return latestRun.conclusion === "success"
    ? { label: "CI PASSED", color: "#00e5ff" }
    : { label: "CI FAILED", color: "#fb7185" };
};

const repositories = await fetchJson("https://api.github.com/users/venexene/repos?per_page=100&sort=updated", { authenticated: false });
const latest = repositories?.filter((repository) => repository.name !== "venexene" && repository.pushed_at)
  .sort((left, right) => new Date(right.pushed_at) - new Date(left.pushed_at))[0];
let nowBuilding = cached;
if (latest) {
  const [commit, runs] = await Promise.all([
    fetchJson(`https://api.github.com/repos/venexene/${latest.name}/commits?per_page=1`),
    fetchJson(`https://api.github.com/repos/venexene/${latest.name}/actions/runs?per_page=20`),
  ]);
  const knownProject = projectByFile.get(latest.name);
  nowBuilding = {
    file: latest.name,
    name: knownProject?.name ?? latest.name,
    type: knownProject?.type ?? latest.description?.toUpperCase().slice(0, 34) ?? "GITHUB REPOSITORY",
    commit: commit?.[0]?.commit?.message?.split("\n")[0] ?? "Latest repository update",
    updatedAt: latest.pushed_at,
    status: runs ? statusFromRuns(runs) : metrics[latest.name]?.status ?? cached.status ?? { label: "CI UNAVAILABLE", color: "#facc15" },
  };
}
await writeFile(cachePath, `${JSON.stringify(nowBuilding, null, 2)}\n`);

const status = nowBuilding.status ?? metrics[nowBuilding.file]?.status ?? { label: "CI UNAVAILABLE", color: "#facc15" };
const nameSize = nowBuilding.name.length > 18 ? 24 : nowBuilding.name.length > 13 ? 27 : 32;
const commitText = nowBuilding.commit.length > 38 ? `${nowBuilding.commit.slice(0, 37)}…` : nowBuilding.commit;
const commitSize = commitText.length > 33 ? 13 : commitText.length > 26 ? 14 : 16;
const updated = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(nowBuilding.updatedAt));
const workGif = await readFile("work.gif", "base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="170" viewBox="0 0 900 170" role="img" aria-labelledby="title desc"><title id="title">Now building: ${escapeXml(nowBuilding.name)}</title><desc id="desc">Most recently updated project: ${escapeXml(nowBuilding.name)}. Last commit: ${escapeXml(nowBuilding.commit)}.</desc><defs><clipPath id="work-clip"><rect x="696" y="19" width="176" height="132" rx="7"/></clipPath></defs><rect width="900" height="170" rx="10" fill="#000" stroke="#fff"/><rect x="0" y="0" width="6" height="170" rx="3" fill="#00e5ff"/><text x="28" y="37" fill="#fff" font-family="Arial, sans-serif" font-size="19" font-weight="700">NOW BUILDING</text><text x="28" y="88" fill="#fff" font-family="Arial, sans-serif" font-size="${nameSize}" font-weight="700">${escapeXml(nowBuilding.name)}</text><text x="28" y="114" fill="#a6a6a6" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1">${escapeXml(nowBuilding.type)}</text><path d="M330 64V146" stroke="#333"/><text x="360" y="52" fill="#71808a" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1.1">LATEST COMMIT</text><text x="360" y="80" fill="#e5f8fb" font-family="Arial, sans-serif" font-size="${commitSize}" font-weight="600">${escapeXml(commitText)}</text><text x="360" y="108" fill="#71808a" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1.1">UPDATED</text><text x="360" y="128" fill="#d1d5db" font-family="Arial, sans-serif" font-size="13">${updated}</text><circle cx="33" cy="145" r="5" fill="${status.color}"/><text x="46" y="149" fill="${status.color}" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing=".5">${escapeXml(status.label)}</text><rect x="692" y="15" width="184" height="140" rx="10" fill="#00e5ff" fill-opacity=".10" stroke="#00e5ff" stroke-opacity=".7"/><image href="data:image/gif;base64,${workGif}" x="696" y="19" width="176" height="132" preserveAspectRatio="xMidYMid slice" clip-path="url(#work-clip)"/></svg>\n`;
await writeFile("assets/now-building.svg", svg);
