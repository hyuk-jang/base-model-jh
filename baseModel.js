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
   * @param {Boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  getTable(tbName, fieldName, attribute, hasViewSql) {
    let sql = `SELECT * FROM ${tbName}`;
    if (fieldName !== '' && fieldName !== undefined) {
      sql += ` WHERE ${fieldName} = '${attribute}';`;
    }
    return db.single(sql, null, hasViewSql);
  }
  /**
   * INSERT 일반 테이블
   * @param {String} tbName Table 명
   * @param {Object} insertObj Insert 할려고하는 Data Object
   * @param {Boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  setTable(tbName, insertObj, hasViewSql) {
    if(!Object.keys(insertObj).length){
      return new Error('object not defined');
    }
    let sql = `INSERT INTO ${tbName} (${Object.keys(insertObj)}) VALUES ${this.makeInsertValues(Object.values(insertObj))}`;

    return db.single(sql, null, hasViewSql);
  }
  /**
   * Multi INSERT 일반 테이블
   * @param {String} tbName Table 명
   * @param {Array} insertList Insert 할려고하는 Data Object List
   * @param {Boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  setTables(tbName, insertList, hasViewSql) {
    if(!insertList.length){
      return new Error('object not defined');
    }
    let sql = `INSERT INTO ${tbName} (${Object.keys(insertList[0])}) VALUES ${this.makeMultiInsertValues(insertList)}`;
    return db.single(sql, null, hasViewSql);
  }

  /**
   * UPDATE 일반 테이블 
   * @param {String} tbName Table 명
   * @param {Object} whereObj Where 절
   * @param {Object} updateObj Update 할려고하는 Data Object
   * @param {Boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  updateTable(tbName, whereObj = {
    key,
    value
  }, updateObj, hasViewSql) {
    if(!Object.keys(whereObj).length || !Object.keys(updateObj).length){
      return new Error('object not defined');
    }
    let sql = `UPDATE ${tbName} SET ${this.makeUpdateValues(updateObj)} WHERE ${whereObj.key} = ${whereObj.value}`;
    return db.single(sql, null, hasViewSql);
  }


  /**
   * Craete Connection 을 이용하여 Multiple Query 수행
   * @param {String} tbName 
   * @param {String} whereKey 
   * @param {Array} updateList 
   * @param {Boolean} hasViewSql 전송 Query Log 하고자 할 경우
   */
  updateTables(tbName, whereKey, updateList, hasViewSql){
    if(!updateList.length && whereKey !== ''){
      return new Error('updateList or whereKey not defined');
    }
    let sql = '';
    updateList.forEach(updateObj => {
      sql += `UPDATE ${tbName} SET ${this.makeUpdateValues(updateObj)} WHERE ${whereKey} = ${updateObj[whereKey]};`;

    })

    return this.db.multipleQuery(sql, hasViewSql);
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