import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes/index.js";
import { env } from "./config/env.js";
import { requestId } from "./middleware/request-id.js";
import { globalLimiter } from "./middleware/rate-limit.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { httpError } from "./utils/http-error.js";

const app = express();

app.disable("x-powered-by");
if (env.trustProxy) app.set("trust proxy", env.trustProxy);

app.use(requestId);
app.use(
  helmet({
    // The API only serves JSON; the frontend is deployed separately.
    contentSecurityPolicy: false,
  }),
);

const allowAllOrigins = env.corsOrigins.includes("*");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllOrigins || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(httpError(403, "Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 600,
  }),
);

app.use(globalLimiter);
app.use(express.json({ limit: env.jsonBodyLimit }));

app.set("json replacer", (key, value) =>
  value && typeof value === "object" && typeof value.toDate === "function"
    ? value.toDate().toISOString()
    : value,
);

app.get("/", (req, res) =>
  res.json({
    status: "ok",
    persistence: env.persistence,
    authProvider: env.authProvider,
    time: new Date().toISOString(),
  }),
);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
