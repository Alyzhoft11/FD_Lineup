const { Pool ,Client} = require('pg');

const client = new Client({
  user: 'Alex',
  host: 'localhost',
  database: 'test',
  password: 'Al475500',
  port: 5432
})

const pool = new Pool({
  user: 'Alex',
  host: 'localhost',
  database: 'test',
  password: 'Al475500',
  port: 5432
})

module.exports = {
  client,
  pool
}