/**
 * @typedef {Object} dbInfo
 * @property {string} host 접속 경로
 * @property {string} user 접속 ID
 * @property {string} password 접속 PW
 * @property {string} database 접속 DB
 */

const db = require('./db');
const Promise = require('bluebird');

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
   * @param {string} fieldName Table Field 명
   * @param {string} attribute fieldName 에 매칭되는 Attribute
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  getTable(tblName, fieldName, attribute, hasViewSql) {
    let sql = `SELECT * FROM ${tblName}`;
    if (fieldName !== '' && fieldName !== undefined) {
      if(Array.isArray(attribute)){
        sql += ` WHERE ${fieldName} IN (${attribute});`;
      } else {
        sql += ` WHERE ${fieldName} = '${attribute}';`;
      }
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
    if(!Object.keys(insertObj).length){
      return new Error('object not defined');
    }
    let sql = `INSERT INTO ${tblName} (${Object.keys(insertObj)}) VALUES ${this.makeInsertValues(Object.values(insertObj))}`;

    return db.single(sql, null, hasViewSql);
  }
  /**
   * Multi INSERT 일반 테이블
   * @param {string} tblName Table 명
   * @param {Object[]} insertList Insert 할려고하는 Data Object List
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  setTables(tblName, insertList, hasViewSql) {
    if(!insertList.length){
      return new Error('object not defined');
    }
    let sql = `INSERT INTO ${tblName} (${Object.keys(insertList[0])}) VALUES ${this.makeMultiInsertValues(insertList)}`;
    return db.single(sql, null, hasViewSql);
  }

  /**
   * UPDATE 일반 테이블 
   * @param {string} tblName Table 명
   * @param {{key: string,value: string|number}} whereObj Where 절
   * @param {Object} updateObj Update 할려고하는 Data Object
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  updateTable(tblName, whereObj, updateObj, hasViewSql) {
    if(!Object.keys(whereObj).length || !Object.keys(updateObj).length){
      return new Error('object not defined');
    }
    let sql = `UPDATE ${tblName} SET ${this.makeUpdateValues(updateObj)} WHERE ${whereObj.key} = ${whereObj.value}`;
    return db.single(sql, null, hasViewSql);
  }

    /**
   * createPool 을 이용하여 Multiple Query 수행
   * @param {string} tbName 
   * @param {string} whereKey 
   * @param {Object[]} updateList 
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  async updateTablesByPool(tblName, whereKey, updateList, hasViewSql){
    if(!updateList.length && whereKey !== ''){
      return new Error('updateList or whereKey not defined');
    }

    return await Promise.map(updateList, updateObj => {
      return this.updateTable(tblName, {
        key: whereKey,
        value: updateObj[whereKey]
      }, updateObj, hasViewSql);
    })
  }


  /**
   * createConnection 을 이용하여 Multiple Query 수행
   * @param {string} tbName 
   * @param {string} whereKey 
   * @param {Object[]} updateList 
   * @param {boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  updateTablesByConnection(tblName, whereKey, updateList, hasViewSql){
    if(!updateList.length && whereKey !== ''){
      return new Error('updateList or whereKey not defined');
    }
    let sql = '';
    updateList.forEach(updateObj => {
      sql += `UPDATE ${tblName} SET ${this.makeUpdateValues(updateObj)} WHERE ${whereKey} = ${updateObj[whereKey]};`;
    })

    return this.db.multipleQuery(sql, hasViewSql);
  }


  /**
   * Make Replace F
   * @param {string} value SQL
   */
  MRF(value) {
    var str_value = value.toString();
    return str_value.split("'").join("''");
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
    })

    return returnValue;
  }

  /**
   * update 구문 만들어줌
   * @param {Object} objValue json
   */
  makeUpdateValues(objValue) {
    let returnValue = '';
    if (typeof objValue !== 'object' && Array.isArray(objValue)) {
      throw TypeError('object가 아님');
    }

    for (let key in objValue) {
      if (returnValue !== '') {
        returnValue += ', ';
      }

      returnValue += `${key} = ${this.makeVaildValue(objValue[key])}`;
    }
    return returnValue;
  }

  makeVaildValue(checkValue){
    let returnValue = null;
    if(checkValue instanceof Date){
      returnValue = checkValue.toISOString().substring(0,19).replace('T', ' ');
    } else if (checkValue == null) {
      returnValue = null;
    } else if (checkValue === undefined) {
      returnValue = '';
    } else if (typeof checkValue === 'number') {
      returnValue = checkValue;
    } else {
      returnValue = this.MRF(checkValue);
    }

    return typeof returnValue === 'string' ? `"${returnValue}"` : returnValue;
  }
}

module.exports = BaseModel;