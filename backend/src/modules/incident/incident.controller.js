const { incidentService } = require("../../services/incident.service");
const { sanitizeError } = require("../../utils/sanitizer");

/**
 * List incidents with filtering & pagination
 * GET /api/incidents
 */
const listIncidents = async (req, res) => {
  try {
    const { repositoryId, severity, status, search, limit, page } = req.query;

    const result = await incidentService.listIncidents({
      repositoryId,
      severity,
      status,
      search,
      limit,
      page,
    });

    return res.json(result);
  } catch (error) {
    const safeError = sanitizeError(error.message || error);
    console.error("[IncidentController] Error listing incidents:", safeError);
    return res.status(500).json({ error: safeError || "Failed to fetch incidents" });
  }
};

/**
 * Get incident by ID
 * GET /api/incidents/:id
 */
const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await incidentService.getIncidentById(id);
    return res.json({ incident });
  } catch (error) {
    const safeError = sanitizeError(error.message || error);
    console.error("[IncidentController] Error getting incident:", safeError);
    return res.status(error.message === "Incident not found." ? 404 : 500).json({
      error: safeError || "Failed to fetch incident",
    });
  }
};

/**
 * Update incident status
 * PATCH /api/incidents/:id
 */
const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Missing 'status' in request body." });
    }

    const updated = await incidentService.updateIncidentStatus(id, status);
    return res.json({ message: "Incident status updated", incident: updated });
  } catch (error) {
    const safeError = sanitizeError(error.message || error);
    console.error("[IncidentController] Error updating incident status:", safeError);
    return res.status(error.message === "Incident not found." ? 404 : 400).json({
      error: safeError || "Failed to update incident",
    });
  }
};

module.exports = {
  listIncidents,
  getIncidentById,
  updateIncidentStatus,
};
