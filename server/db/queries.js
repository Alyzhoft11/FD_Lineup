const conn = require('./connection.js');

const insert = async (results) => {
  conn.pool.connect((err, client, done) => {
    client.query('BEGIN', (err) => {
      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          const insertQuery = `INSERT INTO ffn(id, name, position, team, standard, standardlow, standardhigh, ppr, pprlow, pprhigh, injury) VALUES(${results[i][j].playerId}, \'${results[i][j].name}\', \'${results[i][j].position}\',\' ${results[i][j].team}\', ${results[i][j].standard}, ${results[i][j].standardLow}, ${results[i][j].standardHigh}, ${results[i][j].ppr}, ${results[i][j].pprLow}, ${results[i][j].pprHigh}, \'${results[i][j].injury}\')`          
          client.query(insertQuery, (err, res) => {
            console.log(err, res);
          })
          client.query('COMMIT', (err, res) => {
            return res
          })
        }
      }
    })
  })
}

module.exports = {
  insert
}