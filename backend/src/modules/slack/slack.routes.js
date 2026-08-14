const express = require("express");
const router = express.Router();
const { getSlackStatus } = require("./slack.controller");

router.get("/status", getSlackStatus);

module.exports = router;
