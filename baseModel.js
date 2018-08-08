/**
 * @typedef {Object} dbInfo
 * @property {string} host 접속 경로
 * @property {number=} port 접속 포트
 * @property {string} user 접속 ID
 * @property {string} password 접속 PW
 * @property {string} database 접속 DB
 */
const _ = require('lodash');
const Promise = require('bluebird');
const db = require('./db');

class BaseModel {
  /**
   * @param {dbInfo} dbInfo
   */
  constructor(dbInfo) {
    this.db = db;

    try {
      db.createPool(dbInfo);
    } catch (error) {
      throw error;
    }
  }

  /**
   *
   * @param {dbInfo} dbInfo mysql Create Pool을 위함
   */
  changePool(dbInfo) {
    db.createPool(dbInfo);
  }

  /**
   * SELECT 일반 테이블
   * @param {string} tblName Table 명
   * @param {Object=} whereInfo where 조건 {key: value, key: value, ...}
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  getTable(tblName, whereInfo, hasViewSql) {
    let sql = `SELECT * FROM ${tblName}`;
    if (typeof whereInfo === 'object') {
      sql += ' WHERE ';
      let index = 0;
      _.forEach(whereInfo, (value, key) => {
        if (index) {
          sql += ' AND ';
        }
        if (typeof value === 'string') {
          value = `'${value}'`;
        }
        sql += Array.isArray(value) ? `${key} IN (${value})` : `${key} = ${value}`;
        index += 1;
      });
    }

    return db.single(sql, null, hasViewSql);
  }

  /**
   * INSERT 일반 테이블
   * @param {string} tblName Table 명
   * @param {Object} insertObj Insert 할려고하는 Data Object
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  setTable(tblName, insertObj, hasViewSql) {
    if (!Object.keys(insertObj).length) {
      return new Error('object not defined');
    }
    const sql = `INSERT INTO ${tblName} (${Object.keys(insertObj)}) VALUES ${this.makeInsertValues(
      Object.values(insertObj),
    )}`;

    return db.single(sql, null, hasViewSql);
  }

  /**
   * Multi INSERT 일반 테이블
   * @param {string} tblName Table 명
   * @param {Object[]} insertList Insert 할려고하는 Data Object List
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  setTables(tblName, insertList, hasViewSql) {
    if (!insertList.length) {
      return new Error('object not defined');
    }
    const sql = `INSERT INTO ${tblName} (${Object.keys(
      insertList[0],
    )}) VALUES ${this.makeMultiInsertValues(insertList)}`;
    return db.single(sql, null, hasViewSql);
  }

  /**
   * UPDATE 일반 테이블
   * @param {string} tblName Table 명
   * @param {Object} whereInfo Where 절
   * @param {Object} updateInfo Update 할려고하는 Data Object
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  updateTable(tblName, whereInfo, updateInfo, hasViewSql) {
    if (!Object.keys(whereInfo).length || !Object.keys(updateInfo).length) {
      return new Error('object not defined');
    }

    let sql = `UPDATE ${tblName} SET ${this.makeUpdateValues(updateInfo)}`;
    if (typeof whereInfo === 'object') {
      sql += ' WHERE ';
      let index = 0;

      _.forEach(whereInfo, (value, key) => {
        if (index) {
          sql += ' AND ';
        }
        if (typeof value === 'string') {
          value = `'${value}'`;
        }
        sql += Array.isArray(value) ? `${key} IN (${value})` : `${key} = ${value}`;
        index += 1;
      });
    }
    return db.single(sql, null, hasViewSql);
  }

  /**
   * createPool 을 이용하여 Multiple Query 수행
   * @param {string} tbName
   * @param {string[]} whereKeyList
   * @param {Object[]} updateList
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  async updateTablesByPool(tblName, whereKeyList, updateList, hasViewSql) {
    if (updateList.length === 0 || whereKeyList.length === 0) {
      return new Error('updateList or whereKey not defined');
    }

    const result = await Promise.map(updateList, updateInfo =>
      this.updateTable(tblName, _.pick(updateInfo, whereKeyList), updateInfo, hasViewSql),
    );
    return result;
  }

  /**
   * createConnection 을 이용하여 Multiple Query 수행
   * @param {string} tbName
   * @param {string[]} whereKeyList
   * @param {Object[]} updateList
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  updateTablesByConnection(tblName, whereKeyList, updateList, hasViewSql) {
    if (updateList.length === 0 || whereKeyList.length === 0) {
      return new Error('updateList or whereKey not defined');
    }
    let sql = '';
    updateList.forEach(updateInfo => {
      sql += `UPDATE ${tblName} SET ${this.makeUpdateValues(updateInfo)}`;
      const whereInfo = _.pick(updateInfo, whereKeyList);
      if (typeof whereInfo === 'object') {
        sql += ' WHERE ';
        let index = 0;
        _.forEach(whereInfo, (value, key) => {
          if (index) {
            sql += ' AND ';
          }
          if (typeof value === 'string') {
            value = `'${value}'`;
          }
          sql += Array.isArray(value) ? `${key} IN (${value})` : `${key} = ${value}`;
          index += 1;
        });
        sql += ';';
      }
    });

    return this.db.multipleQuery(sql, hasViewSql);
  }

  /**
   * Make Replace F
   * @param {string} value SQL
   */
  MRF(value) {
    const strValue = value.toString();
    return strValue.split("'").join("''");
  }

  /**
   * insert values 만들어줌
   * @param {Object} values Object or Array 입력할 값
   */
  makeInsertValues(values) {
    let returnValue = '';
    let arrValue = [];
    if (typeof values !== 'object') {
      throw TypeError('object가 아님');
    }

    arrValue = Array.isArray(values) ? values : Object.values(values);
    returnValue = '(';

    arrValue.forEach((value, index) => {
      if (index !== 0) {
        returnValue += ', ';
      }
      returnValue += this.makeVaildValue(value);
    });

    returnValue += ')';

    return returnValue;
  }

  makeMultiInsertValues(arrObj) {
    let returnValue = '';
    if (!Array.isArray(arrObj)) {
      throw TypeError('Array가 아님');
    }
    arrObj.forEach((obj, index) => {
      returnValue += this.makeInsertValues(obj);
      if (index + 1 < arrObj.length) {
        returnValue += ', ';
      }
    });

    return returnValue;
  }

  /**
   * update 구문 만들어줌
   * @param {Object} valueInfo json
   */
  makeUpdateValues(valueInfo) {
    let returnValue = '';
    if (typeof valueInfo !== 'object' && Array.isArray(valueInfo)) {
      throw TypeError('object가 아님');
    }

    _.forEach(valueInfo, (value, key) => {
      if (returnValue !== '') {
        returnValue += ', ';
      }
      returnValue += `${key} = ${this.makeVaildValue(value)}`;
    });

    return returnValue;
  }

  makeVaildValue(checkValue) {
    let returnValue = null;
    if (checkValue instanceof Date) {
      returnValue = checkValue
        .toISOString()
        .substring(0, 19)
        .replace('T', ' ');
    } else if (checkValue == null) {
      returnValue = null;
    } else if (checkValue === undefined) {
      returnValue = '';
    } else if (typeof checkValue === 'number') {
      returnValue = checkValue;
    } else {
      returnValue = this.MRF(checkValue);
    }

    return typeof returnValue === 'string' ? `'${returnValue}'` : returnValue;
  }
}

module.exports = BaseModel;
