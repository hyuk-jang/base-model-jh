/**
 * @typedef {Object} dbInfo
 * @property {string} host 접속 경로
 * @property {number=} port 접속 포트
 * @property {string} user 접속 ID
 * @property {string} password 접속 PW
 * @property {string} database 접속 DB
 */

const _ = require('lodash');
const moment = require('moment');
const mysql = require('mysql');
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
    if (_.isObject(whereInfo) && !_.isEmpty(whereInfo)) {
      sql += ` WHERE ${_.map(whereInfo, (value, key) => {
        if (value === null) {
          return `${key} IS NULL`;
        }
        if (Array.isArray(value)) {
          return `${key} IN (${mysql.escape(value)})`;
        }
        return `${key} = ${mysql.escape(value)}`;
      }).join(' AND ')}`;
    }

    return db.single(sql, null, hasViewSql);
  }

  /**
   * SELECT 일반 테이블 1 Row 만 가져옴
   * @param {string} tblName Table 명
   * @param {Object=} whereInfo where 조건 {key: value, key: value, ...}
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  async getTableRow(tblName, whereInfo, hasViewSql) {
    let sql = `SELECT * FROM ${tblName}`;
    if (_.isObject(whereInfo) && !_.isEmpty(whereInfo)) {
      sql += ` WHERE ${_.map(whereInfo, (value, key) => {
        if (value === null) {
          return `${key} IS NULL`;
        }
        if (Array.isArray(value)) {
          return `${key} IN (${mysql.escape(value)})`;
        }
        return `${key} = ${mysql.escape(value)}`;
      }).join(' AND ')}`;
    }

    const packetRows = await db.single(sql, null, hasViewSql);
    if (_.isEmpty(packetRows)) {
      return {};
    }
    return _.head(packetRows);
  }

  /**
   * INSERT 일반 테이블
   * @param {string} tblName Table 명
   * @param {Object} insertInfo Insert 할려고하는 Data Object
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  setTable(tblName, insertInfo, hasViewSql) {
    if (_.isEmpty(insertInfo)) {
      return new Error('object not defined');
    }
    const sql = `INSERT INTO ${tblName} (${Object.keys(insertInfo)}) VALUES ${this.makeInsertValues(
      Object.values(insertInfo),
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
    if (_.isEmpty(insertList)) {
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
    if (_.isEmpty(whereInfo) || _.isEmpty(updateInfo)) {
      return new Error('object not defined');
    }

    let sql = `UPDATE ${tblName} SET ${this.makeUpdateValues(updateInfo)}`;
    if (_.isObject(whereInfo)) {
      sql += ` WHERE ${_.map(whereInfo, (value, key) => {
        if (Array.isArray(value)) {
          return `${key} IN (${mysql.escape(value)})`;
        }
        return `${key} = ${mysql.escape(value)}`;
      }).join(' AND ')}`;
    }
    return db.single(sql, null, false);
  }

  /**
   * createPool 을 이용하여 Multiple Query 수행
   * @param {string} tbName
   * @param {string[]} whereKeyList
   * @param {Object[]} updateList
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  async updateTablesByPool(tblName, whereKeyList, updateList, hasViewSql) {
    if (_.isEmpty(updateList) || _.isEmpty(whereKeyList)) {
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
    if (_.isEmpty(updateList) || _.isEmpty(whereKeyList)) {
      return new Error('updateList or whereKey not defined');
    }
    let sql = '';
    updateList.forEach(updateInfo => {
      sql += `UPDATE ${tblName} SET ${this.makeUpdateValues(updateInfo)}`;
      const whereInfo = _.pick(updateInfo, whereKeyList);
      if (_.isObject(whereInfo)) {
        sql += ` WHERE ${_.map(whereInfo, (value, key) => {
          if (Array.isArray(value)) {
            return `${key} IN (${mysql.escape(value)})`;
          }
          return `${key} = ${mysql.escape(value)}`;
        }).join(' AND ')};`;
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
      returnValue = moment(checkValue).format('YYYY-MM-DD HH:mm:ss');
    } else if (checkValue instanceof moment) {
      /** @type {moment.Moment} */
      const momentValue = checkValue;
      returnValue = momentValue.format('YYYY-MM-DD HH:mm:ss');
    } else if (_.isNull(checkValue)) {
      returnValue = null;
    } else if (_.isUndefined(checkValue)) {
      returnValue = '';
    } else if (_.isNumber(checkValue)) {
      returnValue = checkValue;
    } else {
      returnValue = this.MRF(checkValue);
    }

    return _.isString(returnValue) ? `${mysql.escape(returnValue)}` : returnValue;
  }
}

module.exports = BaseModel;
