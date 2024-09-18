var express = require('express');
var router = express.Router();
const helpers = require('../helpers/util')

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
  router.get('/', helpers.isLoggedIn, async function (req, res, next) {
    const page = req.query.page || 1;
    const limit = 5;
    const offset = (page - 1) * limit;
    const wheres = []
    const values = []
    const filterPageArray = []
    var filterPage = ``
    var count = 1;
    var sortBy = req.query.sortBy == undefined ? `id` : req.query.sortBy;
    var order = req.query.order == undefined ? `asc` : req.query.order;
    // const filterPage = `&name=${req.query.name}&height=${req.query.height}&weight=${req.query.weight}&startDate=${req.query.startDate}&endDate=${req.query.endDate}&married=${req.query.married}&operation=${req.query.operation}`
    const filter = {
      title: req.query.title,
      complete: req.query.complete,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      operation: req.query.operation
    }

    if (req.query.title) {
      wheres.push(`title ilike '%' || $${count++} || '%'`);
      values.push(req.query.title);
      filterPageArray.push(`&title=${req.query.title}`)
    }

    if (req.query.complete) {
      wheres.push(`complete = $${count++}`);
      values.push(req.query.complete);
      filterPageArray.push(`&complete=${req.query.complete}`)
    }

    if (req.query.startDate || req.query.endDate) {
      if (req.query.startDate && req.query.endDate) {

        let endDate = new Date(req.query.endDate)
        endDate.setDate(endDate.getDate() + 1)
        let year = endDate.getFullYear();
        let month = String(endDate.getMonth() + 1).padStart(2, '0');
        let day = String(endDate.getDate()).padStart(2, '0');
        let formattedEndDate = `${year}-${month}-${day}`

        wheres.push(`deadline BETWEEN $${count++} AND $${count++}`)
        values.push(req.query.startDate);
        values.push(endDate);
        filterPageArray.push(`&startDate=${req.query.startDate}`)
        filterPageArray.push(`&endDate=${formattedEndDate}`)
      }
      else if (req.query.startDate) {
        wheres.push(`deadline >= $${count++}`)
        values.push(req.query.startDate);
        filterPageArray.push(`&startDate=${req.query.startDate}`)
      }
      else if (req.query.endDate) {

        let endDate = new Date(req.query.endDate)
        endDate.setDate(endDate.getDate() + 1)
        let year = endDate.getFullYear();
        let month = String(endDate.getMonth() + 1).padStart(2, '0');
        let day = String(endDate.getDate()).padStart(2, '0');
        let formattedEndDate = `${year}-${month}-${day}`

        wheres.push(`deadline <= $${count++}`)
        values.push(endDate);
        filterPageArray.push(`&endDate=${formattedEndDate}`)
      }
    }


    if (req.query.operation) {
      filterPageArray.push(`&operation=${req.query.operation}`)
    }
    else {
      filterPageArray.push(`&operation=OR`)
    }

    let sql = `SELECT COUNT(*) AS total FROM todos WHERE (userid = ${req.session.user.id})`;
    if (wheres.length > 0) {
      if (req.query.operation == 'OR') {
        sql += ` AND (${wheres.join(' OR ')})`
      } else if (req.query.operation == 'AND') {
        sql += ` AND (${wheres.join(' AND ')})`
      }
    }

    console.log(sql)
    // console.log(values)
    // console.log(wheres)

    db.query(sql, values, (err, data) => {
      if (err) {
        console.error(err);
      }
      // console.log(data)
      const pages = Math.ceil(data.rows[0].total / limit)
      sql = `SELECT * FROM todos WHERE (userid = ${req.session.user.id})`
      if (wheres.length > 0) {
        if (req.query.operation == 'OR') {
          sql += ` AND (${wheres.join(' OR ')})`
        } else if (req.query.operation == 'AND') {
          sql += ` AND (${wheres.join(' AND ')})`
        }
      }
      sql += ` ORDER BY ${sortBy} ${order} LIMIT $${count++} OFFSET $${count++}`
      filterPage += filterPageArray.join('')
      console.log(sql)
      db.query(sql, [...values, limit, offset], (err, data) => {
        if (err) {
          console.error(err);
        }

        getAvatar(req.session.user.id, (err, avatarData) => {
          if (err) {
            console.error(err)
          }
          res.render('todos', { rows: data.rows, pages, page, filter, filterPage, email: req.session.user.email, avatar: avatarData.rows[0].avatar, sortBy, order })
        })
      })
    })

    console.log(sql)

  });

  router.get('/add', helpers.isLoggedIn, (req, res) => {
    res.render('add')
  })

  router.post('/add', helpers.isLoggedIn, (req, res) => {
    add(req.body.title, req.session.user.id, (err) => {
      if (err) {
        console.error(err);
      }
    })
    res.redirect('/todos');
  })

  router.get('/edit/:id', helpers.isLoggedIn, (req, res) => {
    select(req.session.user.id, req.params.id, (err, data) => {
      if (err) {
        console.error(err);
      }
      // console.log(data.rows[0])
      res.render('edit', { item: data.rows[0] })
    })
  })

  router.post('/edit/:id', helpers.isLoggedIn, (req, res) => {
    update(req.body.title, req.body.complete, req.body.deadline, req.session.user.id, req.params.id, (err) => {
      if (err) {
        console.error(err)
      }
      res.redirect('/todos');
    })
  })

  router.get('/delete/:id', helpers.isLoggedIn, (req, res) => {
    const index = parseInt(req.params.id)
    remove(index, (err) => {
      if (err) {
        console.error(err);
      }
    })
    res.redirect('/todos');
  })

  return router;
}