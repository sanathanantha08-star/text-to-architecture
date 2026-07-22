// Generates simple colored SVG placeholder icons for every service key.
// Drop the official AWS Architecture Icons into public/icons/aws/ later at the
// same file names to replace these — no code changes needed.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons", "aws");
mkdirSync(outDir, { recursive: true });

const COLORS = {
  compute: "#ED7100",
  networking: "#8C4FFF",
  storage: "#7AA116",
  database: "#2E27AD",
  integration: "#E7157B",
  ml: "#01A88D",
  security: "#DD344C",
  management: "#CD2264",
  generic: "#5A6B86",
};

// key -> [category, shortLabel]
const SERVICES = {
  cloudfront: ["networking", "CF"],
  alb: ["networking", "ALB"],
  nlb: ["networking", "NLB"],
  apigateway: ["networking", "API"],
  route53: ["networking", "R53"],
  vpc: ["networking", "VPC"],
  subnet: ["networking", "SUB"],
  ec2: ["compute", "EC2"],
  ecs: ["compute", "ECS"],
  eks: ["compute", "EKS"],
  lambda: ["compute", "λ"],
  s3: ["storage", "S3"],
  rds: ["database", "RDS"],
  dynamodb: ["database", "DDB"],
  sqs: ["integration", "SQS"],
  sns: ["integration", "SNS"],
  bedrock: ["ml", "BR"],
  cognito: ["security", "COG"],
  iam: ["security", "IAM"],
  cloudwatch: ["management", "CW"],
  generic: ["generic", "SVC"],
};

function svg(color, label) {
  const fontSize = label.length > 3 ? 18 : label.length > 2 ? 22 : 26;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="12" fill="url(#g)"/>
  <text x="32" y="32" fill="#ffffff" font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}" font-weight="700" text-anchor="middle"
        dominant-baseline="central">${label}</text>
</svg>
`;
}

// Only fill in icons that are missing. Real icons dropped in at these filenames
// (e.g. the official AWS Architecture Icons) are left untouched.
const force = process.argv.includes("--force");
let count = 0;
let skipped = 0;
for (const [key, [category, label]] of Object.entries(SERVICES)) {
  const dest = join(outDir, `${key}.svg`);
  if (!force && existsSync(dest)) {
    skipped += 1;
    continue;
  }
  const color = COLORS[category] ?? COLORS.generic;
  writeFileSync(dest, svg(color, label), "utf8");
  count += 1;
}

console.log(
  `Generated ${count} placeholder icons in public/icons/aws/` +
    (skipped ? ` (kept ${skipped} existing)` : "") +
    (force ? "" : " — pass --force to overwrite existing files"),
);
