const API = require('../helpers/api.js');

const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  API.call('notifications', "GET", {
    loggedInUser: req.session.user,
    page: req.query.page
  }, res).then((response) => {
    const notifications = response.results;
    const stickers = ["LoveBirdsLife/003.png", "LoveBirdsLife/006.png", "LoveBirdsLife/011.png", "LoveBirdsLife/014.png", "LoveBirdsLife/016.png", "LoveBirdsLife/023.png", "LoveBirdsLife/031.png", "LoveBirdsLife/034.png"];

    for (let notification of notifications) {
      notification.text = '<p class="mt-3">';

      switch (notification.type) {
        case 'site_update':
          notification.icon = '<img src="/img/SQUAWK.png">';
          notification.text += `<a href="${notification.data.url}" target="_blank">Site Update - ${notification.data.title}</a>`;
          break;
        case 'birdypet_gift':
          notification.icon = '🎁';
          notification.text += notification.data.from.username ? `<a href="/members/${notification.data.from.id}">${notification.data.from.username}</a>` : 'Someone';
          notification.text += ' sent you ';
          notification.text += notification.data.birdypet.variant ? `<a href="/birdypet/${notification.data.birdypet.id}">${notification.data.birdypet.nickname || notification.data.birdypet.bird.commonName}</a>` : 'a gift';
          notification.text += '!';

          if (!notification.data.thanked) {
            notification.text += `</p><p>`;

            notification.text += `
                <div class="dropdown">
                  <button class="btn btn-secondary dropdown-toggle" type="button" id="thanksDropdown_${notification.id}" data-bs-toggle="dropdown" aria-expanded="false">
                    Say Thanks!
                  </button>
                  <ul class="dropdown-menu" aria-labelledby="thanksDropdown_${notification.id}">
              `;

            for (let sticker of stickers) {
              notification.text += `<li class="d-inline-block m-3" role="button" data-action="thank" data-json-flair="${sticker}"><img src="https://storage.googleapis.com/squawkoverflow/stickers/${sticker}" width="100"></li>`;
            }

            notification.text += `
                  </ul>
                </div>
              `;
          }
          break;
        case 'gift_thanks':
          if (notification.data.flair) {
            notification.icon = `<img src="https://storage.googleapis.com/squawkoverflow/stickers/${notification.data.flair}">`;
          } else {
            notification.icon = '❤️';
          }
          notification.text += notification.data.from.username ? `<a href="/members/${notification.data.from.id}">${notification.data.from.username}</a>` : 'Someone';
          notification.text += ` thanks you for a gift you sent ${notification.data.from.username ? notification.data.from.preferredPronoun.cases.object : 'them'}!`;
      }

      notification.text += '</p>';
    }

    res.render('notifications/index', {
      notifications: notifications,
      totalPages: Math.ceil(response.totalResults / 25),
      currentPage: Math.max(req.query.page || 1, 1)
    });
  }).catch((err) => {
    console.log(err);
    res.render('error/404', {
      error: true
    });
  });
});

module.exports = router;