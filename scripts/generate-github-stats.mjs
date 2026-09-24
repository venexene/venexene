import { readFile, writeFile } from "node:fs/promises";

const username = "venexene";
const cachePath = "assets/github-stats.json";
const excluded = new Set(["imdb-classification", "GANImgGen", "voice-commands-recognition", "venexene"]);
const excludedLanguages = new Set(["GLSL"]);
const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
const accent = "#00e5ff";

const readJson = async (path, fallback) => {
  try { return JSON.parse(await readFile(path, "utf8")); } catch { return fallback; }
};
const fetchJson = async (url) => {
  try {
    const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", ...headers }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
    return await response.json();
  } catch { return null; }
};
const formatNumber = (value) => typeof value === "number" ? new Intl.NumberFormat("en").format(value) : "—";
const fetchCommitCount = async (repository) => {
  try {
    const response = await fetch(`https://api.github.com/repos/${username}/${repository.name}/commits?per_page=1`, { headers: { Accept: "application/vnd.github+json", ...headers }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;
    const lastPage = response.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/);
    if (lastPage) return Number(lastPage[1]);
    return (await response.json()).length;
  } catch { return null; }
};
const escapeXml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character]));

const cached = await readJson(cachePath, { repos: "—", stars: "—", followers: "—", commits: "—", languages: [] });
const [profile, repositories] = await Promise.all([
  fetchJson(`https://api.github.com/users/${username}`),
  fetchJson(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`),
]);
let stats = cached;
if (profile && repositories) {
  const eligible = repositories.filter((repository) => !repository.fork && !repository.archived && !excluded.has(repository.name));
  const languageTotals = {};
  const commitCounts = await Promise.all(eligible.map(fetchCommitCount));
  for (const repository of eligible) {
    const languages = await fetchJson(repository.languages_url);
    if (!languages) continue;
    for (const [language, bytes] of Object.entries(languages)) {
      if (!excludedLanguages.has(language)) languageTotals[language] = (languageTotals[language] ?? 0) + bytes;
    }
  }
  stats = {
    repos: profile.public_repos,
    stars: repositories.reduce((total, repository) => total + repository.stargazers_count, 0),
    followers: profile.followers,
    commits: commitCounts.every((count) => typeof count === "number") ? commitCounts.reduce((total, count) => total + count, 0) : cached.commits,
    languages: Object.entries(languageTotals).sort(([, left], [, right]) => right - left).slice(0, 6),
  };
}
stats.languages = stats.languages.filter(([language]) => !excludedLanguages.has(language));
await writeFile(cachePath, `${JSON.stringify(stats, null, 2)}\n`);

const statsGif = await readFile(" stats.gif", "base64");
const overview = `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="195" viewBox="0 0 450 195" role="img" aria-labelledby="title desc"><title id="title">GITHUB STATS</title><desc id="desc">${formatNumber(stats.repos)} public repositories, ${formatNumber(stats.stars)} stars, ${formatNumber(stats.followers)} followers.</desc><defs><clipPath id="stats-gif-clip"><rect x="23" y="61" width="132" height="111" rx="10"/></clipPath></defs><rect width="450" height="195" rx="10" fill="#000" stroke="#fff"/><rect x="0" y="0" width="6" height="195" rx="3" fill="${accent}"/><text x="26" y="37" fill="#fff" font-family="Arial, sans-serif" font-size="19" font-weight="700">GITHUB STATS</text><path d="M26 52H424" stroke="#333"/><rect x="19" y="58" width="140" height="116" rx="13" fill="#00e5ff" fill-opacity=".10" stroke="#00e5ff" stroke-opacity=".65"/><image href="data:image/gif;base64,${statsGif}" x="23" y="61" width="132" height="111" preserveAspectRatio="xMidYMid meet" clip-path="url(#stats-gif-clip)"/><path d="M174 60V174M300 60V174M194 121H424" stroke="#263238"/><text x="237" y="84" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1">PUBLIC REPOS</text><text x="237" y="110" text-anchor="middle" fill="#e5f8fb" font-family="Arial, sans-serif" font-size="22" font-weight="700">${formatNumber(stats.repos)}</text><text x="362" y="84" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1">TOTAL STARS</text><text x="362" y="110" text-anchor="middle" fill="#e5f8fb" font-family="Arial, sans-serif" font-size="22" font-weight="700">★ ${formatNumber(stats.stars)}</text><text x="237" y="140" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1">FOLLOWERS</text><text x="237" y="165" text-anchor="middle" fill="#e5f8fb" font-family="Arial, sans-serif" font-size="22" font-weight="700">${formatNumber(stats.followers)}</text><text x="362" y="140" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1">COMMITS</text><text x="362" y="165" text-anchor="middle" fill="#e5f8fb" font-family="Arial, sans-serif" font-size="22" font-weight="700">${formatNumber(stats.commits)}</text></svg>\n`;

const displayedLanguages = stats.languages.slice(0, 5);
const totalBytes = displayedLanguages.reduce((total, [, bytes]) => total + bytes, 0) || 1;
const bars = displayedLanguages.length ? displayedLanguages.map(([language, bytes], index) => {
  const y = 70 + index * 24;
  const percentage = Math.round((bytes / totalBytes) * 100);
  return `<text x="32" y="${y}" fill="#d1d5db" font-family="Arial, sans-serif" font-size="12" font-weight="700">${escapeXml(language)}</text><text x="418" y="${y}" text-anchor="end" fill="#8a9aa5" font-family="Arial, sans-serif" font-size="11" font-weight="700">${percentage}%</text><rect x="32" y="${y + 5}" width="386" height="6" rx="3" fill="#162329"/><rect x="32" y="${y + 5}" width="${(386 * percentage) / 100}" height="6" rx="3" fill="${accent}"/>`;
}).join("") : `<text x="225" y="125" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="13">Awaiting the next GitHub sync</text>`;
const languages = `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="195" viewBox="0 0 450 195" role="img" aria-labelledby="title desc"><title id="title">Top languages</title><desc id="desc">Languages used across public repositories.</desc><rect width="450" height="195" rx="10" fill="#000" stroke="#fff"/><rect x="0" y="0" width="6" height="195" rx="3" fill="${accent}"/><text x="26" y="36" fill="#fff" font-family="Arial, sans-serif" font-size="19" font-weight="700">TOP LANGUAGES</text><path d="M26 52H424" stroke="#333"/>${bars}</svg>\n`;
await Promise.all([writeFile("assets/github-overview.svg", overview), writeFile("assets/top-languages.svg", languages)]);
