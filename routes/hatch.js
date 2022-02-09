const API = require('../helpers/api.js');

const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');

  API.call('hatch', "GET", {
      loggedInUser: req.session.user
    }, res).then((response) => {
      API.call('member', 'GET', {
        id: req.session.user,
        include: ['hasIncubator']
      }).then((member) => {
        return res.render('hatch/index', {
          eggs: response,
          hasIncubator: member.hasIncubator
        });
      });
    })
    .catch((err) => {
      switch (err.code) {
        case 401:
        case "401":
          return res.redirect('/login');
          break;
        case 403:
        case "403":
          if (err.response.data.timeUntil > 0) {
            return res.render('hatch/timer.ejs', {
              timeUntil: err.response.data.timeUntil
            });
          } else if (err.response.data.aviaryFull) {
            return res.render('hatch/full.ejs');
          } else {
            return res.redirect('/error');
          }
          break;
        default:
          return res.redirect('/error');
      }
    });
});

router.get('/incubator', (req, res) => {
  API.call('incubate', 'GET', {
    loggedInUser: req.session.user
  }).then((eggs) => {
    return res.render('hatch/incubator', {
      eggs: eggs
    });
  });
});

module.exports = router;
