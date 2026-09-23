import { readFile, writeFile } from "node:fs/promises";

const avatar = await readFile("avatar.gif", "base64");
const avatarHref = `data:image/gif;base64,${avatar}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="160" viewBox="0 0 900 160" role="img" aria-labelledby="title desc">
  <title id="title">Alecksey Shpuganich</title>
  <desc id="desc">Go backend developer interested in machine learning and computer graphics.</desc>
  <defs>
    <clipPath id="portrait-clip"><rect x="22" y="18" width="164" height="124" rx="8"/></clipPath>
    <linearGradient id="portrait-edge" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#00e5ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
  </defs>
  <rect width="900" height="160" rx="10" fill="#000" stroke="#fff"/>
  <rect x="18" y="14" width="172" height="132" rx="11" fill="#00e5ff" fill-opacity=".12" stroke="url(#portrait-edge)" stroke-width="2"/>
  <image href="${avatarHref}" x="22" y="18" width="164" height="124" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait-clip)"/>
  <text x="220" y="54" fill="#fff" font-family="Arial, sans-serif" font-size="31" font-weight="700">Alecksey Shpuganich</text>
  <text x="220" y="79" fill="#00e5ff" font-family="Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1.3">GO BACKEND DEVELOPER</text>
  <path d="M220 96H856" stroke="#333"/>
  <text x="220" y="123" fill="#a6a6a6" font-family="Arial, sans-serif" font-size="14">Backend systems · Machine learning · Computer graphics</text>
</svg>\n`;

await writeFile("assets/profile-header.svg", svg);
