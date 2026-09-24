import { readFile, writeFile } from "node:fs/promises";

const items = [
  { name: "Go", role: "LANGUAGE", logo: "go" },
  { name: "Python", role: "LANGUAGE", logo: "python" },
  { name: "PostgreSQL", role: "DATABASE", logo: "postgresql" },
  { name: "Kafka", role: "STREAMING", logo: "kafka" },
  { name: "RabbitMQ", role: "MESSAGING", logo: "rabbitmq" },
  { name: "Docker", role: "CONTAINERS", logo: "docker" },
  { name: "SQLite", role: "DATABASE", logo: "sqlite" },
  { name: "Prometheus", role: "MONITORING", logo: "prometheus" },
];

const accent = "#00e5ff";
const logos = new Map(await Promise.all(items.map(async ({ logo }) => [logo, `data:image/svg+xml;base64,${await readFile(`assets/logos/${logo}.svg`, "base64")}`])));
const cards = items.map((item, index) => {
  const x = 22 + (index % 4) * 220;
  const y = 69 + Math.floor(index / 4) * 82;
  return `<g><rect x="${x}" y="${y}" width="204" height="64" rx="8" fill="#080808" stroke="#303030"/><rect x="${x}" y="${y}" width="5" height="64" rx="2.5" fill="${accent}"/><rect x="${x + 17}" y="${y + 12}" width="40" height="40" rx="7" fill="${accent}" fill-opacity=".14" stroke="${accent}" stroke-opacity=".7"/><image href="${logos.get(item.logo)}" x="${x + 23}" y="${y + 18}" width="28" height="28"/><text x="${x + 70}" y="${y + 31}" fill="#fff" font-family="Arial, sans-serif" font-size="16" font-weight="700">${item.name}</text><text x="${x + 70}" y="${y + 47}" fill="#8d99a6" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="1">${item.role}</text></g>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="240" viewBox="0 0 900 240" role="img" aria-labelledby="title desc"><title id="title">Technical stack</title><desc id="desc">Go, Python, PostgreSQL, Kafka, RabbitMQ, Docker, SQLite and Prometheus.</desc><rect width="900" height="240" rx="10" fill="#000" stroke="#fff"/><rect x="0" y="0" width="6" height="240" rx="3" fill="#00e5ff"/><text x="26" y="37" fill="#fff" font-family="Arial, sans-serif" font-size="19" font-weight="700">TECH STACK</text><path d="M26 52H874" stroke="#333"/>${cards}</svg>\n`;

await writeFile("assets/stack.svg", svg);
