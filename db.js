'use strict';

const mysql = require('mysql');
const Promise = require('bluebird');
const using = Promise.using;
let pool;

Promise.promisifyAll(require('mysql/lib/Connection').prototype);
Promise.promisifyAll(require('mysql/lib/Pool').prototype);

let config = {
  connectionLimit: 10,
  host: '',
  user: '',
  password: '',
  database: ''
}

pool = mysql.createPool(config);

function getConnection() {
  return pool.getConnectionAsync().disposer(connection => {
    return connection.release();
  });
}

function getTransaction() {
  return pool.getConnectionAsync().then(connection => {
    return connection.beginTransactionAsync().then(() => {
      return connection;
    });
  }).disposer((connection, promise) => {
    let result = promise.isFulfilled() ? connection.commitAsync() : connection.rollbackAsync();
    return result.finally(() => {
      connection.release();
    });
  });
}

module.exports = {
  createPool: (dbInfo = { host, user, password, database, connectionLimit }) => {
    config = dbInfo;
    pool = mysql.createPool(dbInfo);
  },
  // 간편 쿼리
  single(sql, values, hasViewSql) {
    if (hasViewSql) {
      console.dir(sql)
    }
    return using(getConnection(), connection => {
      return connection.queryAsync({
        sql: sql,
        values: values
        // nestTables: true,
        // typeCast: false,
        // timeout: 10000
      });
    });
  },
  // 연달아 쿼리
  query(callback) {
    return using(getConnection(), connection => {
      return callback(connection);
    });
  },
  multipleQuery(sql, hasViewSql){
    if (hasViewSql) {
      console.dir(sql)
    }
    config.multipleStatements = true;
    var connection = mysql.createConnection(config);
    // Promise.promisify(mysql.con)
    return connection.queryAsync({
      sql: sql,
      // values: values
      // nestTables: true,
      // typeCast: false,
      // timeout: 10000
    });
  },
  // 트랜잭션
  trans(callback) {
    return using(getTransaction(), connection => {
      return callback(connection);
    });
  }
};