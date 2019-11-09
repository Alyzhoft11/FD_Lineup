const conn = require("./connection.js");

const insert = async results => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", err => {
      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          const ptscalc =
            (parseFloat(results[i][j].pprHigh) +
              parseFloat(results[i][j].ppr) +
              parseFloat(results[i][j].pprLow)) /
            3;
          const insertQuery = `INSERT INTO ffn(id, name, position, ptscalc, team, standard, standardlow, standardhigh, ppr, pprlow, pprhigh, injury) VALUES(${results[i][j].playerId}, \'${results[i][j].name}\', \'${results[i][j].position}\', ${ptscalc},\'${results[i][j].team}\', ${results[i][j].standard}, ${results[i][j].standardLow}, ${results[i][j].standardHigh}, ${results[i][j].ppr}, ${results[i][j].pprLow}, ${results[i][j].pprHigh}, \'${results[i][j].injury}\')`;
          client.query(insertQuery, (err, res) => {
            console.log(err, res);
          });
          client.query("COMMIT", (err, res) => {});
        }
      }
    });
  });
};

const insertReceptions = async results => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", err => {
      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          let receptions = results[i][j].receptions;
          let playerId = results[i][j].playerId;
          const insertQuery = `UPDATE ffn set receptions = ${receptions} WHERE id = '${results[i][j].playerId}'`;
          receptions = 0;
          playerId = "";
          client.query(insertQuery, (err, res) => {
            console.log(err, res);
          });
          client.query("COMMIT", (err, res) => {});
        }
      }
    });
  });
};

const deleteFFN = async () => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", err => {
      client.query("DELETE FROM ffn", (err, res) => {
        client.query("COMMIT", (err, res) => {
          console.log(res, err);
          return res;
        });
      });
    });
  });
};

function select() {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", err => {
      const selectQuery =
        "select name, ffn.position, ptscalc, salary, (salary/ptscalc) as value from ffn join fanduel_sgdata sg on sg.nickname = ffn.name and ptscalc > 5 and sg.status is null order by value";
      return callback(client.query(selectQuery));
    });
  });
}

module.exports = {
  insert,
  select,
  insertReceptions,
  deleteFFN
};
