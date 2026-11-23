import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();
app.set("json replacer", (key, value) =>
  value && typeof value === "object" && typeof value.toDate === "function"
    ? value.toDate().toISOString()
    : value
);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "ok" }));
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;