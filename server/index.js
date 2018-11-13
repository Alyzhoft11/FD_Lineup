const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fetch = require('node-fetch');
const querries = require('./db/queries')

const app = express();

app.use(cors());
app.use(morgan('tiny'));

urls = ['https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/QB/10/1', 
        'https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/RB/10/1',
        'https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/WR/10/1',
        'https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/TE/10/1',
        'https://www.fantasyfootballnerd.com/service/weekly-rankings/json/sv3f3je6s88k/DEF/10/1']

app.get('/', (req, res) => {
  res.json({
      message: 'Hello World'
  });
});

app.get('/ffn', (req, res) => {
  const promisies = urls.map(url => fetch(url))
  const playersArr = []
  Promise.all(promisies)
    .then(results => { 
      Promise.all(results.map(res => res.json()))
        .then(players => {
          for (let i = 0; i < players.length; i++) {
            playersArr.push(players[i].Rankings) 
          }
          querries.insert(playersArr)
            .then(result => {
              res.json({
                result
              })
            })
        })
      })
    })

app.listen(5001, () => {
  console.log('listening on port 5000');
});