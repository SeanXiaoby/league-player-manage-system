const express = require("express");
const PlayerUtils = require("../helpers/utils");
const db = require("../models/db");

const router = express.Router();

router.get("/:pid", async (req, res, next) => {
  const pid = req.params.pid;
  let status = 404,
    content = "";

  const find_result = await db.getPlayer(pid);

  if (find_result === null) {
    status = 404;
    content = "Player not found";

    res.status(status).send();
  } else {
    status = 200;
    content = find_result;

    res.status(status).json(content);
  }

  res.locals.status = status;
  res.locals.res_content = content;

  next();
});

router.delete("/:pid", async (req, res, next) => {
  const pid = req.params.pid;
  let status = 404,
    content = "";
  const delete_result = await db.DeletePlayer(pid);
  if (delete_result === true) {
    status = 200;
    content = `Delete success`;

    res.status(status).send();
  } else {
    status = 404;
    content = "Player not found";

    res.status(status).send();
  }

  res.locals.status = status;
  res.locals.res_content = content;

  next();
});

router.get("/", async (req, res, next) => {
  let players = await db.getAllPlayers();
  const query = req.query;
  let status = 200;

  if (Object.keys(query).length !== 0) {
    if (Object.keys(query).includes("is_active")) {
      if (query.is_active !== "*") {
        players = players.filter(
          (player) =>
            player.is_active ===
            PlayerUtils.convertBooleanString(query.is_active)
        );
      }
      status = 200;
    } else {
      status = 422;
      players = [];
    }
  }

  res.locals.status = status;
  res.locals.res_content = players;

  res.status(status).json(players);

  next();
});

router.post("/search", async (req, res, next) => {
  const query = req.body;

  let result = [];

  if (Object.keys(query).length !== 1 || query.q === undefined) {
    res.status(200).send(result);
  } else {
    const players = await db.getAllPlayers();
    const q = query.q.toLowerCase();
    result = players.filter((player) => {
      return player.name.toLowerCase().includes(q);
    });
    res.status(200).send(result);
  }

  res.locals.status = 200;
  res.locals.res_content = result;
  next();
});

router.post("/", async (req, res, next) => {
  const { redirect, ...query } = req.body;

  const validate = PlayerUtils.isCreateQueryValid(query);

  let status = 500,
    content = "";

  if (validate.is_valid === true) {
    try {
      const mid = await db.insertPlayer(PlayerUtils.convertCreateQuery(query));

      // status = 303;
      // content = `Redirect to /player.html`;
      // res.redirect(303, `/player.html`);
      res.status(200).json(await db.getPlayer(mid));
    } catch (err) {
      console.error(err);

      status = 500;
      content = `Server internal error: ${err.message}`;

      res.status(status).send(content);
    }
  } else {
    status = 422;
    content = "Invalid fields: " + validate.invalid_fields.join(",");

    res.status(status).send(content);
  }

  res.locals.status = status;
  res.locals.res_content = content;

  next();
});

router.post("/:pid", async (req, res, next) => {
  if (req.params.pid === "search") next();

  const pid = req.params.pid;
  const query = req.body;
  const validate = PlayerUtils.isUpdateQueryValid(query);

  let status = 404,
    content = "";

  if (validate.is_valid === false) {
    status = 422;
    content = "Invald query";

    res.status(status).send();
  } else {
    const update_res = await db.UpdatePlayer(
      pid,
      PlayerUtils.convertUpdateQuery(query)
    );
    if (update_res.success === true) {
      status = 200;
      content = await db.getPlayer(pid);

      res.status(status).json(content);
    } else {
      status = 404;
      content = "No matched player or no updates made";

      res.status(status).send();
    }
  }

  res.locals.status = status;
  res.locals.res_content = content;

  next();
});

router.post("/:pid/deposit", async (req, res, next) => {
  const pid = req.params.pid;
  const query = req.query;

  let status = 404,
    content = "";

  if (!PlayerUtils.isUpdateCurrencyValid(query)) {
    status = 400;
    content = "Invalid amount";

    res.status(status).send();
  } else {
    const currency_result = await db.UpdatePlayerCurrency(
      pid,
      PlayerUtils.convertUpdateCurrencyQuery(query)
    );

    if (currency_result.found === false) {
      status = 404;
      content = "Player not found";

      res.status(status).send();
    } else if (currency_result.success === false) {
      status = 400;
      content = "Update currency error";

      res.status(status).send();
    } else {
      status = 200;
      content = currency_result.records;

      res.status(status).json(content);
    }
  }

  res.locals.status = status;
  res.locals.res_content = content;

  next();
});

module.exports = router;
