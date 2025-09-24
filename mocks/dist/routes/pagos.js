import { Router } from "express";
const r = Router();
// POST /api/pagos/validar  { "paymentReference": "BANK-OP-123" }
r.post("/validar", (req, res) => {
    const ref = (req.body?.paymentReference ?? "N/A");
    // Simular error si envías ?_status=500
    const forced = Number(req.query._status || 0);
    if (forced)
        return res.status(forced).json({ status: "ERROR_FORZADO", ref });
    return res.status(202).json({ status: "EN_PROCESO", ref });
});
export default r;
