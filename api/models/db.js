const { MongoClient, ObjectId } = require("mongodb");
const PlayerUtils = require("../helpers/utils");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

class PlayerDataAPI {
  constructor() {
    const read_config = this.loadLocalConfig();

    if (read_config === false) {
      process.exit(2);
    }

    this._dbName = this._config.db;
    this._collectionName = "player";

    let queries = [];
    for (const key in this._config.opts) {
      queries.push(`${key}=${this._config.opts[key]}`);
    }

    // let uri = `mongodb://${this._config.host}:${this._config.port}`;
    let uri =
      process.env.mongoSource === "atlas"
        ? process.env.atlas_mongoURI
        : process.env.local_mongoURI;

    // if (queries.length > 0) {
    //   uri += `?${queries.join("&")}`;
    // }
    // // console.log(uri);
    this._client = new MongoClient(uri);
  }

  loadLocalConfig(file = "./config/mongo.json") {
    let is_valid = true;

    let config = {
      host: "localhost",
      port: "27017",
      db: "ee547_hw",
      opts: {
        useUnifiedTopology: true,
      },
    };

    const fields = Object.keys(config);

    if (fs.existsSync(file)) {
      try {
        const tempConfig = JSON.parse(fs.readFileSync(file));
        for (const key in tempConfig) {
          if (fields.includes(key)) {
            config[key] = tempConfig[key];
          } else {
            is_valid = false;
          }
        }
      } catch (err) {
        is_valid = false;
      }
    }

    this._config = config;

    return is_valid;
  }

  async connectDB() {
    try {
      await this._client.connect();
      await this._client.db(this._dbName).command({ ping: 1 });
    } catch (err) {
      throw err;
    }

    this._db = this._client.db(this._dbName);
    this._player = this._db.collection(this._collectionName);
    this._log = this._db.collection("log");
    this._match = this._db.collection("match");
  }

  async insertPlayer(playerInfo) {
    const { insertedId: mid } = await this._player.insertOne(playerInfo);

    if (!mid) {
      throw new Error(`Error insert player -- data:${data}`);
    }
    return mid.toString();
  }

  async getAllPlayers() {
    let data = [];

    try {
      const players = await (
        await this._player.find({}).toArray()
      ).filter((player) => {
        // console.log(player);
        // return player.is_active === true;
        return true;
      });
      for (let player of players) {
        const stats = await this.GetPlayerStats(player._id.toString());
        player = { ...player, ...stats };
        data.push(PlayerUtils.ConvertPlayer2Response(player));
      }
    } catch (err) {
      console.error(err);
      return err;
    }

    PlayerUtils.SortPlayersByName(data);

    // console.log(data);

    return data;
  }

  async getPlayer(pid) {
    if (ObjectId.isValid(pid) === false) {
      return null;
    }

    let player = await this._player.findOne({ _id: new ObjectId(pid) });

    if (player === null) {
      return player;
    } else {
      const stats = await this.GetPlayerStats(pid);
      player = { ...player, ...stats };
      return PlayerUtils.ConvertPlayer2Response(player);
    }
  }

  async UpdatePlayer(pid, info) {
    let res = { success: false };

    if (!ObjectId.isValid(pid)) return res;

    const filter = { _id: new ObjectId(pid) };
    const update = { $set: info };

    const result = await this._player.updateOne(filter, update);

    if (result.matchedCount == 1) {
      res.success = true;
    }

    return res;
  }

  async UpdatePlayerCurrency(pid, info) {
    let res = { found: false, success: false, records: {} };

    if (!ObjectId.isValid(pid)) return res;

    const filter = { _id: new ObjectId(pid) };

    const find_result = await db._player.findOne(filter);

    if (find_result == null) {
      return res;
    }

    res.found = true;

    if (!Object.keys(find_result).includes("balance_usd_cents")) {
      return res;
    }

    res.records.old_balance_usd_cents = find_result.balance_usd_cents;

    const update = {
      $set: {
        balance_usd_cents:
          find_result.balance_usd_cents + info.amount_usd_cents,
      },
    };

    const update_result = await db._player.updateOne(filter, update);

    if (update_result.matchedCount === 1) {
      res.success = true;
      res.records.new_balance_usd_cents =
        find_result.balance_usd_cents + info.amount_usd_cents;
    }

    return res;
  }

  async DeletePlayer(pid) {
    if (ObjectId.isValid(pid) === false) {
      return null;
    }

    const delete_result = await this._player.deleteOne({
      _id: new ObjectId(pid),
    });

    if (delete_result.deletedCount === 1) {
      return true;
    } else {
      return false;
    }
  }

  async FindPlayer(pid) {
    if (ObjectId.isValid(pid) === false) {
      return null;
    }

    let player = await this._player.findOne({ _id: new ObjectId(pid) });

    // if (player === null) {
    //   return player;
    // } else {
    //   return PlayerUtils.ConvertPlayer2Response(player);
    // }

    return player;
  }

  async GetPlayerStats(pid) {
    if ((await this.FindPlayer(pid)) === null) return null;

    const stats = {
      num_join: 0,
      num_won: 0,
      num_dq: 0,
      total_points: 0,
      total_prize_usd_cents: 0,
      efficiency: 0,
      in_active_match: false,
    };

    // Some analysis here

    return stats;
  }

  async GetMatch(mid) {
    if (ObjectId.isValid(mid) === false) {
      return null;
    }

    let match = await this._match.findOne({ _id: new ObjectId(mid) });

    if (match === null) return match;

    const { _id, p1_id, p2_id, winner_id, ...res } = match;
    // console.log(await this.getPlayer(p1_id.toString()).name);
    let response = {
      mid: _id.toString(),
      entry_fee_usd_cents: res.entry_fee_usd_cents,
      p1_id: p1_id.toString(),
      p1_name: (await this.getPlayer(p1_id.toString())).name,
      p1_points: res.p1_points === undefined ? 0 : res.p1_points,
      p2_id: p2_id.toString(),
      p2_name: (await this.getPlayer(p2_id.toString())).name,
      p2_points: res.p2_points === undefined ? 0 : res.p2_points,
      winner_pid: res.winner_id === undefined ? null : res.winner_id.toString(),
      is_dq: res.is_dq === undefined ? false : res.is_dq,
      is_active: PlayerUtils.isMatchActive(match),
      prize_usd_cents: res.prize_usd_cents,
      age: Number(
        ((new Date().getTime() - match.created_at.getTime()) / 1000).toFixed(0)
      ),
      ended_at:
        res.ended_at === undefined || res.ended_at === null
          ? null
          : res.ended_at.toISOString(),
    };

    response.winner_pid = PlayerUtils.isMatchActive(match)
      ? null
      : response.p1_points > res.p2_points
      ? response.p1_id
      : response.p2_id;

    return response;
  }

  async FindMatch(mid) {
    if (ObjectId.isValid(mid) === false) {
      return null;
    }

    let match = await this._match.findOne({ _id: new ObjectId(mid) });

    return match;
  }

  async GetAllMatches(is_active = false) {
    let data = [];
    try {
      const matches = (await this._match.find({}).toArray()).filter((match) => {
        if (is_active === "all") return true;
        return PlayerUtils.isMatchActive(match) === is_active;
      });

      for (let match of matches) {
        const { _id, p1_id, p2_id, winner_id, ...res } = match;
        // console.log(await this.getPlayer(p1_id.toString()).name);
        let response = {
          mid: _id.toString(),
          entry_fee_usd_cents: res.entry_fee_usd_cents,
          p1_id: p1_id.toString(),
          p1_name: (await this.getPlayer(p1_id.toString())).name,
          p1_points: res.p1_points === undefined ? 0 : res.p1_points,
          p2_id: p2_id.toString(),
          p2_name: (await this.getPlayer(p2_id.toString())).name,
          p2_points: res.p2_points === undefined ? 0 : res.p2_points,
          winner_pid:
            res.winner_id === undefined ? null : res.winner_id.toString(),
          is_dq: res.is_dq === undefined ? false : res.is_dq,
          is_active: PlayerUtils.isMatchActive(match),
          prize_usd_cents: res.prize_usd_cents,
          age: Number(
            (
              (new Date().getTime() - match.created_at.getTime()) /
              1000
            ).toFixed(0)
          ),
          ended_at:
            res.ended_at === undefined || res.ended_at === null
              ? null
              : res.ended_at.toISOString(),
        };

        response.winner_pid = PlayerUtils.isMatchActive(match)
          ? null
          : response.p1_points > res.p2_points
          ? response.p1_id
          : response.p2_id;

        data.push(response);
      }
    } catch (err) {
      console.error(err);
      return err;
    }

    data.sort((a, b) => b.prize_usd_cents - a.prize_usd_cents);

    return data;
  }

  async CreateMatch(info) {
    if (!PlayerUtils.isCreateMatchValid(info)) {
      return { succeed: false, code: 400, msg: "bad query" };
    }

    const p1 = await this.FindPlayer(info.p1_id),
      p2 = await this.FindPlayer(info.p2_id);

    if (null === p1 || null === p2) {
      return { succeed: false, code: 404, msg: "player not found" };
    }

    const matches = (await this._match.find({}).toArray()).filter((match) => {
      if (PlayerUtils.isMatchActive(match)) {
        if (
          match.p1_id === p1._id.toString() ||
          match.p2_id === p1._id.toString() ||
          match.p1_id === p2._id.toString() ||
          match.p2_id === p2._id.toString()
        ) {
          return true;
        }
      }
      return false;
    });

    if (matches.length > 0) {
      return { succeed: false, code: 409, msg: "player in active match" };
    }

    if (
      p1.balance_usd_cents < info.entry_fee_usd_cents ||
      p2.balance_usd_cents < info.entry_fee_usd_cents
    ) {
      return { succeed: false, code: 402, msg: "player low balance" };
    }

    const parsedInfo = {
      ...info,
      created_at: new Date(),
      ended_at: null,
      is_dq: false,
      p1_points: 0,
      p2_points: 0,
    };

    try {
      const { insertedId: mid } = await this._match.insertOne(parsedInfo);
      if (mid !== null) {
        this.UpdatePlayerCurrency(info.p1_id, {
          amount_usd_cents: -1 * info.entry_fee_usd_cents,
        });
        this.UpdatePlayerCurrency(info.p2_id, {
          amount_usd_cents: -1 * info.entry_fee_usd_cents,
        });
        return { succeed: true, match: await this.GetMatch(mid.toString()) };
      }
    } catch (err) {
      if (err) {
        return { succeed: false, code: 400, msg: err.message };
      }
    }

    return { succeed: false, code: 400, msg: "unknown error" };
  }

  async UpdatePointsMatch(mid, pid, points) {
    const match = await this.FindMatch(mid);
    const player = await this.FindPlayer(pid);

    if (match === null || player === null) {
      return { succeed: false, code: 404, msg: "match/player not found" };
    }

    if (
      pid !== match.p1_id &&
      pid !== match.p1_id.toString() &&
      pid !== match.p2_id &&
      pid !== match.p2_id.toString()
    ) {
      return { succeed: false, code: 400, msg: "player not in match" };
    } else if (!PlayerUtils.isMatchActive(match)) {
      return { succeed: false, code: 409, msg: "match not active" };
    }

    const filter = { _id: new ObjectId(mid) };
    const update = {
      $set:
        pid === match.p1_id || pid === match.p1_id.toString()
          ? {
              p1_points:
                match.p1_points === undefined
                  ? points
                  : match.p1_points + points,
            }
          : {
              p2_points:
                match.p2_points === undefined
                  ? points
                  : match.p2_points + points,
            },
    };

    const update_result = await this._match.updateOne(filter, update);

    if (update_result.matchedCount === 1) {
      return { succeed: true, match: await this.GetMatch(mid.toString()) };
    }

    return { succeed: false, code: 400, msg: "unknown error" };
  }

  async EndMatch(mid) {
    const match = await this.FindMatch(mid);

    if (match === null) {
      return { succeed: false, code: 404, msg: "match not found" };
    }

    if (!PlayerUtils.isMatchActive(match)) {
      return { succeed: false, code: 409, msg: "match not active" };
    } else if (
      match.p1_points === match.p2_points &&
      (match.is_dq === false || match.is_dq === undefined)
    ) {
      return {
        succeed: false,
        code: 409,
        msg: "match tied with no disqulifications",
      };
    }

    const match_filter = { _id: new ObjectId(mid) };
    const match_update = {
      $set: {
        ended_at: new Date(),
        winner_id:
          match.p1_points > match.p2_points ? match.p1_id : match.p2_id,
      },
    };

    const match_update_result = await this._match.updateOne(
      match_filter,
      match_update
    );

    if (match_update_result.matchedCount !== 1) {
      return { succeed: false, code: 400, msg: "Update match record failure" };
    }

    const winner_pid = (
      match.p1_points > match.p2_points ? match.p1_id : match.p2_id
    ).toString();

    const update_currecy = await this.UpdatePlayerCurrency(winner_pid, {
      amount_usd_cents: match.prize_usd_cents,
    });

    if (update_currecy.found === true && update_currecy.success === true) {
      return { succeed: true, match: await this.GetMatch(mid.toString()) };
    }

    return { succeed: false, code: 400, msg: "unknown error" };
  }

  async DisqualifyMatch(mid, pid) {
    const match = await this.FindMatch(mid);
    const player = await this.FindPlayer(pid);

    if (match === null || player === null) {
      return { succeed: false, code: 404, msg: "match/player not found" };
    }

    if (!PlayerUtils.isMatchActive(match)) {
      return { succeed: false, code: 409, msg: "match not active" };
    } else if (
      pid !== match.p1_id &&
      pid !== match.p1_id.toString() &&
      pid !== match.p2_id &&
      pid !== match.p2_id.toString()
    ) {
      return {
        succeed: false,
        code: 400,
        msg: "player not in the match",
      };
    }

    const match_filter = { _id: new ObjectId(mid) };
    const match_update = {
      $set: {
        is_dq: true,
        ended_at: new Date(),
        winner_id:
          pid === match.p1_id || pid === match.p1_id.toString()
            ? match.p2_id
            : match.p1_id,
      },
    };

    const match_update_result = await this._match.updateOne(
      match_filter,
      match_update
    );

    if (match_update_result.matchedCount !== 1) {
      return { succeed: false, code: 400, msg: "Update match record failure" };
    }

    const winner_pid = (await this.FindMatch(mid)).winner_id.toString();

    const update_currecy = await this.UpdatePlayerCurrency(winner_pid, {
      amount_usd_cents: match.prize_usd_cents,
    });

    if (update_currecy.found === true && update_currecy.success === true) {
      return { succeed: true, match: await this.GetMatch(mid.toString()) };
    }

    return { succeed: false, code: 400, msg: "unknown error" };
  }

  async GetPlayerOverview() {
    const players = await this._player.find({}).toArray();
    const matches = await this._match.find({}).toArray();

    return {
      total_num: players.length,
      active_num: players.filter((player) => player.is_active).length,

      in_match_num: players.filter((player) => {
        for (let match of matches) {
          if (
            match.p1_id.toString() === player._id.toString() ||
            match.p2_id.toString() === player._id.toString()
          ) {
            return true;
          }
        }
      }).length,
      dq_num: players.filter((player) => player.is_dq).length,
    };
  }

  async GetMatchOverview() {
    const players = await this._player.find({}).toArray();
    const matches = await this._match.find({}).toArray();

    return {
      total_num: matches.length,
      ongoing_num: matches.filter((match) => PlayerUtils.isMatchActive(match))
        .length,
      ended_num: matches.filter((match) => !PlayerUtils.isMatchActive(match))
        .length,
      dq_num: matches.filter((match) => match.is_dq).length,
    };
  }

  async GetOtherOverview() {
    const players = await this._player.find({}).toArray();
    const matches = await this._match.find({}).toArray();

    let most_prize = 0,
      most_points = 0,
      most_balance_cents = -1,
      total_balance_cents = 0;

    players.forEach((player) => {
      total_balance_cents += player.balance_usd_cents;
      most_balance_cents = Math.max(
        player.balance_usd_cents,
        most_balance_cents
      );
    });

    matches.forEach((match) => {
      most_prize = Math.max(match.prize_usd_cents, most_prize);

      if (match.p1_points !== null) {
        most_points =
          match.p1_points > most_points ? match.p1_points : most_points;
      }

      if (match.p2_points !== null) {
        most_points =
          match.p2_points > most_points ? match.p2_points : most_points;
      }
    });

    return {
      most_prize: (most_prize / 100).toFixed(2),
      most_points: most_points,
      most_balance: (most_balance_cents / 100).toFixed(2),
      average_balance: (total_balance_cents / players.length / 100).toFixed(2),
    };
  }
}

const db = new PlayerDataAPI();
module.exports = db;
