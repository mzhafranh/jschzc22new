var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util');
const { ObjectId } = require('mongodb');

// module.exports = router;
module.exports = function (db) {

  function add(title, userid, callback) {

    db.query('INSERT INTO todos (title, userid, complete) VALUES ($1, $2, $3)', [title, userid, false], (err) => {
      callback(err);
    });
  }

  function select(userid, id, callback) {
    db.query(`SELECT * FROM todos WHERE userid = $1 AND id = $2`, [userid, id], (err, data) => {
      // console.log(data)
      callback(err, data);
    })
  }

  function update(title, complete, deadline, userid, id, callback) {
    db.query('UPDATE todos SET title = $1, complete = $2, deadline = $3, userid = $4 WHERE id = $5', [title, complete, deadline, userid, id], (err) => {
      callback(err);
    });
  }

  function remove(id, callback) {
    db.query('DELETE FROM todos WHERE id = $1', [id], (err) => {
      callback(err);
    })
  }

  function getAvatar(userid, callback) {
    db.query(`SELECT avatar FROM users WHERE id = ${userid}`, [], (err, data) => {
      callback(err, data);
    })
  }

  /* GET home page. */
  router.get('/', async function (req, res, next) {
    const url = req.url == '/' ? 'page=1&limit=5&title=""&complete=&startdateDeadline=""&enddateDeadline=""&sortBy="_id"&sortMode="asc"&executor=""' : req.url.slice(2);
    const param = new URLSearchParams(url)
    const page = parseInt(param.get("page"));
    const limit = parseInt(param.get("limit"));
    const offset = (page - 1) * limit;
    const wheres = []
    let sortBy = param.get("sortBy")
    let sortMode = param.get("sortMode")
    let sortMongo = `{${sortBy} : ${sortMode}}`;
    sortMongo = JSON.parse(sortMongo);
    let title = param.get("title")
    let complete = param.get("complete")
    let enddateDeadline = param.get("enddateDeadline")
    let startdateDeadline = param.get("startdateDeadline")
    let executor = param.get("executor")

    // const filterPage = `&name=${req.query.name}&height=${req.query.height}&weight=${req.query.weight}&startDate=${req.query.startDate}&endDate=${req.query.endDate}&married=${req.query.married}&operation=${req.query.operation}`
    
    
    const filter = {
      title: req.query.title,
      complete: req.query.complete,
      startDate: req.query.startdateDeadline,
      endDate: req.query.enddateDeadline,
      executor: req.query.executor
    }

    if (complete) {
      wheres.push(`"complete" : ${complete}`);
    }

    if (executor != '""'){
      wheres.push(`"executor": "${executor}"`)
    }

    if (startdateDeadline != '""' || enddateDeadline != '""') {
      if (startdateDeadline != '""' && enddateDeadline != '""') {
        let endDate = new Date(enddateDeadline)
        endDate.setDate(endDate.getDate() + 1)
        wheres.push(`"deadline" :{ "$gt": ${startdateDeadline}, "$lte": "${endDate.toISOString()}"}`)
      }
      else if (startdateDeadline != '""') {
        wheres.push(`"deadline": {"$gt": ${startdateDeadline}}`)
      }
      else if (enddateDeadline != '""') {
        let endDate = new Date(enddateDeadline)
        endDate.setDate(endDate.getDate() + 1)
        wheres.push(`"deadline": {"$lte": "${endDate.toISOString()}"}`)
      }
    }

    let noSql = '{';
    if (wheres.length > 0) {
        noSql += `${wheres.join(',')}`
    }
    noSql += '}'

    noSql = JSON.parse(noSql)

    if (title != '""'){
      let titleJSON = { title: { $regex: title.replace(/"/g, ''), $options: 'i' } }
      noSql = {...noSql, ...titleJSON}
    }

    console.log(noSql)

    try {
      const totalData = await db.collection("todos").countDocuments(noSql)
      console.log('total data: ', totalData)
      const pages = Math.ceil(totalData / limit)
      const data = await db.collection("todos").find(noSql).skip(offset).limit(limit).sort(sortMongo).toArray()
      console.log(data)
      res.status(200).json({
        "data": data,
        "total": totalData,
        "pages": pages,
        "page": page,
        "limit": limit,
      })
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "error ambil data" })
    }
  });

  router.get('/:id', async function (req, res, next) {
    const id = req.params.id
    console.log(id)
    try {
      const data = await db.collection("todos").findOne({ _id: new ObjectId(id) })
      console.log(data)
      res.status(200).json(data)
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "error ambil data" })
    }
  })

  router.post('/', async function (req, res) {
    const { title, executor } = req.body
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    var myObj = []
    myObj.push(`"title" : "${title}"`)
    myObj.push(`"complete": false`)
    myObj.push(`"deadline": "${futureDate.toISOString()}"`)
    myObj.push(`"executor" : "${executor}"`)
    
    let noSql = '{';
    if (myObj.length > 0) {
      noSql += `${myObj.join(',')}`
    }
    noSql += '}'
    // console.log(noSql)
    noSql = JSON.parse(noSql)
    try {
      const result = await db.collection("todos").insertOne(noSql)
      if (result) {
        const insertedData = await db.collection("todos").findOne({ _id: result.insertedId })
        res.status(200).json(insertedData)
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "error menambahkan data" })
    }
  })

  router.put('/:id', async function (req, res, next) {
    const id = req.params.id
    const { title, deadline, complete } = req.body
    var myObj = []
    myObj.push(`"title" : "${title}"`)
    myObj.push(`"deadline" : "${deadline}"`)
    myObj.push(`"complete" : ${complete}`)
    let noSql = '{';
    if (myObj.length > 0) {
      noSql += `${myObj.join(',')}`
    }
    noSql += '}'
    console.log(noSql)
    noSql = JSON.parse(noSql)
    try {
      const result = await db.collection("todos").updateOne({ _id: new ObjectId(id) }, { $set: noSql})
      console.log(result)
      if (result) {
        const updatedData = await db.collection("todos").findOne({ _id: new ObjectId(id) })
        res.status(200).json(updatedData)
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "error update data" })
    }
  })

  router.delete('/:id', async function (req, res, next) {
    const id = req.params.id
    try {
      const getData = await db.collection("todos").findOne({ _id: new ObjectId(id) })
      const result = await db.collection("todos").deleteOne({ _id: new ObjectId(id) })
      console.log(result)
      if (result.deletedCount === 1) {
        res.status(200).json(getData)
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "error delete data" })
    }
  })

  return router;
}