const Database = require('../helpers/database.js');
const Search = require('../helpers/search.js');

const BirdyPet = require('../models/birdypet.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      Search.query('notification', req.query).then((response) => {
        var promises = [];

        for (let result of response.results) {
          let data = result.data || {};

          if (data.from) {
            data.from = new Member(data.from);

            promises.push(data.from.fetch().catch((err) => {
              data.from = null;
            }));
          }

          if (data.birdypet) {
            data.birdypet = new BirdyPet(data.birdypet);

            promises.push(data.birdypet.fetch());
          }

          if (!result.viewed) {
            promises.push(Database.set('notifications', {
              id: result.id
            }, {
              viewed: true
            }));
          }
        }

        Promise.all(promises).then(() => {
          const stickers = ["bird_4359609.png", "bird_4359669.png", "bird_4359689.png", "bird_4359824.png", "bird_4433234.png", "cactus_4359655.png", "duck_4359767.png", "love-birds_4289413.png", "love-birds_4403057.png", "parrot_4359923.png"];

          for (let notification of response.results) {
            notification.text = '<p class="mt-3">';

            switch (notification.type) {
              case 'site_update':
                notification.icon = '<img src="/img/SQUAWK.png">';
                notification.text += `<a href="${notification.data.url}" target="_blank">Site Update - ${notification.data.title}</a>`;
                break;
              case 'birdypet_gift':
                notification.icon = '🎁';
                notification.text += notification.data.from?.username ? `<a href="/members/${notification.data.from.id}">${notification.data.from.username}</a>` : 'Someone';
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

                notification.text += notification.data.from?.username ? `<a href="/members/${notification.data.from.id}">${notification.data.from.username}</a>` : 'Someone';
                notification.text += ' thanks you for ';

                if (notification.data.birdypet) {
                  notification.text += `the <a href="/birdypet/${notification.data.birdypet.id}">${notification.data.birdypet.nickname || notification.data.birdypet.bird.commonName}</a>`;
                } else {
                  notification.text += 'a gift';
                }

                notification.text += ` you sent ${notification.data.from ? notification.data.from.preferredPronoun.cases.object : 'them'}!`;
                break;
              case 'birthday':
                notification.icon = '<img src="https://storage.googleapis.com/squawkoverflow/stickers/unboxing_5784126.png">';
                notification.text += 'Head to the <a href="/birdypedia">Birdypedia</a> to pick your celebratory BirdyPet!';
                break;
              case 'birthday_retro':
                notification.icon = '<img src="https://storage.googleapis.com/squawkoverflow/stickers/unboxing_5784126.png">';
                notification.text += 'You had a birthday this year!  Head to the <a href="/birdypedia">Birdypedia</a> to pick your celebratory BirdyPet!';
                break;
              case 'exchange_accepted':
                notification.icon = '<img src="https://storage.googleapis.com/squawkoverflow/stickers/handshake_1f91d.png">';
                notification.text += `<a href="/members/${notification.data.from.id}">${notification.data.from.username}</a> accepted <a href="/exchange/${notification.data.exchange}">your offer</a>!`;
                break;
              case 'other':
                notification.icon = `<img src="https://storage.googleapis.com/squawkoverflow/stickers/${notification.data.flair}">`;

                notification.text += notification.data.text;
                break;
            }

            notification.text += '</p>';
          }

          return res.json(response);
        });
      });
      break;
    case "PUT":
      var notification = await Database.getOne('notifications', {
        id: req.body.id
      });

      if (notification.member == req.body.loggedInUser) {
        switch (notification.type) {
          case 'birdypet_gift':
            if (req.body.action == 'thank') {
              notification.data.thanked = true;

              await Promise.all([
                Database.set('notifications', {
                  id: notification.id
                }, {
                  data: notification.data
                }),
                Database.create('notifications', {
                  id: Database.key(),
                  member: notification.data.from,
                  type: 'gift_thanks',
                  data: {
                    "from": req.body.loggedInUser,
                    "birdypet": notification.data.birdypet,
                    "flair": req.body.data?.flair
                  }
                })
              ]);
            }
            break;
        }
      } else {
        return res.error(403);
      }

      res.ok();
      break;
    case "DELETE":
      if (req.body.id == "ALL") {
        if (req.body.type) {
          if (req.body.type == 'other') {
            await Database.delete('notifications', {
              member: req.body.loggedInUser,
              type: {
                'comparator': 'NOT IN',
                'value_trusted': '"birdypet_gift", "gift_thanks", "exchange_accepted", "site_update"'
              }
            });
          } else if (req.body.type.startsWith('birdypet_gift-')) {
            await Database.query("DELETE FROM notifications WHERE `member` = ? AND data->'$.thanked' " + (req.body.type == 'birdypet_gift-thanked' ? 'IS NOT' : 'IS') + " NULL", [req.body.loggedInUser]);
          } else {
            await Database.delete('notifications', {
              member: req.body.loggedInUser,
              type: req.body.type
            });
          }
        } else {
          await Database.delete('notifications', {
            member: req.body.loggedInUser
          });
        }

        res.ok();
      } else {
        var notification = await Database.getOne('notifications', {
          id: req.body.id
        });

        if (notification.member == req.body.loggedInUser) {
          await Database.delete('notifications', {
            id: notification.id
          });

          res.ok();
        } else {
          return res.error(403);
        }
      }

      break;
    default:
      return res.error(405);
  }
};
