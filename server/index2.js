const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const fetch = require("node-fetch");
const cmb = require("js-combinatorics");
const conn = require("./db/connection");
const querries = require("./db/queries");

const app = express();

app.use(cors());
app.use(morgan("tiny"));

urls = [
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/QB/1/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/RB/1/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/WR/1/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/TE/1/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/K/1/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/DEF/1/1"
];

const projectionsUrls = [
  "https://www.fantasyfootballnerd.com/service/weekly-projections/json/sv3f3je6s88k/QB/1"
];

function genSGLineup(data) {
  // 1 MVP 1.5 * pts(RB, WR, QB, TE, K)
  // 4 flex players(RB, WR, QB, TE, K)"
  // Must be at or under $60,000
  // MVP cant be same as any of the flexs
  const qb = data.QB;
  const rb = data.RB;
  const wr = data.WR;
  const te = data.TE;
  const k = data.K;
  let salary = 0;
  let pts = 0;
  let mvpPts = 0;
  let maxPts = 0;
  let roster = [];

  const atSalaryCap = [];

  const MVPS = qb.concat(rb, wr, te, k);
  const flex = qb.concat(rb, wr, te, k);

  const results = cmb.combination(flex, 5);
  const test = [];

  while ((a = results.next())) test.push(a);

  for (let i = 0; i < test.length; i++) {
    for (let j = 0; j < test[i].length; j++) {
      salary += test[i][j].salary;
    }
    if (salary <= 60000) {
      atSalaryCap.push(test[i]);
      salary = 0;
    } else {
      salary = 0;
    }
  }

  for (let m = 0; m < atSalaryCap.length; m++) {
    for (let n = 1; n < atSalaryCap[n].length; n++) {
      mvpPts = parseFloat(atSalaryCap[m][0].ptscalc) * 1.5;
      pts += parseFloat(atSalaryCap[m][n].ptscalc);
    }
    pts += mvpPts;
    if (maxPts == 0) {
      maxPts = pts;
      roster = atSalaryCap[m];
    } else if (maxPts < pts) {
      maxPts = pts;
      roster = atSalaryCap[m];
    }
    pts = 0;
    mvpPts = 0;
  }

  return roster;
}

function getLineup(qb, rb, wr, te, flex, def) {
  const rbCombos = cmb.combination(rb, 2).toArray();
  const wrCombos = cmb.combination(wr, 3).toArray();

  tempRoster = [];
  let salary = 0;
  let maxPts = 0;
  let pts = 0;
  let test2 = [];
  let count = 0;
  for (let i = 0; i < qb.length; i++) {
    for (let j = 0; j < rbCombos.length; j++) {
      for (let l = 0; l < wrCombos.length; l++) {
        for (let o = 0; o < te.length; o++) {
          for (let p = 0; p < flex.length; p++) {
            for (let q = 0; q < def.length; q++) {
              tempRoster.push(
                qb[i],
                rbCombos[j][0],
                rbCombos[j][1],
                wrCombos[l][0],
                wrCombos[l][1],
                wrCombos[l][2],
                te[o],
                flex[p],
                def[q]
              );

              test2 = tempRoster;
              const flexPlayer = test2[7].id;
              if (
                flexPlayer != test2[1].id &&
                flexPlayer != test2[2].id &&
                flexPlayer != test2[3].id &&
                flexPlayer != test2[4].id &&
                flexPlayer != test2[5].id &&
                flexPlayer != test2[6].id
              ) {
                for (let z = 0; z < test2.length; z++) {
                  salary += test2[z].salary;
                }
                if (salary <= 60000) {
                  for (let n = 0; n < test2.length; n++) {
                    pts += parseFloat(test2[n].ptscalc);
                  }
                  if (maxPts == 0) {
                    maxPts = pts;
                    roster = test2;
                    test2 = [];
                    tempRoster = [];
                  } else if (maxPts < pts) {
                    maxPts = pts;
                    roster = test2;
                    test2 = [];
                    tempRoster = [];
                  }
                  pts = 0;

                  salary = 0;
                } else {
                  test2 = [];
                  tempRoster = [];
                  salary = 0;
                }
              } else {
                test2 = [];
                tempRoster = [];
              }
            }
          }
        }
      }
    }
  }
  return roster;
}

function genLineup(data) {
  const qb = data.QB;
  const rb = data.RB;
  const wr = data.WR;
  const wr2 = data.WR;
  const wr3 = data.WR;
  const te = data.TE;
  const def = data.DEF;

  const flex = rb.concat(wr);

  const lineupResults = getLineup(qb, rb, wr, te, flex, def);

  return lineupResults;
}

function genNBALineup(data) {
  const pgCombos = cmb.combination(data.PG, 2).toArray();
  const sgCombos = cmb.combination(data.SG, 2).toArray();
  const sfCombos = cmb.combination(data.SF, 2).toArray();
  const pfCombos = cmb.combination(data.PF, 2).toArray();
  const c = data.C;

  tempRoster = [];
  let salary = 0;
  let maxPts = 0;
  let pts = 0;
  let test2 = [];
  let count = 0;
  for (let i = 0; i < pgCombos.length; i++) {
    for (let j = 0; j < sgCombos.length; j++) {
      for (let l = 0; l < sfCombos.length; l++) {
        for (let o = 0; o < pfCombos.length; o++) {
          for (let p = 0; p < c.length; p++) {
            tempRoster.push(
              pgCombos[i][0],
              pgCombos[i][1],
              sgCombos[j][0],
              sgCombos[j][1],
              sfCombos[l][0],
              sfCombos[l][1],
              pfCombos[o][0],
              pfCombos[o][1],
              c[p]
            );

            test2 = tempRoster;
            for (let z = 0; z < test2.length; z++) {
              if (test2[z].salary != undefined) {
                salary += test2[z].salary;
              } else {
                console.log(test2);
              }
            }
            if (salary <= 60000) {
              for (let n = 0; n < test2.length; n++) {
                pts += parseFloat(test2[n].projected);
              }
              if (maxPts == 0) {
                maxPts = pts;
                roster = test2;
                test2 = [];
                tempRoster = [];
              } else if (maxPts < pts) {
                maxPts = pts;
                roster = test2;
                test2 = [];
                tempRoster = [];
              }
              pts = 0;

              salary = 0;
            } else {
              test2 = [];
              tempRoster = [];
              salary = 0;
            }
            test2 = [];
            tempRoster = [];
            salary = 0;
          }
        }
      }
    }
  }
  return roster;
}

function genMLBLineup(data) {
  const ofCombos = cmb.combination(data.outField, 3).toArray();
  const pitchers = data.pitchers;
  const c1B = data.c1B;
  const secondBase = data.SecondBase;
  const thirdBase = data.ThirdBase;
  const shortStop = data.ShortStop;
  const util = data.util;

  tempRoster = [];
  let salary = 0;
  let maxPts = 0;
  let pts = 0;
  let test2 = [];
  let count = 0;
  for (let i = 0; i < pitchers.length; i++) {
    for (let j = 0; j < c1B.length; j++) {
      for (let l = 0; l < secondBase.length; l++) {
        for (let o = 0; o < thirdBase.length; o++) {
          for (let p = 0; p < shortStop.length; p++) {
            for (let q = 0; q < ofCombos.length; q++) {
              for (let r = 0; r < util.length; r++) {
                tempRoster.push(
                  pitchers[i],
                  c1B[j],
                  secondBase[l],
                  thirdBase[o],
                  shortStop[p],
                  ofCombos[q][0],
                  ofCombos[q][1],
                  ofCombos[q][2],
                  util[r]
                );

                test2 = tempRoster;
                const utility = test2[8].name;
                if (
                  utility != test2[1].name &&
                  utility != test2[2].name &&
                  utility != test2[3].name &&
                  utility != test2[4].name &&
                  utility != test2[5].name &&
                  utility != test2[6].name &&
                  utility != test2[7].name
                ) {
                  for (let z = 0; z < test2.length; z++) {
                    if (test2[z].salary != undefined) {
                      salary += test2[z].salary;
                    } else {
                      console.log(test2);
                    }
                  }
                  if (salary <= 35000) {
                    for (let n = 0; n < test2.length; n++) {
                      pts += parseFloat(test2[n].projected);
                    }
                    if (maxPts == 0) {
                      maxPts = pts;
                      roster = test2;
                      test2 = [];
                      tempRoster = [];
                    } else if (maxPts < pts) {
                      maxPts = pts;
                      roster = test2;
                      test2 = [];
                      tempRoster = [];
                    }
                    pts = 0;

                    salary = 0;
                  } else {
                    test2 = [];
                    tempRoster = [];
                    salary = 0;
                  }
                } else {
                  test2 = [];
                  tempRoster = [];
                  salary = 0;
                }
                test2 = [];
                tempRoster = [];
                salary = 0;
              }
            }
          }
        }
      }
    }
  }
  return roster;
}

app.get("/", (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const allQuery = "SELECT * FROM FFN";
      const { rows } = await client.query(allQuery);

      res.json({
        rows
      });
    });
  });
});

app.get("/deleteffn", (req, res) => {
  querries.deleteFFN().then(result => {
    res.json({
      result
    });
  });
});

app.get("/ffnprojections", (req, res) => {
  const promisies = projectionsUrls.map(url => fetch(url));
  const playersArr = [];
  Promise.all(promisies).then(results => {
    Promise.all(results.map(res => res.json())).then(players => {
      for (let i = 0; i < players.length; i++) {
        playersArr.push(players[i].Projections);
      }
      querries.insertProjections(playersArr).then(result => {
        res.json({
          result
        });
      });
    });
  });
});

app.get("/ffn", (req, res) => {
  const promisies = urls.map(url => fetch(url));
  const playersArr = [];
  Promise.all(promisies).then(results => {
    Promise.all(results.map(res => res.json())).then(players => {
      for (let i = 0; i < players.length; i++) {
        playersArr.push(players[i].Rankings);
      }
      querries.insert(playersArr).then(result => {
        res.json({
          result
        });
      });
    });
  });
});

app.get("/sgresults", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_sgdata sg on sg.nickname = ffn.name and ffn.position = 'QB' and ptscalc > 5 and sg.status is null order by value";
      const RBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_sgdata sg on sg.nickname = ffn.name and ffn.position = 'RB' and ptscalc > 5 and sg.status is null order by value";
      const WRQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_sgdata sg on sg.nickname = ffn.name and ffn.position = 'WR' and ptscalc > 5 and sg.status is null order by value";
      const TEQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_sgdata sg on sg.nickname = ffn.name and ffn.position = 'TE' and ptscalc > 5 and sg.status is null order by value";
      const KQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_sgdata sg on sg.nickname = ffn.name and ffn.position = 'K' and ptscalc > 5 and sg.status is null order by value";

      const qb = await client.query(QBQuery);
      const rb = await client.query(RBQuery);
      const wr = await client.query(WRQuery);
      const te = await client.query(TEQuery);
      const k = await client.query(KQuery);

      const results = {
        QB: qb.rows,
        RB: rb.rows,
        WR: wr.rows,
        TE: te.rows,
        K: k.rows
      };
      const roster = await genSGLineup(results);
      done();

      res.json(roster);
    });
  });
});

app.get("/frresults", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'QB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const RBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'RB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const WRQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'WR' and ptscalc > 5 and fr.status is null order by value limit 10";
      const TEQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'TE' and ptscalc > 5 and fr.status is null order by value limit 10";
      const DEFQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'DEF' and ptscalc > 5 and fr.status is null order by value limit 10";
      const qb = await client.query(QBQuery);
      const rb = await client.query(RBQuery);
      const wr = await client.query(WRQuery);
      const te = await client.query(TEQuery);
      const def = await client.query(DEFQuery);

      const results = {
        QB: qb.rows,
        RB: rb.rows,
        WR: wr.rows,
        TE: te.rows,
        DEF: def.rows
      };
      // res.json(results);
      const roster = await genLineup(results);
      done();

      res.json(roster);
    });
  });
});

app.get("/frresultspts", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'QB' and ptscalc > 5 and fr.status is null order by ptscalc desc limit 10";
      const RBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'RB' and ptscalc > 5 and fr.status is null order by ptscalc desc limit 20";
      const WRQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'WR' and ptscalc > 5 and fr.status is null order by ptscalc desc limit 30";
      const TEQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'TE' and ptscalc > 5 and fr.status is null order by ptscalc desc limit 10";
      const DEFQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'DEF' and ptscalc > 1 and fr.status is null order by ptscalc desc limit 10";
      const qb = await client.query(QBQuery);
      const rb = await client.query(RBQuery);
      const wr = await client.query(WRQuery);
      const te = await client.query(TEQuery);
      const def = await client.query(DEFQuery);

      const results = {
        QB: qb.rows,
        RB: rb.rows,
        WR: wr.rows,
        TE: te.rows,
        DEF: def.rows
      };
      // res.json(results);
      const roster = await genLineup(results);
      done();

      res.json(roster);
    });
  });
});

app.get("/lgresults", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'QB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const RBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'RB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const WRQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'WR' and ptscalc > 5 and fr.status is null order by value limit 10";
      const TEQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'TE' and ptscalc > 5 and fr.status is null order by value limit 10";
      const DEFQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'DEF' and ptscalc > 1 and fr.status is null order by value limit 10";

      const qb = await client.query(QBQuery);
      const rb = await client.query(RBQuery);
      const wr = await client.query(WRQuery);
      const te = await client.query(TEQuery);
      const def = await client.query(DEFQuery);

      const results = {
        QB: qb.rows,
        RB: rb.rows,
        WR: wr.rows,
        TE: te.rows,
        DEF: def.rows
      };
      const roster = await genLineup(results);

      done();
      res.json(roster);
    });
  });
});

app.get("/egresults", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'QB' and (fr.status in ('Q') or fr.status is null) and ptscalc > 5 and fr.status is null order by value limit 10";
      const RBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'RB' and (fr.status in ('Q') or fr.status is null) and ptscalc > 5 and fr.status is null order by value limit 10";
      const WRQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'WR' and (fr.status in ('Q') or fr.status is null) and ptscalc > 5 order by value limit 10";
      const TEQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'TE' and (fr.status in ('Q') or fr.status is null) and ptscalc > 5 and fr.status is null order by value limit 10";
      const DEFQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'DEF' and ptscalc > 1 and fr.status is null order by value limit 10";
      const qb = await client.query(QBQuery);
      const rb = await client.query(RBQuery);
      const wr = await client.query(WRQuery);
      const te = await client.query(TEQuery);
      const def = await client.query(DEFQuery);

      const results = {
        QB: qb.rows,
        RB: rb.rows,
        WR: wr.rows,
        TE: te.rows,
        DEF: def.rows
      };
      const roster = await genLineup(results);
      done();
      res.json(roster);
    });
  });
});

app.get("/nba", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const pgQuery =
        "select name, salary, position, projected, (salary/projected) as value from nba where position = 'PG' order by value limit 10";
      const sgQuery =
        "select name, salary, position, projected, (salary/projected) as value from nba where position = 'SG' order by value limit 10";
      const sfQuery =
        "select name, salary, position, projected, (salary/projected) as value from nba where position = 'SF' order by value limit 10";
      const pfQuery =
        "select name, salary, position, projected, (salary/projected) as value from nba where position = 'PF' order by value limit 10";
      const cQuery =
        "select name, salary, position, projected, (salary/projected) as value from nba where position = 'C' order by value limit 10";

      const pg = await client.query(pgQuery);
      const sg = await client.query(sgQuery);
      const sf = await client.query(sfQuery);
      const pf = await client.query(pfQuery);
      const c = await client.query(cQuery);

      const results = {
        PG: pg.rows,
        SG: sg.rows,
        SF: sf.rows,
        PF: pf.rows,
        C: c.rows
      };

      const roster = await genNBALineup(results);
      done();
      res.json(roster);
    });
  });
});

app.get("/mlb", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const pQuery =
        "select name, salary, position, projected, (salary/projected) as value from mlb where position = 'P' order by value limit 10";
      const c1BQuery =
        "select name, salary, position, projected, (salary/projected) as value from mlb where position = 'C-1B' and projected > 10 order by value limit 10";
      const secondBaseQuery =
        "select name, salary, position, projected, (salary/projected) as value from mlb where position = '2B' and projected > 8 order by value limit 10";
      const thirdBaseQuery =
        "select name, salary, position, projected, (salary/projected) as value from mlb where position = '3B' and projected > 10 order by value limit 10";
      const shortStopQuery =
        "select name, salary, position, projected, (salary/projected) as value from mlb where position = 'SS' and projected > 8 order by value limit 10";
      const outFieldQuery =
        "select name, salary, position, projected, (salary/projected) as value from mlb where position = 'OF' and projected > 10 order by value limit 15";
      const utilQuery =
        "select name, salary, position, projected, (salary/projected) as value from mlb where position in ('C-1B', '2B', '3B', 'SS', 'OF') order by value limit 20";

      const pitcher = await client.query(pQuery);
      const c1B = await client.query(c1BQuery);
      const secondBase = await client.query(secondBaseQuery);
      const thirdBase = await client.query(thirdBaseQuery);
      const shortStop = await client.query(shortStopQuery);
      const outField = await client.query(outFieldQuery);
      const util = await client.query(utilQuery);

      const results = {
        pitchers: pitcher.rows,
        c1B: c1B.rows,
        SecondBase: secondBase.rows,
        ThirdBase: thirdBase.rows,
        ShortStop: shortStop.rows,
        outField: outField.rows,
        util: util.rows
      };

      const roster = await genMLBLineup(results);
      done();
      res.json(roster);
    });
  });
});

app.listen(5001, () => {
  console.log("listening on port 5001");
});
