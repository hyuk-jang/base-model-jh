
const BM = require('./baseModel');
const db = require('./db');
const TempStorage = require('./TempStorage');
module.exports = {
  BM,
  db,
  TempStorage
};

// const BM = require('./baseModel');

// const bm = new BM({
//   host: process.env.SALTERN_HOST ? process.env.SALTERN_HOST : 'localhost',
//   user: process.env.SALTERN_USER ? process.env.SALTERN_USER : 'root',
//   password: process.env.SALTERN_PW ? process.env.SALTERN_PW : 'root',
//   database: process.env.SALTERN_DB ? process.env.SALTERN_DB : "saltpond_controller"
// })

// bm.getTable('inverter')
// .then(r => {
//   console.log(r);
// })




