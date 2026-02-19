const fs = require("fs");

const BAD = ["Ø", "Ã", "â€", "�", "أک", "™", "Â", "ï»¿"];

const TARGETS = [
  "backend/api.ts",
];

let bad = [];
for (const rel of TARGETS) {
  if (!fs.existsSync(rel)) continue;
  const txt = fs.readFileSync(rel, "utf8");
  const hits = BAD.filter(m => txt.includes(m));
  if (hits.length) bad.push({ file: rel, hits });
}

if (bad.length) {
  console.error("❌ Mojibake markers found:");
  for (const b of bad) console.error(` - ${b.file}: ${b.hits.join(", ")}`);
  process.exit(1);
} else {
  console.log("✅ No mojibake markers found in targets.");
}
