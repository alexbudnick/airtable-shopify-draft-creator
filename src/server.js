import express from "express";
import { CFG, logger } from "./lib.js";
import { spawn } from "child_process";

const app = express();
const PORT = Number(process.env.PORT || 3000);

let activeJob = null;

function requireSecret(req, res, next) {
  if (!CFG.triggerSecret) return next();
  if (req.query.secret !== CFG.triggerSecret) {
    return res.status(401).json({ ok: false, error: "Invalid secret" });
  }
  next();
}

function runScript(script, res) {
  if (activeJob) {
    return res.status(409).json({
      ok: false,
      error: "Job already running",
      activeJob
    });
  }

  activeJob = {
    script,
    startedAt: new Date().toISOString()
  };

  const child = spawn("npm", ["run", script], { stdio: "inherit", shell: true });

  child.on("close", code => {
    const finishedJob = activeJob;
    activeJob = null;

    if (code === 0) {
      res.json({ ok: true, script, finishedJob });
    } else {
      res.status(500).json({ ok: false, script, code, finishedJob });
    }
  });

  child.on("error", error => {
    const failedJob = activeJob;
    activeJob = null;

    res.status(500).json({
      ok: false,
      script,
      error: error.message,
      failedJob
    });
  });
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "airtable-shopify-draft-creator",
    version: "0.6.2-idempotent-drafts",
    activeJob
  });
});

app.post("/jobs/shopify/create-drafts", requireSecret, (req, res) => runScript("sync-drafts", res));

app.listen(PORT, () => logger("info", `Listening on port ${PORT}`));
