const express = require("express");
const PlayerUtils = require("../helpers/utils");
const db = require("../models/db");
const util = require("util");
const ejs = require("ejs");

const router = express.Router();

router.get("/", async (req, res, next) => {
  res.locals.status = 200;
  res.locals.res_content = "index.html";

  // use async/await instead of callbacks
  const render = util.promisify(res.render).bind(res);
  res.render("layout", {
    body: await render(`pages/index`, {}),
  });
  next();
});

router.get("/dashboard.html", async (req, res, next) => {
  res.locals.status = 200;
  res.locals.res_content = "dashboard.html";

  // use async/await instead of callbacks
  const render = util.promisify(res.render).bind(res);
  res.render("layout", {
    body: await render(`pages/dashboard`, {
      stats: {
        players: await db.GetPlayerOverview(),
        matches: await db.GetMatchOverview(),
        other: await db.GetOtherOverview(),
      },
    }),
  });
  next();
});

router.get("/players.html", async (req, res, next) => {
  res.locals.status = 200;
  res.locals.res_content = "player/list.html";

  const vars = {
    players: await db.getAllPlayers(),
  };
  // use async/await instead of callbacks
  const render = util.promisify(res.render).bind(res);
  res.render("layout", {
    body: await render(`pages/player/list`, vars),
  });
  next();
});

router.get("/player/create.html", async (req, res, next) => {
  // const path = __dirname + "/public/player/create.html";
  res.locals.status = 200;
  res.locals.res_content = "render player/create.html";

  const render = util.promisify(res.render).bind(res);
  res.render("layout", {
    body: await render(`pages/player/create`, {}),
  });

  next();
});

router.get("/player/:id/edit.html", async (req, res, next) => {
  res.locals.status = 200;
  res.locals.res_content = "render player/edit.html";

  const data = await db.getPlayer(req.params.id);

  const render = util.promisify(res.render).bind(res);
  res.render("layout", {
    body: await render(`pages/player/edit`, data),
  });
});

module.exports = router;
