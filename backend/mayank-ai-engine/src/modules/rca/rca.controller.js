const { analyzeRootCause } = require("./rca.service");

async function handleRca(req, res, next) {
  try {
    const { incident, executionGraph, sourceCode, fileContext } = req.body;

    if (!incident) {
      return res.status(400).json({
        error: "Missing required field 'incident' in body",
      });
    }

    const rcaResult = await analyzeRootCause({
      incident,
      executionGraph,
      sourceCode,
      fileContext,
    });

    return res.json(rcaResult);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  handleRca,
};
