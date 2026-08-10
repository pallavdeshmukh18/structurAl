const express = require("express");
const router = express.Router();

const { searchUsers } = require("./user.controller");
const { isAuthenticated } = require("../../middleware/auth");

router.get("/search", isAuthenticated, searchUsers);

module.exports = router;
