import { Request, Response, NextFunction } from "express";

export function delay(req: Request, _res: Response, next: NextFunction) {
  const dflt = Number(process.env.DEFAULT_DELAY_MS || 0);
  const ms = Number(req.query._delay ?? dflt);
  if (!ms) return next();
  setTimeout(next, ms);
}
