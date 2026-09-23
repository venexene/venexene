import { mkdir, readFile, writeFile } from "node:fs/promises";

const items = [
  { file: "telegram", label: "TELEGRAM", value: "@Flayven", logo: "telegram" },
  { file: "email", label: "EMAIL", value: "SEND EMAIL", logo: "gmail" },
  { file: "leetcode", label: "LEETCODE", value: "venexene", logo: "leetcode", labelSize: 12 },
  { file: "resume", label: "RESUME", value: "OPEN PDF" },
];

const documentIcon = '<path d="M32 25H45L51 31V55H32Z M45 25V32H51 M36 39H47 M36 45H47" fill="none" stroke="#00e5ff" stroke-width="2.5" stroke-linejoin="round"/>';
const logos = new Map(await Promise.all(items.filter((item) => item.logo).map(async (item) => [item.logo, `data:image/svg+xml;base64,${await readFile(`assets/logos/${item.logo}.svg`, "base64")}`])));

await mkdir("assets/connect", { recursive: true });
await Promise.all(items.map(async (item) => {
  const icon = item.logo ? `<image href="${logos.get(item.logo)}" x="28" y="27" width="28" height="28"/>` : documentIcon;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="82" viewBox="0 0 430 82" role="img" aria-labelledby="title desc"><title id="title">${item.label}</title><desc id="desc">${item.value}</desc><rect width="430" height="82" rx="8" fill="#000" stroke="#fff"/><rect width="5" height="82" rx="2" fill="#00e5ff"/><rect x="18" y="16" width="48" height="50" rx="7" fill="#00e5ff" fill-opacity=".11" stroke="#00e5ff" stroke-opacity=".55"/>${icon}<text x="84" y="35" fill="#00e5ff" font-family="Arial, sans-serif" font-size="${item.labelSize ?? 11}" font-weight="700" letter-spacing="1">${item.label}</text><text x="84" y="59" fill="#f3f4f6" font-family="Arial, sans-serif" font-size="16" font-weight="600">${item.value}</text></svg>\n`;
  await writeFile(`assets/connect/${item.file}.svg`, svg);
}));
