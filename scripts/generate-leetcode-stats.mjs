import { readFile, writeFile } from "node:fs/promises";

const username = process.env.LEETCODE_USERNAME ?? "venexene";
const endpoint = "https://leetcode.com/graphql";
const svgPath = "metrics.plugin.leetcode.svg";
const escapeXml = (text) => String(text).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character]));

const request = async (query, variables) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "venexene-profile-assets" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("LeetCode returned HTTP " + response.status);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map(({ message }) => message).join("; "));
  return payload.data;
};

const problemsQuery = "query Problems ($username: String!) { allQuestionsCount { difficulty count } matchedUser(username: $username) { submitStatsGlobal { acSubmissionNum { difficulty count } } } }";
const skillsQuery = "query Skills ($username: String!) { matchedUser(username: $username) { tagProblemCounts { advanced { tagName problemsSolved } intermediate { tagName problemsSolved } fundamental { tagName problemsSolved } } } }";
const recentQuery = "query Recent ($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { title timestamp } }";
const [problemsData, skillsData, recentData] = await Promise.all([
  request(problemsQuery, { username }), request(skillsQuery, { username }), request(recentQuery, { username, limit: 2 }),
]);
const totals = Object.fromEntries(problemsData.allQuestionsCount.map(({ difficulty, count }) => [difficulty, count]));
const solved = Object.fromEntries(problemsData.matchedUser.submitStatsGlobal.acSubmissionNum.map(({ difficulty, count }) => [difficulty, count]));
const skills = Object.entries(skillsData.matchedUser.tagProblemCounts)
  .flatMap(([category, tags]) => tags.map(({ tagName, problemsSolved }) => ({ category, tagName, problemsSolved })))
  .sort((left, right) => right.problemsSolved - left.problemsSolved).slice(0, 10);
const recent = recentData.recentAcSubmissionList;

let svg = await readFile(svgPath, "utf8");
let gauges = 0;
svg = svg.replace(/(<svg[^>]*class="gauge (all|easy|medium|hard)"[^>]*>)([\s\S]*?)(<\/svg>)/g, (match, start, cssDifficulty, body, end) => {
  const difficulty = cssDifficulty[0].toUpperCase() + cssDifficulty.slice(1);
  const total = totals[difficulty];
  const accepted = solved[difficulty] ?? 0;
  if (!total) return match;
  gauges += 1;
  const updated = body.replace(/stroke-dasharray="[^"]+"/, "stroke-dasharray=\"" + ((accepted / total) * 329) + " 329\"")
    .replace(/(<text x="60" y="50"[^>]*>)[^<]*/, "$1" + accepted)
    .replace(/(<text x="60" y="80"[^>]*>)[^<]*/, "$1/" + total);
  return start + updated + end;
});
if (gauges !== 4) throw new Error("Could not update LeetCode score gauges");

const skillLabels = skills.map(({ category, tagName, problemsSolved }) =>
  "                        <div class=\"label " + category + "\"><span class=\"dot\">⬤</span> " + escapeXml(tagName) + " <span class=\"count\">x" + problemsSolved + "</span></div>",
).join("\n");
const skillsPattern = /(<div class="topics">)[\s\S]*?(<\/div>\n                <\/section>\n                <section class="leetcode subsection">)/;
if (!skillsPattern.test(svg)) throw new Error("Could not locate LeetCode skills section");
svg = svg.replace(skillsPattern, "$1\n" + skillLabels + "\n                    $2");

const icon = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\" width=\"16\" height=\"16\"><path fill-rule=\"evenodd\" d=\"M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4 8a4 4 0 118 0 4 4 0 01-8 0z\"/></svg>";
const formatDate = (timestamp) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Number(timestamp) * 1000));
const recentRows = recent.map(({ title, timestamp }) => "                    <div class=\"field\">\n                        " + icon + "\n                        <div class=\"infos\">\n                            <div class=\"title\">" + escapeXml(title) + "</div>\n                            <div class=\"date\">" + formatDate(timestamp) + "</div>\n                        </div>\n                    </div>").join("\n");
const recentPattern = /(<h2 class="field">[\s\S]*?Recent submissions[\s\S]*?<\/h2>)[\s\S]*?(?=\n                <\/section>\n            <\/section>)/;
if (!recentPattern.test(svg)) throw new Error("Could not locate LeetCode recent submissions section");
svg = svg.replace(recentPattern, "$1\n" + recentRows);
await writeFile(svgPath, svg);
console.log("Updated LeetCode: " + (solved.All ?? 0) + " solved; " + recent.length + " recent submissions.");
