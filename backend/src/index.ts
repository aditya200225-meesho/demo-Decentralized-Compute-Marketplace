import "dotenv/config";
import { createApp } from "./app.ts";
import { seedIfEmpty } from "./seed.ts";
import { startScheduler } from "./services/scheduler.ts";

const PORT = Number(process.env.PORT) || 8090;

async function main() {
  await seedIfEmpty();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[backend] listening on port ${PORT}`);
  });

  startScheduler();
}

main().catch((err) => {
  console.error("[backend] fatal startup error", err);
  process.exit(1);
});
