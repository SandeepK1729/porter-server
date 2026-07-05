const fs = require("node:fs");
const path = require("node:path");

const getArg = (name, fallback) => {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1];
};

const toFloat = (value, fallback) => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
};

const existsFile = (filePath) => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const findJsonFile = (inputPath) => {
  if (!inputPath) return null;
  if (!fs.existsSync(inputPath)) return null;

  const stat = fs.statSync(inputPath);
  if (stat.isFile()) return inputPath;

  const stack = [inputPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const children = fs.readdirSync(current, { withFileTypes: true });
    for (const child of children) {
      const childPath = path.join(current, child.name);
      if (child.isDirectory()) {
        stack.push(childPath);
      } else if (child.isFile() && child.name.endsWith(".json") && !child.name.includes("comparison")) {
        return childPath;
      }
    }
  }

  return null;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const currentPath = getArg("current", "artifacts/loadtest/current.json");
const previousInput = getArg("previous", "artifacts/loadtest-previous");
const outputPath = getArg("out", "artifacts/loadtest/comparison.md");
const regressionThresholdPct = toFloat(
  getArg("regression-threshold", process.env.LOADTEST_REGRESSION_THRESHOLD || "10"),
  10,
);
const verbose =
  process.argv.includes("--verbose") ||
  toBool(process.env.LOADTEST_VERBOSE, false);

const verboseLog = (...args) => {
  if (verbose) console.log("[loadtest:compare:verbose]", ...args);
};

if (!existsFile(currentPath)) {
  console.error(`Current results file was not found: ${currentPath}`);
  process.exit(1);
}

const current = readJson(currentPath);
const previousPath = findJsonFile(previousInput);

verboseLog("Comparison inputs", {
  currentPath,
  previousInput,
  previousPath,
  outputPath,
  regressionThresholdPct,
});

const getMetric = (obj, pathKey) =>
  pathKey.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "n/a";

const deltaPercent = (currentValue, previousValue) => {
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) {
    return null;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
};

const formatDelta = (delta) => {
  if (delta === null) return "n/a";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}%`;
};

const metrics = [
  { label: "Requests/sec avg", key: "metrics.requests.average", direction: "higher" },
  { label: "Latency avg (ms)", key: "metrics.latency.average", direction: "lower" },
  { label: "Throughput avg (bytes/sec)", key: "metrics.throughput.average", direction: "higher" },
  { label: "Total requests", key: "metrics.requests.total", direction: "higher" },
  { label: "Error count", key: "metrics.errors", direction: "lower" },
];

const lines = [];
lines.push("# Load Test Comparison");
lines.push("");
lines.push(`Current: ${currentPath}`);
lines.push(`Previous input: ${previousInput}`);
lines.push(`Previous resolved: ${previousPath || "none"}`);
lines.push("");

let hasRegression = false;

if (!previousPath) {
  lines.push("No previous benchmark artifact was found. This run is now the baseline.");
} else {
  const previous = readJson(previousPath);

  lines.push("| Metric | Current | Previous | Delta | Status |");
  lines.push("| --- | ---: | ---: | ---: | --- |");

  for (const metric of metrics) {
    const currentValue = getMetric(current, metric.key);
    const previousValue = getMetric(previous, metric.key);
    const delta = deltaPercent(currentValue, previousValue);

    let status = "ok";
    if (delta !== null) {
      if (metric.direction === "higher" && delta < -regressionThresholdPct) {
        status = `regression > ${regressionThresholdPct}%`;
        hasRegression = true;
      }
      if (metric.direction === "lower" && delta > regressionThresholdPct) {
        status = `regression > ${regressionThresholdPct}%`;
        hasRegression = true;
      }
    }

    verboseLog("Metric evaluation", {
      metric: metric.label,
      direction: metric.direction,
      currentValue,
      previousValue,
      delta,
      threshold: regressionThresholdPct,
      status,
    });

    lines.push(
      `| ${metric.label} | ${formatNumber(currentValue)} | ${formatNumber(previousValue)} | ${formatDelta(delta)} | ${status} |`,
    );
  }
}

lines.push("");
lines.push(`Regression threshold: ${regressionThresholdPct}%`);
lines.push(`Fail on regression: ${process.env.FAIL_ON_LOADTEST_REGRESSION === "true" ? "true" : "false"}`);
lines.push("");
lines.push("Threshold semantics:");
lines.push(`- For higher-is-better metrics, a drop larger than ${regressionThresholdPct}% is marked as regression.`);
lines.push(`- For lower-is-better metrics, an increase larger than ${regressionThresholdPct}% is marked as regression.`);
lines.push("- Example: previous Requests/sec = 1000, current = 890 => -11.00% => regression when threshold is 10%.");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log(lines.join("\n"));
verboseLog("Regression decision", {
  hasRegression,
  failOnRegression: process.env.FAIL_ON_LOADTEST_REGRESSION === "true",
});

if (hasRegression && process.env.FAIL_ON_LOADTEST_REGRESSION === "true") {
  process.exit(1);
}
