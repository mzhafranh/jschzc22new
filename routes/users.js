var express = require('express');
var router = express.Router();
var path = require('path');
const helpers = require('../helpers/util')

module.exports = function (db) {

  function getAvatar(userid, callback) {
    db.query(`SELECT avatar FROM users WHERE id = ${userid}`, [], (err, data) => {
      callback(err, data);
    })
  }

  router.get('/', async function (req, res, next) {
    const url = req.url == '/' ? '/?page=1' : req.url;
    const page = req.query.page || 1;
    const limit = 5;
    const offset = (page - 1) * limit;
    const wheres = []
    const values = []
    const filter = req.url
    var count = 1;
    var sortBy = req.query.sortBy == undefined ? '_id' : req.query.sortBy;
    var sortMode = req.query.sortMode == undefined ? 1 : req.query.sortMode;
    if (sortMode == 'asc') {
      sortMode = 1
    } else {
      sortMode = -1
    }
    var sortMongo = `{"${sortBy}" : ${sortMode}}`;
    sortMongo = JSON.parse(sortMongo);

    console.log('Query: ' + req.query)
    console.log('Filter: ' + filter)

    let noSql = '{';
    if (wheres.length > 0) {
      noSql += `${wheres.join(',')}`
    }
    noSql += '}'

    noSql = JSON.parse(noSql)

    console.log(noSql)

    try {
      const totalData = await db.collection("users").countDocuments(noSql)
      console.log(totalData)
      const pages = Math.ceil(totalData / limit)
      const data = await db.collection("users").find(noSql).skip(offset).limit(limit).sort(sortMongo).toArray()
      console.log(data)
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


  router.get('/avatar', helpers.isLoggedIn, function (req, res, next) {
    console.log(req.session.user.avatar)

    getAvatar(req.session.user.id, (err, avatarData) => {
      if (err) {
        console.error(err)
      }
      res.render('avatar', { avatar: avatarData.rows[0].avatar })
    })
  });

  router.post('/avatar', helpers.isLoggedIn, function (req, res, next) {
    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).send('No files were uploaded.');
    }
    var avatar = req.files.avatar
    var [username] = req.session.user.email.split('@')
    var avatarFilename = username + Date.now() + path.extname(avatar.name)
    var filePath = path.join(__dirname, '..', 'public', 'images', 'uploads', avatarFilename)

    avatar.mv(filePath, (err) => {
      if (err) {
        return res.status(500).send(err);
      }

      db.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatarFilename, req.session.user.id], (err, data) => {
        if (err) {
          console.error(err);
        }
        res.redirect('/todos');
      });
    })

  });

  return router
}
