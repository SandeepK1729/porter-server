const fs = require("node:fs");
const path = require("node:path");
const autocannon = require("autocannon");

const getArg = (name, fallback) => {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1];
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toFloat = (value, fallback) => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const outputFile = getArg("out", "artifacts/loadtest/current.json");
const url = getArg("url", process.env.LOADTEST_URL || "http://127.0.0.1:9000/healthz");
const connections = toInt(getArg("connections", process.env.LOADTEST_CONNECTIONS || "50"), 50);
const duration = toInt(getArg("duration", process.env.LOADTEST_DURATION || "20"), 20);
const pipelining = toInt(getArg("pipelining", process.env.LOADTEST_PIPELINING || "1"), 1);
const timeout = toFloat(getArg("timeout", process.env.LOADTEST_TIMEOUT || "30"), 30);

const run = (opts) =>
  new Promise((resolve, reject) => {
    autocannon(opts, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });

const main = async () => {
  const options = {
    url,
    method: "GET",
    connections,
    duration,
    pipelining,
    timeout,
    headers: {
      "accept": "application/json",
    },
  };

  const result = await run(options);

  if (
    result.requests.total <= 0 ||
    result.errors > 0 ||
    result.timeouts > 0 ||
    result.non2xx > 0
  ) {
    throw new Error(
      `Unexpected load test result: total=${result.requests.total}, errors=${result.errors}, timeouts=${result.timeouts}, non2xx=${result.non2xx}`,
    );
  }

  const payload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      commitSha: process.env.GITHUB_SHA || null,
      runId: process.env.GITHUB_RUN_ID || null,
      ref: process.env.GITHUB_REF || null,
      branch: process.env.GITHUB_REF_NAME || null,
      runner: process.env.RUNNER_NAME || null,
      nodeVersion: process.version,
      url,
      connections,
      duration,
      pipelining,
      timeout,
    },
    metrics: {
      requests: {
        total: result.requests.total,
        average: result.requests.average,
        min: result.requests.min,
        max: result.requests.max,
      },
      latency: {
        average: result.latency.average,
        min: result.latency.min,
        max: result.latency.max,
      },
      throughput: {
        total: result.throughput.total,
        average: result.throughput.average,
        min: result.throughput.min,
        max: result.throughput.max,
      },
      errors: result.errors,
      timeouts: result.timeouts,
      mismatches: result.mismatches,
      non2xx: result.non2xx,
      resets: result.resets,
      "1xx": result["1xx"],
      "2xx": result["2xx"],
      "3xx": result["3xx"],
      "4xx": result["4xx"],
      "5xx": result["5xx"],
    },
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));

  console.log("Load test complete");
  console.log(`- URL: ${url}`);
  console.log(`- Requests/sec avg: ${payload.metrics.requests.average}`);
  console.log(`- Latency avg (ms): ${payload.metrics.latency.average}`);
  console.log(`- Throughput avg (bytes/sec): ${payload.metrics.throughput.average}`);
  console.log(`- Output: ${outputFile}`);
};

main().catch((error) => {
  console.error("Load test failed:", error);
  process.exit(1);
});
