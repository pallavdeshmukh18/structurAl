const express = require("express");
const router = express.Router();
const {
  listIncidents,
  getIncidentById,
  updateIncidentStatus,
} = require("./incident.controller");

// Public/Session-accessible API routes
router.get("/", listIncidents);
router.get("/:id", getIncidentById);
router.patch("/:id", updateIncidentStatus);
router.put("/:id/status", updateIncidentStatus);

module.exports = router;
