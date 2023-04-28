class PlayerUtils {
  static getIsoTime() {
    const timeStamp = new Date();
    return timeStamp.toISOString().split(".")[0] + "Z";
  }

  static ConvertPlayer2Response(data) {
    let { created_at, _id, fname, lname, pid, handed, ...output } = data;

    output.pid = data._id.toString();

    if (data.lname == undefined || data.lname == "") {
      output.name = data.fname;
    } else {
      output.name = data.fname + " " + data.lname;
    }

    output.handed = this.EnumHanded(data.handed, "response");
    // output.is_active = data.is_active;
    // output.balance_usd_cents = data.balance_usd_cents;
    return output;
  }

  static isfNameValid(fname) {
    return this.isOnlyLetters(fname) && fname.length > 0;
  }

  static islNameValid(lname) {
    return this.isOnlyLetters(lname);
  }

  static isHandedValid(handed) {
    const HandedEnums = ["left", "right", "ambi"];

    return HandedEnums.includes(handed);
  }

  static isBalanceValid(balance) {
    return this.isCurrencyValid(balance) && Number(balance) > 0;
  }

  static isActiveValid(active) {
    // const BooleanStrings = [
    //   "1",
    //   "t",
    //   "true",
    //   "T",
    //   "TRUE",
    //   "0",
    //   "f",
    //   "false",
    //   "F",
    //   "FALSE",
    // ];

    // return BooleanStrings.includes(active);

    return typeof active === "boolean";
  }

  /**
   * Validate the query
   * @param {object} query
   * @returns res fields: is_valid, valid_fields
   */
  static isCreateQueryValid(query) {
    const queryKeys = ["fname", "lname", "handed", "initial_balance_usd_cents"];
    let res = { is_valid: true, invalid_fields: [] };

    if (typeof query !== "object") {
      res.is_valid = false;
      return res;
    }

    if (!Object.keys(query).includes("fname")) {
      res.is_valid = false;
      return res;
    }

    for (const key in query) {
      if (!queryKeys.includes(key)) {
        res.is_valid = false;
        return res;
      }

      if (key === "fname") {
        if (!this.isfNameValid(query[key])) {
          res.invalid_fields.push(key);
          res.is_valid = false;
        }
      } else if (key === "lname") {
        if (!this.islNameValid(query[key])) {
          res.invalid_fields.push(key);
          res.is_valid = false;
        }
      } else if (key === "handed") {
        if (!this.isHandedValid(query[key])) {
          res.invalid_fields.push(key);
          res.is_valid = false;
        }
      } else if (key === "initial_balance_usd_cents") {
        if (!this.isBalanceValid(query[key])) {
          res.invalid_fields.push(key);
          res.is_valid = false;
        }
      }
    }

    return res;
  }

  static convertCreateQuery(query) {
    let player = {
      fname: query.fname,
      is_active: true,
      created_at: new Date(),
      balance_usd_cents: 0,

      num_join: 0,
      num_won: 0,
      num_dq: 0,
      total_points: 0,
      total_prize_usd_cents: 0,
      efficiency: 0,
      in_active_match: null,
    };

    if (query.lname !== undefined) player.lname = query.lname;
    if (query.handed !== undefined)
      player.handed = this.EnumHanded(query.handed, "save");
    if (query.initial_balance_usd_cents !== undefined)
      player.balance_usd_cents = this.Number2Cents(
        Number(query.initial_balance_usd_cents)
      );

    return player;
  }

  /**
   * Validate the query
   * @param {object} query
   * @returns res fields: is_valid, valid_fields
   */
  static isUpdateQueryValid(query) {
    const queryKeys = ["active", "lname"];

    let res = { is_valid: true, invalid_fields: [] };

    if (typeof query !== "object") {
      res.is_valid = false;
      return res;
    }

    /**
     *If empty update query valid??
     */
    // if(0 === Object.keys(query).length){
    //   res.is_valid = false;
    //   return res;
    // }

    for (const key in query) {
      if (!queryKeys.includes(key)) {
        res.is_valid = false;
        return res;
      }

      if (key === "lname") {
        if (!this.islNameValid(query[key])) {
          res.invalid_fields.push(key);
          res.is_valid = false;
        }
      } else if (key === "active") {
        if (!this.isActiveValid(query[key])) {
          res.invalid_fields.push(key);
          res.is_valid = false;
        }
      }
    }

    return res;
  }

  static convertUpdateQuery(query) {
    const TrueStrings = ["1", "t", "true", "T", "TRUE"],
      FalseStrings = ["0", "f", "false", "F", "FALSE"];

    let res = {};

    for (const key in query) {
      if (key === "active") {
        res.is_active = query.active;
      } else {
        res[key] = query[key];
      }
    }

    return res;
  }

  static isUpdateCurrencyValid(query) {
    if (typeof query !== "object") return false;
    if (
      Object.keys(query).length !== 1 ||
      !Object.keys(query).includes("amount_usd_cents")
    )
      return false;

    return this.isBalanceValid(query.amount_usd_cents);
  }

  static convertUpdateCurrencyQuery(query) {
    return {
      amount_usd_cents: this.Number2Cents(Number(query.amount_usd_cents)),
    };
  }

  static isOnlyLetters(input) {
    return /^[A-Za-z]*$/.test(input);
  }

  static convertBooleanString(active) {
    const TrueStrings = ["1", "t", "true", "T", "TRUE"];
    const FalseStrings = ["0", "f", "false", "F", "FALSE"];

    if (TrueStrings.includes(active)) return true;
    if (FalseStrings.includes(active)) return false;

    return false;
  }

  static isCreateMatchValid(query) {
    const fields = ["p1_id", "p2_id", "entry_fee_usd_cents", "prize_usd_cents"];

    for (const field of Object.keys(query)) {
      if (!fields.includes(field)) return false;
    }

    if (
      !Number.isInteger(query.entry_fee_usd_cents) ||
      !Number.isInteger(query.prize_usd_cents)
    )
      return false;

    if (query.entry_fee_usd_cents < 0 || query.prize_usd_cents < 0)
      return false;

    return true;
  }

  static SortPlayersByName(players) {
    players.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }

  static isObjectEmpty(query) {
    return Object.keys(query) === 0;
  }

  static Number2Currency(num) {
    return String(num.toFixed(2));
  }

  static Currency2Number(currency) {
    return Number(currency);
  }

  static Number2Cents(num) {
    return Math.round(num);
  }

  static Cents2Currency(num) {
    return String((num / 100).toFixed(2));
  }

  static EnumHanded(input, option = "save") {
    if (option == "save") {
      switch (input) {
        case "left":
          return "L";
        case "right":
          return "R";
        case "ambi":
          return "A";
        default:
          return undefined;
      }
    } else if (option == "response") {
      switch (input) {
        case "L":
          return "left";
          break;
        case "R":
          return "right";
        case "A":
          return "ambi";
        default:
          return undefined;
      }
    }
  }

  static AddCurrency(c1, c2) {
    return this.Number2Currency(Number(c1) + Number(c2));
  }

  static isCurrencyValid(str) {
    if (typeof str === "number") {
      if (str % 1 === 0) {
        return true;
      } else {
        return false;
      }
    }

    let flag = true;
    if (isNaN(Number(str))) {
      flag = false;
    } else {
      // const digits = str.split(".");
      // if (digits.length == 2 && digits[1].length >= 3) flag = false;
      if (str.includes(".")) flag = false;
    }

    return flag;
  }

  static isMatchActive(match) {
    if (match.ended_at === null || match.ended_at === undefined) return true;
    return false;
  }
}

module.exports = PlayerUtils;
