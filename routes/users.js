var express = require('express');
var router = express.Router();
var path = require('path');
const helpers = require('../helpers/util');
const { ObjectId } = require('mongodb');

module.exports = function (db) {

  function getAvatar(userid, callback) {
    db.query(`SELECT avatar FROM users WHERE id = ${userid}`, [], (err, data) => {
      callback(err, data);
    })
  }

  router.get('/', async function (req, res, next) {
    const url = req.url == '/' ? 'page=1&limit=5&query=""&sortBy="_id"&sortMode="asc"' : req.url.slice(2);
    const param = new URLSearchParams(url)
    const page = parseInt(param.get("page"));
    const limit = parseInt(param.get("limit"));
    const queryString = param.get("query").replace(/"/g, '')
    const offset = (page - 1) * limit;
    let sortBy = param.get("sortBy")
    let sortMode = param.get("sortMode")
    if (sortMode == '"asc"') {
      sortMode = 1
    } else {
      sortMode = -1
    }
    var sortMongo = `{${sortBy} : ${sortMode}}`;
    sortMongo = JSON.parse(sortMongo);
    
    console.log('Url: ' + url)
    // console.log('Query: ' + queryString)
    // console.log(queryString == '""')

    let searchQuery = {}
    if (queryString != ''){
      searchQuery = {
        $or: [
          { name: { $regex: queryString, $options: 'i' } },  // Case-insensitive regex for name
          { phone: { $regex: queryString, $options: 'i' } }  // Case-insensitive regex for phone
        ]
      };
    }

    // let noSql = '{';
    // if (wheres.length > 0) {
    //   noSql += `${wheres.join(',')}`
    // }
    // noSql += '}'

    // noSql = JSON.parse(noSql)

    // console.log(noSql)

    try {
      const totalData = await db.collection("users").countDocuments(searchQuery)
      console.log('total data: ', totalData)
      const pages = limit ? Math.ceil(totalData / limit) : 1
      const data = await db.collection("users").find(searchQuery).skip(offset).limit(limit).sort(sortMongo).toArray()
      // console.log(data)
      res.status(200).json({
        "data": data,
        "total": totalData,
        "pages": pages,
        "page": page,
        "limit": limit,
        "offset": offset
      })

    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "error ambil data" })
    }
  })

  router.post('/', async function (req, res, next) {
    const { name, phone } = req.body
    // console.log(name, phone)
    var myObj = []
    myObj.push(`"name" : "${name}"`)
    myObj.push(`"phone" : "${phone}"`)
    let noSql = '{';
    if (myObj.length > 0) {
      noSql += `${myObj.join(',')}`
    }
    noSql += '}'
    // console.log(noSql)
    noSql = JSON.parse(noSql)
    try {
      const result = await db.collection("users").insertOne(noSql)
      if (result) {
        const insertedData = await db.collection("users").findOne({ _id: result.insertedId })
        res.status(200).json(insertedData)
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "error menambahkan data" })
    }

  })

  router.get('/:id', async function (req, res, next) {
    const id = req.params.id
    console.log(id)
    try {
      const data = await db.collection("users").findOne({ _id: new ObjectId(id) })
      console.log(data)
      res.status(200).json(data)
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "error ambil data" })
    }
  })

  router.put('/:id', async function (req, res, next) {
    const id = req.params.id
    const { name, phone } = req.body
    var myObj = []
    myObj.push(`"name" : "${name}"`)
    myObj.push(`"phone" : "${phone}"`)
    let noSql = '{';
    if (myObj.length > 0) {
      noSql += `${myObj.join(',')}`
    }
    noSql += '}'
    console.log(noSql)
    noSql = JSON.parse(noSql)
    try {
      const result = await db.collection("users").updateOne({ _id: new ObjectId(id) }, { $set: noSql})
      console.log(result)
      if (result) {
        const updatedData = await db.collection("users").findOne({ _id: new ObjectId(id) })
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
      const getData = await db.collection("users").findOne({ _id: new ObjectId(id) })
      const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) })
      console.log(result)
      if (result.deletedCount === 1) {
        res.status(200).json(getData)
      }
    } catch (error) {
      console.log(error)
      res.status(500).json({ message: "error delete data" })
    }
  })

  router.get('/:id/todos', async function (req, res, next) {
    res.render('todos')
  })

  return router
}
