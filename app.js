// External modules and dependencies
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const util = require("util");
const pino = require("pino");

// Internal modules and dependecies
const db = require("./api/models/db");
const playerRouter = require("./api/routes/player.js");
const matchRouter = require("./api/routes/match.js");
const pageRouter = require("./api/routes/pages.js");
const toolRouter = require("./api/routes/tools");
const {
  NotFoundHandler,
  PreLogInfo,
  PostLogInfo,
} = require("./api/helpers/log");

// Express app instance and Port#
const app = express();
const PORT = 6299;

// The very previous logger middleware
app.use(PreLogInfo);

// Static middleware
app.use(express.static("public"));

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Render engine middleware
app.set("views", `${__dirname}/views`);
app.set("view engine", "ejs");

// Routers middlewares
app.use("/api/player", playerRouter);
app.use("/api/match", matchRouter);
app.use("/", pageRouter);
app.use("/", toolRouter);

// Error handeler and logger
// Must be placed at the bottom of the middlewares
app.use(NotFoundHandler);
app.use(PostLogInfo);

// Initiate the server
(async () => {
  console.log("Service is initialized!");
  console.log("Waiting for connecting to MongoDB...");

  try {
    await db.connectDB();
  } catch (err) {
    console.log(err);
    process.exit(5);
  }

  console.log("MongoDB is sucessfully connected!");

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}...`);
  });
})();
