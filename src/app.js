import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "ok" }));
app.use("/api/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
