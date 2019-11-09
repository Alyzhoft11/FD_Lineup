const insertProjections = async results => {
  conn.pool.connect((err, client, done) => {
    client.query("BEGIN", err => {
      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          let totalPts = 0;
          let playerId = "";

          switch (results[i][j].position) {
            case "QB":
              playerId = results[i][j].playerId;
              const passYdsPts = parseFloat(results[i][j].passYds) * 0.04;
              const passTDPts = parseFloat(results[i][j].passTD) * 4;
              const passIntPts = parseFloat(results[i][j].passInt) * 1;
              const rushYdsPts = parseFloat(results[i][j].rushYds) * 0.1;
              const rushTDPts = parseFloat(results[i][j].rushTD) * 6;
              const fumbleLostPts = parseFloat(results[i][j].fumblesLost) * 2;
              totalPts =
                passYdsPts +
                passTDPts +
                rushYdsPts +
                rushTDPts -
                (passIntPts + fumbleLostPts);
              break;

            case "RB":
              playerId = results[i][j].playerId;
              const rbRushYdsPts = parseFloat(results[i][j].rushYds) * 0.1;
              const rbRushTDPts = parseFloat(results[i][j].rushTD) * 6;
              const rbRecYdsPts = parseFloat(results[i][j].recYds) * 0.1;
              const rbRecTDPts = parseFloat(results[i][j].recTD) * 6;
              const rbReceptionPts = parseFloat(results[i][j].receptions) * 0.5;
              const rbFumbleLostPts = parseFloat(results[i][j].fumblesLost) * 2;
              totalPts =
                rbRecYdsPts +
                rbRecTDPts +
                rbRushYdsPts +
                rbReceptionPts +
                rbRushTDPts -
                rbFumbleLostPts;
              break;

            case "WR":
              playerId = results[i][j].playerId;
              const wrRushYdsPts = parseFloat(results[i][j].rushYds) * 0.1;
              const wrRushTDPts = parseFloat(results[i][j].rushTD) * 6;
              const wrRecYdsPts = parseFloat(results[i][j].recYds) * 0.1;
              const wrRecTDPts = parseFloat(results[i][j].recTD) * 6;
              const wrReceptionPts = parseFloat(results[i][j].receptions) * 0.5;
              const wrFumbleLostPts = parseFloat(results[i][j].fumblesLost) * 2;
              totalPts =
                wrRecYdsPts +
                wrRecTDPts +
                wrRushYdsPts +
                wrReceptionPts +
                wrRushTDPts -
                wrFumbleLostPts;
              break;

            case "TE":
              playerId = results[i][j].playerId;
              const teRushYdsPts = parseFloat(results[i][j].rushYds) * 0.1;
              const teRushTDPts = parseFloat(results[i][j].rushTD) * 6;
              const teRecYdsPts = parseFloat(results[i][j].recYds) * 0.1;
              const teRecTDPts = parseFloat(results[i][j].recTD) * 6;
              const teReceptionPts = parseFloat(results[i][j].receptions) * 0.5;
              const teFumbleLostPts = parseFloat(results[i][j].fumblesLost) * 2;
              totalPts =
                teRecYdsPts +
                teRecTDPts +
                teRushYdsPts +
                teReceptionPts +
                teRushTDPts -
                teFumbleLostPts;
              break;

            case "DEF":
              playerId = results[i][j].playerId;
              const defIntPts = parseFloat(results[i][j].defInt) * 2;
              const defFRPts = parseFloat(results[i][j].defFR) * 2;
              const defSackPts = parseFloat(results[i][j].defSack) * 1;
              const defTDPts = parseFloat(results[i][j].defTD) * 6;
              const defSaftyPts = parseFloat(results[i][j].defSafety) * 2;
              const defPAPts = parseFloat(results[i][j].defPA);

              switch (true) {
                case defPAPts == 0:
                  pts = 10;
                  break;

                case defPAPts <= 6:
                  pts = 7;
                  break;

                case defPAPts <= 13:
                  pts = 4;
                  break;

                case defPAPts <= 20:
                  pts = 1;
                  break;

                case defPAPts <= 27:
                  pts = 0;
                  break;

                case defPAPts <= 34:
                  pts = -1;
                  break;

                case defPAPts >= 35:
                  pts = -4;
                  break;
              }

              totalPts =
                defIntPts +
                defFRPts +
                defSackPts +
                defTDPts +
                defSaftyPts +
                pts;
              break;
          }

          const insertQuery = `UPDATE ffn set ptscalc = ${totalPts} WHERE id = '${playerId}'`;

          totalPts = 0;
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
