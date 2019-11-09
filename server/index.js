const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const fetch = require("node-fetch");
const cmb = require("js-combinatorics");
const conn = require("./db/connection");
const querries = require("./db/queries");
const { spawn, Thread, Worker } = require("threads");

const app = express();

app.use(cors());
app.use(morgan("tiny"));

urls = [
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/QB/8/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/RB/8/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/WR/8/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/TE/8/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/K/8/1",
  "https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/DEF/8/1"
];

const projectionsUrls = [
  "https://www.fantasyfootballnerd.com/service/weekly-projections/json/sv3f3je6s88k/QB/8",
  "https://www.fantasyfootballnerd.com/service/weekly-projections/json/sv3f3je6s88k/RB/8",
  "https://www.fantasyfootballnerd.com/service/weekly-projections/json/sv3f3je6s88k/WR/8",
  "https://www.fantasyfootballnerd.com/service/weekly-projections/json/sv3f3je6s88k/TE/8",
  "https://www.fantasyfootballnerd.com/service/weekly-projections/json/sv3f3je6s88k/DEF/8"
];

async function testFunction(qb, rb, wr, te, flex, def) {
  const rbCombos = cmb.combination(rb, 2).toArray();
  const wrCombos = cmb.combination(wr, 3).toArray();

  tempRoster = [];
  let salary = 0;
  let maxPts = 0;
  let pts = 0;
  let test2 = [];
  let rosters = [];
  let found = false;
  let found2 = false;
  let limit = 10;
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
                def[q],
                [
                  qb[i].name,
                  rbCombos[j][0].name,
                  rbCombos[j][1].name,
                  wrCombos[l][0].name,
                  wrCombos[l][1].name,
                  wrCombos[l][2].name,
                  te[o].name,
                  flex[p].name
                ].sort()
              );

              tempRoster[9].push(def[q].name);

              const t = await spawn(new Worker("./worker.js"));
              test2 = await t(tempRoster);

              tempRoster = [];

              if (test2 != null) {
                if (maxPts == 0) {
                  maxPts = pts;
                  rosters.push(test2);
                  test2 = [];
                  tempRoster = [];
                } else {
                  if (rosters.length <= limit) {
                    for (let a = 0; a < rosters.length; a++) {
                      if (rosters[a][9].toString() === test2[9].toString()) {
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      rosters.push(test2);
                    }
                  } else {
                    for (let a = 0; a < rosters.length; a++) {
                      if (rosters[a][9].toString() == test2[9].toString()) {
                        found2 = true;
                        break;
                      }
                    }
                    if (!found2) {
                      rosters.sort(function(a, b) {
                        return a[10] > b[10] ? -1 : 1;
                      });
                      if (test2[10] > rosters[0][10]) {
                        rosters.pop();
                        rosters.push(test2);
                        found2 = false;
                        pts = 0;
                        test2 = [];
                        tempRoster = [];
                        break;
                      } else {
                        found2 = false;
                        pts = 0;
                        test2 = [];
                        tempRoster = [];
                        break;
                      }
                    }
                  }
                  // maxPts = pts;
                  roster = test2;
                  test2 = [];
                  tempRoster = [];
                }
                // } else if (maxPts < pts) {
                //   maxPts = pts;
                //   roster = test2;
                //   test2 = [];
                //   tempRoster = [];
                // }
                pts = 0;
                found = false;
                found2 = false;
                salary = 0;
              }
            }
          }
        }
      }
    }
  }
  return rosters;
}

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
  let rosters = [];
  let found = false;
  let found2 = false;
  let limit = 10;
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
                def[q],
                [
                  qb[i].name,
                  rbCombos[j][0].name,
                  rbCombos[j][1].name,
                  wrCombos[l][0].name,
                  wrCombos[l][1].name,
                  wrCombos[l][2].name,
                  te[o].name,
                  flex[p].name
                ].sort()
              );

              tempRoster[9].push(def[q].name);

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
                for (let z = 0; z < test2.length - 1; z++) {
                  salary += test2[z].salary;
                }
                if (salary <= 60000) {
                  for (let n = 0; n < test2.length - 1; n++) {
                    pts += parseFloat(test2[n].points);
                  }
                  test2.push(pts);
                  if (maxPts == 0) {
                    maxPts = pts;
                    rosters.push(test2);
                    test2 = [];
                    tempRoster = [];
                  } else {
                    if (rosters.length <= limit) {
                      for (let a = 0; a < rosters.length; a++) {
                        if (rosters[a][9].toString() === test2[9].toString()) {
                          found = true;
                          break;
                        }
                      }
                      if (!found) {
                        rosters.push(test2);
                      }
                    } else {
                      for (let a = 0; a < rosters.length; a++) {
                        if (rosters[a][9].toString() == test2[9].toString()) {
                          found2 = true;
                          break;
                        }
                      }
                      if (!found2) {
                        rosters.sort(function(a, b) {
                          return a[10] > b[10] ? -1 : 1;
                        });
                        if (test2[10] > rosters[0][10]) {
                          rosters.pop();
                          rosters.push(test2);
                          found2 = false;
                          pts = 0;
                          test2 = [];
                          tempRoster = [];
                          break;
                        } else {
                          found2 = false;
                          pts = 0;
                          test2 = [];
                          tempRoster = [];
                          break;
                        }
                      }
                    }
                    // maxPts = pts;
                    roster = test2;
                    test2 = [];
                    tempRoster = [];
                  }
                  // } else if (maxPts < pts) {
                  //   maxPts = pts;
                  //   roster = test2;
                  //   test2 = [];
                  //   tempRoster = [];
                  // }
                  pts = 0;
                  found = false;
                  found2 = false;
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
  return rosters;
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

  // const lineupResults = getLineup(qb, rb, wr, te, flex, def);

  const lineupResults = testFunction(qb, rb, wr, te, flex, def);

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
  const limit = 10;
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

app.get("/ffnprojections", (req, res) => {
  const promisies = projectionsUrls.map(url => fetch(url));
  const playersArr = [];
  Promise.all(promisies).then(results => {
    Promise.all(results.map(res => res.json())).then(players => {
      for (let i = 0; i < players.length; i++) {
        playersArr.push(players[i].Projections);
      }
      querries.insertReceptions(playersArr).then(result => {
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
        "select name, fr.id, ffn.position, ffn.receptions, ptscalc, ptscalc as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'QB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const RBQuery =
        "select name, fr.id, ffn.position, ffn.receptions, ptscalc, ptscalc as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'RB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const WRQuery =
        "select name, fr.id, ffn.position, ffn.receptions, ptscalc, ptscalc as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'WR' and ptscalc > 5 and fr.status is null order by value limit 10";
      const TEQuery =
        "select name, fr.id, ffn.position, ffn.receptions, ptscalc, ptscalc as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'TE' and ptscalc > 5 and fr.status is null order by value limit 10";
      const DEFQuery =
        "select name, fr.id, ffn.position, ffn.receptions, ptscalc, ptscalc as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_frdata fr on fr.nickname = ffn.name and ffn.position = 'DEF' and ptscalc > 0 and fr.status is null order by value limit 10";
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
      const rosters = await genLineup(results);

      const createCsvWriter = require("csv-writer").createObjectCsvWriter;
      const csvWriter = createCsvWriter({
        path: "C:\\Users\\Alex PC\\Desktop\\Fanduel\\FullRoster.csv",
        header: [
          { id: "qb", title: "QB" },
          { id: "rb1", title: "RB1" },
          { id: "rb2", title: "RB2" },
          { id: "wr1", title: "WR1" },
          { id: "wr2", title: "WR2" },
          { id: "wr3", title: "WR3" },
          { id: "te", title: "TE" },
          { id: "flex", title: "FLEX" },
          { id: "def", title: "DEF" }
        ]
      });

      rostersArray = [];
      tempArray = {};
      rosters.forEach(e => {
        for (let index = 0; index < e.length - 2; index++) {
          tempArray = {
            qb: e[0].id.toString(),
            rb1: e[1].id.toString(),
            rb2: e[2].id.toString(),
            wr1: e[3].id.toString(),
            wr2: e[4].id.toString(),
            wr3: e[5].id.toString(),
            te: e[6].id.toString(),
            flex: e[7].id.toString(),
            def: e[8].id.toString()
          };
          break;
        }
        rostersArray.push(tempArray);
        tempArray = {};
      });

      csvWriter
        .writeRecords(rostersArray)
        .then(() => console.log("The CSV file was written successfully"));

      done();

      res.json(rosters);
    });
  });
});

app.get("/workertest", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select fd.name, fd2.id, fd.projection*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(fd.projection*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'QB' and fd2.status is null order by value limit 10";
      const RBQuery =
        "select fd.name, fd2.id, fd.projection*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(fd.projection*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'RB' and fd2.status is null order by value limit 10";
      const WRQuery =
        "select fd.name, fd2.id, fd.projection*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(fd.projection*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'WR' and fd2.status is null order by value limit 10";
      const TEQuery =
        "select fd.name, fd2.id, fd.projection*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(fd.projection*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'TE' and fd2.status is null order by value limit 10";
      const DEFQuery =
        "select name, fd2.id, projection as points, fd2.salary/projection as value, projection, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname where projection > 5 and percent_owned >= 0.1 and pos = 'DST' order by value limit 10";
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
      const rosters = await genLineup(results);

      const createCsvWriter = require("csv-writer").createObjectCsvWriter;
      const csvWriter = createCsvWriter({
        path: "C:\\Users\\Alex PC\\Desktop\\Fanduel\\FullRoster.csv",
        header: [
          { id: "qb", title: "QB" },
          { id: "rb1", title: "RB1" },
          { id: "rb2", title: "RB2" },
          { id: "wr1", title: "WR1" },
          { id: "wr2", title: "WR2" },
          { id: "wr3", title: "WR3" },
          { id: "te", title: "TE" },
          { id: "flex", title: "FLEX" },
          { id: "def", title: "DEF" }
        ]
      });

      rostersArray = [];
      tempArray = {};
      rosters.forEach(e => {
        for (let index = 0; index < e.length - 2; index++) {
          tempArray = {
            qb: e[0].id.toString(),
            rb1: e[1].id.toString(),
            rb2: e[2].id.toString(),
            wr1: e[3].id.toString(),
            wr2: e[4].id.toString(),
            wr3: e[5].id.toString(),
            te: e[6].id.toString(),
            flex: e[7].id.toString(),
            def: e[8].id.toString()
          };
          break;
        }
        rostersArray.push(tempArray);
        tempArray = {};
      });

      csvWriter
        .writeRecords(rostersArray)
        .then(() => console.log("The CSV file was written successfully"));

      done();

      res.json(rosters);
    });
  });
});

app.get("/fantasydata", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select fd.name, fd2.id, fd.projection*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(fd.projection*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'QB' and fd2.status is null order by value limit 10";
      const RBQuery =
        "select fd.name, fd2.id, fd.projection*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(fd.projection*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'RB' and fd2.status is null order by value limit 10";
      const WRQuery =
        "select fd.name, fd2.id, fd.projection*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(fd.projection*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'WR' and fd2.status is null order by value limit 10";
      const TEQuery =
        "select fd.name, fd2.id, fd.projection*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(fd.projection*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'TE' and fd2.status is null order by value limit 10";
      const DEFQuery =
        "select name, fd2.id, projection as points, fd2.salary/projection as value, projection, percent_owned, fd2.salary from fantasy_data fd join fanduel_frdata fd2 on fd.name = fd2.nickname where projection > 5 and percent_owned >= 0.1 and pos = 'DST' order by value limit 10";
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
      const rosters = await genLineup(results);

      const createCsvWriter = require("csv-writer").createObjectCsvWriter;
      const csvWriter = createCsvWriter({
        path: "C:\\Users\\Alex PC\\Desktop\\Fanduel\\FullRoster.csv",
        header: [
          { id: "qb", title: "QB" },
          { id: "rb1", title: "RB1" },
          { id: "rb2", title: "RB2" },
          { id: "wr1", title: "WR1" },
          { id: "wr2", title: "WR2" },
          { id: "wr3", title: "WR3" },
          { id: "te", title: "TE" },
          { id: "flex", title: "FLEX" },
          { id: "def", title: "DEF" }
        ]
      });

      rostersArray = [];
      tempArray = {};
      rosters.forEach(e => {
        for (let index = 0; index < e.length - 2; index++) {
          tempArray = {
            qb: e[0].id.toString(),
            rb1: e[1].id.toString(),
            rb2: e[2].id.toString(),
            wr1: e[3].id.toString(),
            wr2: e[4].id.toString(),
            wr3: e[5].id.toString(),
            te: e[6].id.toString(),
            flex: e[7].id.toString(),
            def: e[8].id.toString()
          };
          break;
        }
        rostersArray.push(tempArray);
        tempArray = {};
      });

      csvWriter
        .writeRecords(rostersArray)
        .then(() => console.log("The CSV file was written successfully"));

      done();

      res.json(rosters);
    });
  });
});

app.get("/fantasydataeg", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select fd.name, fd2.id, ptscalc*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(ptscalc*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_earlydata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'QB' and fd2.status is null order by value limit 10";
      const RBQuery =
        "select fd.name, fd2.id, ptscalc*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(ptscalc*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_earlydata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'RB' and fd2.status is null order by value limit 10";
      const WRQuery =
        "select fd.name, fd2.id, ptscalc*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(ptscalc*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_earlydata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'WR' and fd2.status is null order by value limit 10";
      const TEQuery =
        "select fd.name, fd2.id, ptscalc*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(ptscalc*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_earlydata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'TE' and fd2.status is null order by value limit 10";
      const DEFQuery =
        "select name, fd2.id, projection as points, fd2.salary/projection as value, projection, percent_owned, fd2.salary from fantasy_data fd join fanduel_earlydata fd2 on fd.name = fd2.nickname where projection > 5 and percent_owned >= 0.1 and pos = 'DST' order by value limit 10";
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
      const rosters = await genLineup(results);

      const createCsvWriter = require("csv-writer").createObjectCsvWriter;
      const csvWriter = createCsvWriter({
        path: "C:\\Users\\Alex PC\\Desktop\\Fanduel\\EGRoster.csv",
        header: [
          { id: "qb", title: "QB" },
          { id: "rb1", title: "RB1" },
          { id: "rb2", title: "RB2" },
          { id: "wr1", title: "WR1" },
          { id: "wr2", title: "WR2" },
          { id: "wr3", title: "WR3" },
          { id: "te", title: "TE" },
          { id: "flex", title: "FLEX" },
          { id: "def", title: "DEF" }
        ]
      });

      rostersArray = [];
      tempArray = {};
      rosters.forEach(e => {
        for (let index = 0; index < e.length - 2; index++) {
          tempArray = {
            qb: e[0].id.toString(),
            rb1: e[1].id.toString(),
            rb2: e[2].id.toString(),
            wr1: e[3].id.toString(),
            wr2: e[4].id.toString(),
            wr3: e[5].id.toString(),
            te: e[6].id.toString(),
            flex: e[7].id.toString(),
            def: e[8].id.toString()
          };
          break;
        }
        rostersArray.push(tempArray);
        tempArray = {};
      });

      csvWriter
        .writeRecords(rostersArray)
        .then(() => console.log("The CSV file was written successfully"));

      done();

      res.json(rosters);
    });
  });
});

app.get("/fantasydatalg", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select fd.name, fd2.id, ptscalc*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(ptscalc*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_lgdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'QB' and fd2.status is null order by value limit 10";
      const RBQuery =
        "select fd.name, fd2.id, ptscalc*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(ptscalc*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_lgdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'RB' and fd2.status is null order by value limit 10";
      const WRQuery =
        "select fd.name, fd2.id, ptscalc*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(ptscalc*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_lgdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'WR' and fd2.status is null order by value limit 10";
      const TEQuery =
        "select fd.name, fd2.id, ptscalc*(1/(1+(percent_owned)/100)^2) as points, fd2.salary/(ptscalc*(1/(1+(percent_owned)/100)^2) ) as value, opp_pos_rank, ptscalc, percent_owned, fd2.salary from fantasy_data fd join fanduel_lgdata fd2 on fd.name = fd2.nickname join ffn ff on ff.name = fd2.nickname  where ptscalc > 5 and percent_owned >= 0.1 and pos = 'TE' and fd2.status is null order by value limit 10";
      const DEFQuery =
        "select name, fd2.id, projection as points, fd2.salary/projection as value, projection, percent_owned, fd2.salary from fantasy_data fd join fanduel_lgdata fd2 on fd.name = fd2.nickname where projection > 5 and percent_owned >= 0.1 and pos = 'DST' order by value limit 10";
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
      const rosters = await genLineup(results);

      const createCsvWriter = require("csv-writer").createObjectCsvWriter;
      const csvWriter = createCsvWriter({
        path: "C:\\Users\\Alex PC\\Desktop\\Fanduel\\LGRoster.csv",
        header: [
          { id: "qb", title: "QB" },
          { id: "rb1", title: "RB1" },
          { id: "rb2", title: "RB2" },
          { id: "wr1", title: "WR1" },
          { id: "wr2", title: "WR2" },
          { id: "wr3", title: "WR3" },
          { id: "te", title: "TE" },
          { id: "flex", title: "FLEX" },
          { id: "def", title: "DEF" }
        ]
      });

      rostersArray = [];
      tempArray = {};
      rosters.forEach(e => {
        for (let index = 0; index < e.length - 2; index++) {
          tempArray = {
            qb: e[0].id.toString(),
            rb1: e[1].id.toString(),
            rb2: e[2].id.toString(),
            wr1: e[3].id.toString(),
            wr2: e[4].id.toString(),
            wr3: e[5].id.toString(),
            te: e[6].id.toString(),
            flex: e[7].id.toString(),
            def: e[8].id.toString()
          };
          break;
        }
        rostersArray.push(tempArray);
        tempArray = {};
      });

      csvWriter
        .writeRecords(rostersArray)
        .then(() => console.log("The CSV file was written successfully"));

      done();

      res.json(rosters);
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
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'QB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const RBQuery =
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'RB' and ptscalc > 5 and fr.status is null order by value limit 10";
      const WRQuery =
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'WR' and ptscalc > 5 and fr.status is null order by value limit 10";
      const TEQuery =
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'TE' and ptscalc > 5 and fr.status is null order by value limit 10";
      const DEFQuery =
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_lgdata fr on fr.nickname = ffn.name and ffn.position = 'DEF' and ptscalc > 1 and fr.status is null order by value limit 10";

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
      const rosters = await genLineup(results);

      const createCsvWriter = require("csv-writer").createObjectCsvWriter;
      const csvWriter = createCsvWriter({
        path: "C:\\Users\\Alex PC\\Desktop\\Fanduel\\LGRoster.csv",
        header: [
          { id: "qb", title: "QB" },
          { id: "rb1", title: "RB1" },
          { id: "rb2", title: "RB2" },
          { id: "wr1", title: "WR1" },
          { id: "wr2", title: "WR2" },
          { id: "wr3", title: "WR3" },
          { id: "te", title: "TE" },
          { id: "flex", title: "FLEX" },
          { id: "def", title: "DEF" }
        ]
      });

      rostersArray = [];
      tempArray = {};
      rosters.forEach(e => {
        for (let index = 0; index < e.length - 2; index++) {
          tempArray = {
            qb: e[0].id.toString(),
            rb1: e[1].id.toString(),
            rb2: e[2].id.toString(),
            wr1: e[3].id.toString(),
            wr2: e[4].id.toString(),
            wr3: e[5].id.toString(),
            te: e[6].id.toString(),
            flex: e[7].id.toString(),
            def: e[8].id.toString()
          };
          break;
        }
        rostersArray.push(tempArray);
        tempArray = {};
      });

      csvWriter
        .writeRecords(rostersArray)
        .then(() => console.log("The CSV file was written successfully"));
      done();

      res.json(rosters);
    });
  });
});

app.get("/egresults", async (req, res) => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", async err => {
      const QBQuery =
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'QB' and (fr.status in ('Q') or fr.status is null) and ptscalc > 5 and fr.status is null order by value limit 10";
      const RBQuery =
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'RB' and (fr.status in ('Q') or fr.status is null) and ptscalc > 5 and fr.status is null order by value limit 10";
      const WRQuery =
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'WR' and (fr.status in ('Q') or fr.status is null) and ptscalc > 5 order by value limit 10";
      const TEQuery =
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'TE' and (fr.status in ('Q') or fr.status is null) and ptscalc > 5 and fr.status is null order by value limit 10";
      const DEFQuery =
        "select name, fr.id, ffn.position, ptscalc, (ptscalc - ffn.receptions) + (ffn.receptions * .5) as points, salary, (salary/(ptscalc - ffn.receptions) + (ffn.receptions * .5)) as value from ffn join fanduel_earlydata fr on fr.nickname = ffn.name and ffn.position = 'DEF' and ptscalc > 1 and fr.status is null order by value limit 10";
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
      const rosters = await genLineup(results);

      const createCsvWriter = require("csv-writer").createObjectCsvWriter;
      const csvWriter = createCsvWriter({
        path: "C:\\Users\\Alex PC\\Desktop\\Fanduel\\EGRoster.csv",
        header: [
          { id: "qb", title: "QB" },
          { id: "rb1", title: "RB1" },
          { id: "rb2", title: "RB2" },
          { id: "wr1", title: "WR1" },
          { id: "wr2", title: "WR2" },
          { id: "wr3", title: "WR3" },
          { id: "te", title: "TE" },
          { id: "flex", title: "FLEX" },
          { id: "def", title: "DEF" }
        ]
      });

      rostersArray = [];
      tempArray = {};
      rosters.forEach(e => {
        for (let index = 0; index < e.length - 2; index++) {
          tempArray = {
            qb: e[0].id.toString(),
            rb1: e[1].id.toString(),
            rb2: e[2].id.toString(),
            wr1: e[3].id.toString(),
            wr2: e[4].id.toString(),
            wr3: e[5].id.toString(),
            te: e[6].id.toString(),
            flex: e[7].id.toString(),
            def: e[8].id.toString()
          };
          break;
        }
        rostersArray.push(tempArray);
        tempArray = {};
      });

      csvWriter
        .writeRecords(rostersArray)
        .then(() => console.log("The CSV file was written successfully"));
      done();

      res.json(rosters);
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
