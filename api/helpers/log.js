const express = require("express");
const PlayerUtils = require("./utils");
const db = require("../models/db");
const { v4: uuidv4 } = require("uuid");

const classifyReqType = (path) => {
  if (path.includes("/api")) {
    if (path.includes("player")) {
      return "/api/player";
    } else if (path.includes("match")) {
      return "/api/match";
    } else {
      return "other api";
    }
  } else if (path.includes(".html")) {
    return "pages";
  }
  return "other";
};

const PreLogInfo = (req, res, next) => {
  res.locals.log = {
    req_time: new Date(),
  };
  next();
};

const PostLogInfo = (req, res, next) => {
  const Info = {
    _id: uuidv4(),
    version: "2.0",
    client: { ip: req.ip, agent: req.headers["user-agent"] },
    request: {
      path: req.path,
      query: req.query,
      body: req.body,
      type: classifyReqType(req.path),
      time: res.locals.log === undefined ? null : res.locals.log.req_time,
    },
    response: {
      status: res.statusCode,
      msg: res.statusMessage,
      time: new Date(),
    },
  };

  Info.elapse =
    Info.request.time === null
      ? null
      : (Info.response.time - Info.request.time) / 1000;

  console.log("\n========== New request and response ============");
  console.log(Info);
  console.log("================= End of Log ===================\n");

  db._log.insertOne(Info);

  next();
};

const NotFoundHandler = (req, res, next) => {
  if (!res.headersSent) {
    res.locals.status = 404;
    res.locals.res_content = "My 404 handler...";
    res.status(404).send("My 404 handler...");
  }

  next();
};

module.exports = { NotFoundHandler, PreLogInfo, PostLogInfo };
