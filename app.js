const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const util = require("util");

const db = require("./api/models/db");
const playerRouter = require("./api/routes/player.js");
const matchRouter = require("./api/routes/match.js");
const pageRouter = require("./api/routes/pages.js");
const logRouther = require("./api/routes/log.js");

const app = express();
const PORT = 6299;

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set("views", `${__dirname}/views`);
app.set("view engine", "ejs");

// app.use("/", logRouther);
app.use("/api/player", playerRouter);
app.use("/api/match", matchRouter);
app.use("/", pageRouter);

app.get("/ping", (req, res, next) => {
  res.status(204).send();
});

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
