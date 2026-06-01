const express = require("express");
const router  = express.Router();
const { getRoutes } = require("../controllers/routeController");

router.get("/", getRoutes);

module.exports = router;