import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { maybeAutoCommit } from "./git-ops.js";
import { getPortfolioActivity, getProjectHistory } from "./git-history.js";
import { buildDependencyInsights, buildPortfolioSummary, buildTimeline, computeHealth, queryIndex } from "./indexer.js";
import {
  addTask,
  assertVersionToken,
  ensureProjectsDir,
  loadAllProjects,
  updateProjectMeta,
  updateMilestone,
  updateProjectStatus
} from "./markdown-store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");
const reportsDir = path.join(__dirname, "..", "reports");

async function createApp() {
  await ensureProjectsDir();
  const app = express();
  app.use(express.json());
  app.use(express.static(publicDir));

  app.get("/api/projects", async (req, res) => {
    const result = await queryIndex(req.query);
    res.json(result);
  });

  app.get("/api/timeline", async (_req, res) => {
    const projects = await loadAllProjects();
    res.json({
      generatedAt: new Date().toISOString(),
      events: buildTimeline(projects)
    });
  });

  app.get("/api/projects/:slug/history", async (req, res) => {
    try {
      const history = await getProjectHistory(req.params.slug, {
        limit: req.query.limit,
        skip: req.query.skip
      });
      res.json({ ok: true, ...history });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/activity", async (req, res) => {
    try {
      const activity = await getPortfolioActivity({ limit: req.query.limit, skip: req.query.skip });
      res.json({ ok: true, ...activity });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/alerts", async (_req, res) => {
    try {
      const alertsPath = path.join(reportsDir, "alerts-latest.json");
      const raw = await fs.readFile(alertsPath, "utf8");
      res.json({ ok: true, alerts: JSON.parse(raw) });
    } catch {
      res.json({ ok: true, alerts: [] });
    }
  });

  app.get("/api/dependencies", async (_req, res) => {
    const projects = await loadAllProjects();
    res.json({ ok: true, ...buildDependencyInsights(projects) });
  });

  app.get("/api/health", async (_req, res) => {
    const projects = await loadAllProjects();
    const ranked = projects
      .map((project) => ({ slug: project.slug, name: project.name, score: computeHealth(project) }))
      .sort((a, b) => a.score - b.score);
    res.json({ ok: true, topAtRisk: ranked.slice(0, 5), all: ranked });
  });

  app.get("/api/portfolio", async (_req, res) => {
    const projects = await loadAllProjects();
    res.json({ ok: true, summary: buildPortfolioSummary(projects) });
  });

  app.patch("/api/projects/:slug/status", async (req, res) => {
    try {
      await assertVersionToken(req.params.slug, req.body.versionToken);
      const result = await updateProjectStatus(req.params.slug, req.body.status);
      const commit = await maybeAutoCommit({
        slug: req.params.slug,
        message: `project(${req.params.slug}): update status to ${req.body.status}`,
        files: [result.updatedFile]
      });
      res.json({ ok: true, commit });
    } catch (error) {
      if (error.code === "VERSION_CONFLICT" || error.code === "TOKEN_REQUIRED") {
        res.status(409).json({ ok: false, error: error.message, currentToken: error.currentToken });
        return;
      }
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/projects/:slug/tasks", async (req, res) => {
    try {
      if (!req.body.task || typeof req.body.task !== "string") {
        throw new Error("task is required");
      }
      await assertVersionToken(req.params.slug, req.body.versionToken);
      const result = await addTask(req.params.slug, req.body.task.trim());
      const commit = await maybeAutoCommit({
        slug: req.params.slug,
        message: `project(${req.params.slug}): add task`,
        files: [result.updatedFile]
      });
      res.json({ ok: true, commit });
    } catch (error) {
      if (error.code === "VERSION_CONFLICT" || error.code === "TOKEN_REQUIRED") {
        res.status(409).json({ ok: false, error: error.message, currentToken: error.currentToken });
        return;
      }
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.patch("/api/projects/:slug/milestones/:milestoneId", async (req, res) => {
    try {
      await assertVersionToken(req.params.slug, req.body.versionToken);
      const result = await updateMilestone(req.params.slug, req.params.milestoneId, req.body || {});
      const commit = await maybeAutoCommit({
        slug: req.params.slug,
        message: `project(${req.params.slug}): update milestone ${req.params.milestoneId}`,
        files: [result.updatedFile]
      });
      res.json({ ok: true, commit });
    } catch (error) {
      if (error.code === "VERSION_CONFLICT" || error.code === "TOKEN_REQUIRED") {
        res.status(409).json({ ok: false, error: error.message, currentToken: error.currentToken });
        return;
      }
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.patch("/api/projects/:slug/meta", async (req, res) => {
    try {
      await assertVersionToken(req.params.slug, req.body.versionToken);
      const result = await updateProjectMeta(req.params.slug, req.body || {});
      const commit = await maybeAutoCommit({
        slug: req.params.slug,
        message: `project(${req.params.slug}): update project metadata`,
        files: [result.updatedFile]
      });
      res.json({ ok: true, commit });
    } catch (error) {
      if (error.code === "VERSION_CONFLICT" || error.code === "TOKEN_REQUIRED") {
        res.status(409).json({ ok: false, error: error.message, currentToken: error.currentToken });
        return;
      }
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}

const port = Number(process.env.PORT || 3000);
const app = await createApp();
app.listen(port, () => {
  console.log(`Project dashboard running on http://localhost:${port}`);
});
