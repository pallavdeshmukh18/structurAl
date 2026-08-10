const { detectSlop } = require("./slop.service");

/**
 * POST /api/code-health/scan
 * Body: { diff?, files? }  -- at least one required
 * Returns: { codeHealth, findings }
 */
async function handleSlopScan(req, res, next) {
  try {
    const { diff, files } = req.body;
    const result = await detectSlop({ diff, files });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { handleSlopScan };
