'use strict';
const db = require('./db');

class BaseModel {
  constructor(dbInfo = {host, user, password, database, connectionLimit}) {
    this.db = db;
    
    db.createPool(dbInfo);
  }

  /**
   * 
   * @param {Object} dbInfo mysql Create Pool을 위함
   */
  changePool(dbInfo = {host, user, password, database, connectionLimit}) {
    db.createPool(dbInfo);
  }

  /**
   * SELECT 일반 테이블
   * @param {String} tbName Table 명
   * @param {String} fieldName Table Field 명
   * @param {String} attribute fieldName 에 매칭되는 Attribute
   */
  getTable(tbName, fieldName, attribute) {
    let sql = `SELECT * FROM ${tbName}`;
    if (fieldName !== '' && fieldName !== undefined) {
      sql += ` WHERE ${fieldName} = '${attribute}';`;
    }
    return db.single(sql);
  }
  /**
   * INSERT 일반 테이블
   * @param {String} tbName Table 명
   * @param {Object} insertObj Insert 할려고하는 Data Object
   */
  setTable(tbName, insertObj) {
    let sql = `INSERT INTO ${tbName} (${Object.keys(insertObj)}) VALUES ${this.makeInsertValues(Object.values(insertObj))}`;

    console.log('sql', sql)
    return db.single(sql);
  }
  /**
   * Multi INSERT 일반 테이블
   * @param {String} tbName Table 명
   * @param {Array} insertArrayObj Insert 할려고하는 Data Object List
   */
  setTables(tbName, insertArrayObj) {
    let sql = `INSERT INTO ${tbName} (${Object.keys(insertArrayObj[0])}) VALUES ${this.makeMultiInsertValues(insertArrayObj)}`;
    return db.single(sql);
  }

  /**
   * UPDATE 일반 테이블 
   * @param {String} tbName Table 명
   * @param {Object} whereObj Where 절
   * @param {Object} updateObj Update 할려고하는 Data Object
   */
  updateTable(tbName, whereObj = {
    key,
    value
  }, updateObj) {
    let sql = `UPDATE ${tbName} SET ${this.makeUpdateValues(updateObj)} WHERE ${key} = ${value}`;
    return db.single(sql);
  }

  /**
   * Make Replace F
   * @param {String} value SQL
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
      if (value === null) {
        returnValue += null;
      } else if (value === undefined) {
        returnValue += '';
      } else if (typeof value === 'number') {
        returnValue += value;
      } else {
        returnValue += `'${this.MRF(value)}'`;
      }
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

    for (key in objValue) {
      if (returnValue !== '') {
        returnValue += ', ';
      }
      if (objValue[key] == null) {
        returnValue += `${key} = null`;
      } else if (objValue[key] === undefined) {
        returnValue += `${key} = ''`;
      } else if (typeof objValue[key] === 'number') {
        returnValue += `${key} = ${objValue[key]}`;
      } else {
        returnValue += `${key} = '${this.MRF(objValue[key])}'`;
      }
    }
    return returnvalue;
  }
}

module.exports = BaseModel;