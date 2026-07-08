import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.ts";
import { providersRouter } from "./routes/providers.ts";
import { templatesRouter } from "./routes/templates.ts";
import { jobsRouter } from "./routes/jobs.ts";
import { groupsRouter } from "./routes/groups.ts";
import { dashboardRouter } from "./routes/dashboard.ts";
import { authRouter } from "./routes/auth.ts";
import { storageRouter } from "./routes/storage.ts";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", providersRouter);
  app.use("/api", templatesRouter);
  app.use("/api", jobsRouter);
  app.use("/api", groupsRouter);
  app.use("/api", dashboardRouter);
  app.use("/api", storageRouter);

  return app;
}
