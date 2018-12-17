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
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/QB/15/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/RB/15/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/WR/15/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/TE/15/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/K/15/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/DEF/15/1"
];

function genSGLineup(data) {
  // 1 MVP 1.5 * pts(RB, WR, QB, TE, K)
  // 4 flex players(RB, WR, QB, TE, K)
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

  const flex = rb.concat(wr, te);

  const lineupResults = getLineup(qb, rb, wr, te, flex, def);

  return lineupResults;
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
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'DEF' and ptscalc > 1 and fr.status is null order by value limit 10";
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
      const lgResultsQuery = "SELECT * from lgresults";

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

      const lgresults = await client.query(lgResultsQuery);

      if (lgresults.rowCount == 0) {
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

        for (let i = 0; i < roster.length; i++) {
          const insertLGResults = `INSERT INTO lgresults(id, name, position, ptscalc, salary, value) VALUES(${
            roster[i].id
          }, \'${roster[i].name}\', \'${roster[i].position}\', ${
            roster[i].ptscalc
          }, ${roster[i].salary}, ${roster[i].value}) `;

          client.query(insertLGResults, (err, res) => {
            console.log(err, res);
          });
          client.query("COMMIT", (err, res) => {});
        }
        done();
        res.json(roster);
      } else {
        res.json(lgresults.rows);
      }
    });
  });
});

app.get("/egresults", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'QB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const RBQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'RB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const WRQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'WR' and ptscalc > 5 and fr.status is null order by value limit 10";
      const TEQuery =
        "select name, ffn.id, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'TE' and ptscalc > 5 and fr.status is null order by value limit 10";
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

app.listen(5001, () => {
  console.log("listening on port 5001");
});
