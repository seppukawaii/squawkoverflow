const {
  Storage
} = require('@google-cloud/storage');

const Bird = require('../models/bird.js');
const Database = require('../helpers/database.js');

const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const Jimp = require('jimp');
const uuid = require('short-uuid');

module.exports = async (req, res) => {
  switch (req.method) {
    case "POST":
      let existing = null;
      let data = req.body;

      switch (data.url.split('.').pop().toLowerCase()) {
        case 'png':
          data.filetype = 'png';
          break;
        default:
          data.filetype = 'jpg';
      }

      if (data.id) {
        existing = await Database.query('SELECT * FROM variants WHERE id = ?', [data.id]).then(([result]) => result);
      } else (data.alias == 'NUM') {
        data.alias = await Database.query('SELECT COUNT(*) AS total FROM variants WHERE prefix = ?', [data.prefix]).then(([result]) => result.total + 1);
      } else {
        existing = await Database.query('SELECT * FROM variants WHERE prefix = ? AND alias = ?', [data.prefix, data.alias]).then(([result]) => result);
      }

      if (existing) {
        var key = existing.id;
        await Database.query('UPDATE squawkdata.variants SET source = ?, species = ?, subspecies = ?, credit = ?, special = ?, filetype = ?, label = ? WHERE id = ?', [data.source, data.species, data.subspecies, data.credit, data.special, data.filetype, data.label, key]);
      } else {
        var key = uuid.generate();
        await Database.query('INSERT INTO squawkdata.variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [key, data.prefix, data.alias, data.species, data.subspecies, data.label, data.credit, data.source, data.url, data.filetype, true, data.special]);
      }

      if (data.url) {
        let bird = new Bird(data.species);

        await bird.fetch();

        console.log(data);
        console.log(bird);
        console.log(key);

        let file = bucket.file(`${bird.order}/${bird.family}/${bird.scientificName}/${key}.${data.filetype}`);

        await Jimp.read(data.url).then(async (image) => {
          var mimes = {
            "jpg": "JPEG",
            "jpeg": "JPEG",
            "png": "PNG"
          };

          if (image.bitmap.height > 600) {
            await image.resize(Jimp.AUTO, 600);
          }

          await image
            .autocrop()
            .quality(90)
            .getBuffer(Jimp[`MIME_${mimes[data.filetype]}`], async (err, buff) => {
              await file.save(buff);

              res.json(`${data.prefix}-${data.alias}`);
            });
        });
      } else {
        res.json(`${data.prefix}-${data.alias}`);
      }

      break;
    default:
      return res.sendStatus(405);
  }
};