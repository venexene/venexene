import { mkdir, readFile, writeFile } from "node:fs/promises";

const items = [
  { file: "github", label: "GITHUB", value: "venexene", logo: "github" },
  { file: "telegram", label: "TELEGRAM", value: "@Flayven", logo: "telegram" },
  { file: "email", label: "EMAIL", value: "SEND EMAIL", logo: "gmail" },
  { file: "leetcode", label: "LEETCODE", value: "venexene", logo: "leetcode" },
  { file: "resume", label: "RESUME", value: "OPEN PDF" },
];

const documentIcon = '<path d="M20 14H39L47 22V50H20Z M39 14V23H47 M25 32H42 M25 39H42" fill="none" stroke="#00e5ff" stroke-width="2.5" stroke-linejoin="round"/>';
const logos = new Map(await Promise.all(items.filter((item) => item.logo).map(async (item) => [item.logo, `data:image/svg+xml;base64,${await readFile(`assets/logos/${item.logo}.svg`, "base64")}`])));

await mkdir("assets/connect", { recursive: true });
await Promise.all(items.map(async (item) => {
  const icon = item.logo ? `<image href="${logos.get(item.logo)}" x="24" y="23" width="22" height="22"/>` : documentIcon;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="174" height="70" viewBox="0 0 174 70" role="img" aria-labelledby="title desc"><title id="title">${item.label}</title><desc id="desc">${item.value}</desc><rect width="174" height="70" rx="8" fill="#000" stroke="#fff"/><rect width="4" height="70" rx="2" fill="#00e5ff"/><rect x="16" y="15" width="38" height="40" rx="7" fill="#00e5ff" fill-opacity=".11" stroke="#00e5ff" stroke-opacity=".55"/>${icon}<text x="67" y="29" fill="#00e5ff" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1">${item.label}</text><text x="67" y="46" fill="#f3f4f6" font-family="Arial, sans-serif" font-size="12" font-weight="600">${item.value}</text></svg>\n`;
  await writeFile(`assets/connect/${item.file}.svg`, svg);
}));
