export function delay(req, _res, next) {
    const dflt = Number(process.env.DEFAULT_DELAY_MS || 0);
    const ms = Number(req.query._delay ?? dflt);
    if (!ms)
        return next();
    setTimeout(next, ms);
}
