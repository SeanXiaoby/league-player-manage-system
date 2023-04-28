const express = require("express");
const PlayerUtils = require("../helpers/utils");
const db = require("../models/db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  let matches = [];
  const query = req.query;
  let status = 200;

  if (
    Object.keys(query).length !== 0 &&
    Object.keys(query).includes("is_active")
  ) {
    if (query.is_active === "false") {
      matches = await db.GetAllMatches(false);
    } else if (query.is_active === "true") {
      matches = await db.GetAllMatches(true);
    } else {
      matches = await db.GetAllMatches("all");
    }
  } else {
    matches = await db.GetAllMatches(true);
  }

  res.locals.status = status;
  res.locals.res_content = matches;

  res.status(status).json(matches);

  next();
});

router.get("/:mid", async (req, res, next) => {
  const mid = req.params.mid;
  let status = 404,
    content = "";

  const match = await db.GetMatch(mid);

  if (match !== null) {
    status = 200;
    content = match;
    res.status(status).json(match);
  } else {
    status = 404;
    content = "Match not found";
    res.status(status).send();
  }

  res.locals.status = status;
  res.locals.res_content = match;

  next();
});

router.post("", async (req, res, next) => {
  const query = req.body;
  let status = 400,
    content = "";

  const result = await db.CreateMatch(query);

  if (result.succeed) {
    status = 200;
    content = result.match;
    res.status(status).json(content);
  } else {
    status = result.code;
    content = result.msg;
    res.status(status).send(content);
  }

  res.locals.status = status;
  res.locals.res_content = content;

  next();
});

router.post("/:mid/award/:pid", async (req, res, next) => {
  const mid = req.params.mid;
  const pid = req.params.pid;
  const query = req.query;
  let status = 400,
    content = "";

  if (
    Object.keys(query).length !== 1 ||
    query.points === undefined ||
    !Number.isInteger(Number(query.points)) ||
    Number(query.points) <= 0 ||
    query.points.includes(".")
  ) {
    status = 400;
    content = "bad query strings";
    res.status(status).send(content);
  } else {
    const points = Number.parseInt(query.points);
    const result = await db.UpdatePointsMatch(mid, pid, points);
    if (result.succeed) {
      status = 200;
      content = result.match;
      res.status(status).json(content);
    } else {
      status = result.code;
      content = result.msg;
      res.status(status).send(content);
    }
  }

  res.locals.status = status;
  res.locals.res_content = content;

  next();
});

router.post("/:mid/end", async (req, res, next) => {
  const mid = req.params.mid;
  let status = 400,
    content = "";

  const result = await db.EndMatch(mid);

  if (result.succeed) {
    status = 200;
    content = result.match;
    res.status(status).json(content);
  } else {
    status = result.code;
    content = result.msg;
    res.status(status).send(content);
  }

  res.locals.status = status;
  res.locals.res_content = content;

  next();
});

router.post("/:mid/disqualify/:pid", async (req, res, next) => {
  const mid = req.params.mid;
  const pid = req.params.pid;
  let status = 400,
    content = "";

  const result = await db.DisqualifyMatch(mid, pid);

  if (result.succeed) {
    status = 200;
    content = result.match;
    res.status(status).json(content);
  } else {
    status = result.code;
    content = result.msg;
    res.status(status).send(content);
  }

  res.locals.status = status;
  res.locals.res_content = content;

  next();
});

module.exports = router;
