const express = require("express");
const PlayerUtils = require("../helpers/utils");
const db = require("../models/db");

const router = express.Router();

router.get("/ping", (req, res, next) => {
  res.status(204).send();
  next();
});

module.exports = router;
