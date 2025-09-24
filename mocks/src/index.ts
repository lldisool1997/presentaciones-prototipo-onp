import "dotenv/config";
import express from "express";
import cors from "cors";
import { delay } from "./middleware/delay.js";
import llamados from "./routes/llamados.js";
import pagos from "./routes/pagos.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(delay);

// Health
app.get("/health", (_req, res) => res.json({ ok: true, service: "onp-mock-api" }));

// Rutas
app.use("/api/llamados", llamados);
app.use("/api/pagos", pagos);

// Arranque
const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`Mock API corriendo en http://localhost:${port}`));
