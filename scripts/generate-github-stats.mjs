import { readFile, writeFile } from "node:fs/promises";

const username = "venexene";
const cachePath = "assets/github-stats.json";
const excluded = new Set(["imdb-classification", "GANImgGen", "voice-commands-recognition", "venexene"]);
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
const escapeXml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character]));

const cached = await readJson(cachePath, { repos: "—", stars: "—", followers: "—", languages: [] });
const [profile, repositories] = await Promise.all([
  fetchJson(`https://api.github.com/users/${username}`),
  fetchJson(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`),
]);
let stats = cached;
if (profile && repositories) {
  const eligible = repositories.filter((repository) => !repository.fork && !repository.archived && !excluded.has(repository.name));
  const languageTotals = {};
  for (const repository of eligible) {
    const languages = await fetchJson(repository.languages_url);
    if (!languages) continue;
    for (const [language, bytes] of Object.entries(languages)) languageTotals[language] = (languageTotals[language] ?? 0) + bytes;
  }
  stats = {
    repos: profile.public_repos,
    stars: repositories.reduce((total, repository) => total + repository.stargazers_count, 0),
    followers: profile.followers,
    languages: Object.entries(languageTotals).sort(([, left], [, right]) => right - left).slice(0, 5),
  };
}
await writeFile(cachePath, `${JSON.stringify(stats, null, 2)}\n`);

const overview = `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="195" viewBox="0 0 450 195" role="img" aria-labelledby="title desc"><title id="title">GitHub overview</title><desc id="desc">${formatNumber(stats.repos)} public repositories, ${formatNumber(stats.stars)} stars, ${formatNumber(stats.followers)} followers.</desc><rect width="450" height="195" rx="10" fill="#000" stroke="#fff"/><rect x="0" y="0" width="6" height="195" rx="3" fill="${accent}"/><text x="26" y="36" fill="#fff" font-family="Arial, sans-serif" font-size="19" font-weight="700">GITHUB OVERVIEW</text><text x="26" y="55" fill="${accent}" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1.1">PUBLIC PROFILE · AUTO-SYNCED</text><path d="M26 68H424" stroke="#333"/><path d="M159 91V165M291 91V165" stroke="#263238"/><text x="92" y="108" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1">REPOS</text><text x="92" y="145" text-anchor="middle" fill="#e5f8fb" font-family="Arial, sans-serif" font-size="27" font-weight="700">${formatNumber(stats.repos)}</text><text x="225" y="108" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1">STARS</text><text x="225" y="145" text-anchor="middle" fill="#e5f8fb" font-family="Arial, sans-serif" font-size="27" font-weight="700">★ ${formatNumber(stats.stars)}</text><text x="357" y="108" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1">FOLLOWERS</text><text x="357" y="145" text-anchor="middle" fill="#e5f8fb" font-family="Arial, sans-serif" font-size="27" font-weight="700">${formatNumber(stats.followers)}</text></svg>\n`;

const totalBytes = stats.languages.reduce((total, [, bytes]) => total + bytes, 0) || 1;
const bars = stats.languages.length ? stats.languages.map(([language, bytes], index) => {
  const y = 81 + index * 20;
  const percentage = Math.round((bytes / totalBytes) * 100);
  return `<text x="26" y="${y}" fill="#d1d5db" font-family="Arial, sans-serif" font-size="12" font-weight="700">${escapeXml(language)}</text><text x="424" y="${y}" text-anchor="end" fill="#71808a" font-family="Arial, sans-serif" font-size="11">${percentage}%</text><rect x="132" y="${y - 11}" width="260" height="7" rx="3.5" fill="#172126"/><rect x="132" y="${y - 11}" width="${(260 * percentage) / 100}" height="7" rx="3.5" fill="${accent}"/>`;
}).join("") : `<text x="225" y="125" text-anchor="middle" fill="#71808a" font-family="Arial, sans-serif" font-size="13">Awaiting the next GitHub sync</text>`;
const languages = `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="195" viewBox="0 0 450 195" role="img" aria-labelledby="title desc"><title id="title">Top languages</title><desc id="desc">Languages used across public repositories.</desc><rect width="450" height="195" rx="10" fill="#000" stroke="#fff"/><rect x="0" y="0" width="6" height="195" rx="3" fill="${accent}"/><text x="26" y="36" fill="#fff" font-family="Arial, sans-serif" font-size="19" font-weight="700">TOP LANGUAGES</text><text x="26" y="55" fill="${accent}" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1.1">PUBLIC REPOSITORIES · BY CODE VOLUME</text><path d="M26 68H424" stroke="#333"/>${bars}</svg>\n`;
await Promise.all([writeFile("assets/github-overview.svg", overview), writeFile("assets/top-languages.svg", languages)]);
