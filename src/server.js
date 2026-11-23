import "dotenv/config";

let server = null;
let terminateOcr = null;
let shuttingDown = false;

try {
  const [{ env }, { default: app }, ocr, firebase] = await Promise.all([
    import("./config/env.js"),
    import("./app.js"),
    import("./services/ocr.service.js"),
    import("./config/firebase.js"),
  ]);
  terminateOcr = ocr.terminateOcr;

  // Fail fast on malformed Firebase configuration instead of failing at the
  // first request. Local mode never initializes the SDK.
  if (env.persistence === "firestore" || env.authProvider === "firebase") {
    firebase.getFirebaseApp();
  }

  server = app.listen(env.port, env.host, () => {
    console.log(
      `OneMed API running on http://localhost:${env.port} ` +
        `(persistence=${env.persistence}, auth=${env.authProvider}, env=${env.nodeEnv})`,
    );
    if (env.persistence === "local") {
      console.log(`Local data directory: ${env.localDataDir}`);
    }
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${env.port} is already in use. Set PORT to a free port.`);
    } else {
      console.error("Server error:", error);
    }
    process.exit(1);
  });

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received; closing HTTP server...`);
    const forceExit = setTimeout(() => {
      console.error("Shutdown timed out; forcing exit.");
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      if (terminateOcr) await terminateOcr().catch(() => {});
      clearTimeout(forceExit);
      console.log("Shutdown complete.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
} catch (error) {
  if (error.code === "CONFIG_ERROR") {
    console.error(`Configuration error:\n  ${error.message}`);
  } else {
    console.error("Failed to start OneMed API:", error);
  }
  process.exit(1);
}
