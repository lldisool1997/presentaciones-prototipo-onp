import { Router } from "express";
const r = Router();

// GET /api/llamados?fundId=F-001
r.get("/", (req, res) => {
  const fundId = String(req.query.fundId ?? "F-000");
  return res.json([
    { id: 12, fundId, numero: "00012", monto: 50000, estado: "APROBADO" },
    { id: 13, fundId, numero: "00013", monto: 75000, estado: "ENVIADO" }
  ]);
});

// GET /api/llamados/12
r.get("/:id", (req, res) => {
  const { id } = req.params;
  return res.json({ id, fundId: "F-001", numero: "00012", monto: 50000, estado: "APROBADO" });
});

export default r;
