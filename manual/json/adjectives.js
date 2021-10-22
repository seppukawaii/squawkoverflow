const {
  Datastore
} = require('@google-cloud/datastore');

const DB = new Datastore({
  namespace: 'squawkoverflow'
});

const fs = require('fs');

const eggs = {
  "angry": "890647178471682098",
  "azure": "888748849441689611",
  "black": "888748871335968768",
  "blue": "888748902021492766",
  "bluish": "888748934766415892",
  "coral": "888748957201752124",
  "emerald": "888748978382962699",
  "green": "888749006589657088",
  "greenish": "888749032346902589",
  "grey": "888749061774114858",
  "lilac": "888749092983939144",
  "orange": "888748543857262602",
  "sooty": "888749123807883284",
  "stony": "888749157442002984",
  "turquoise": "888749186793762816",
  "mauve": "888882031738622085",
  "lavender": "888882032158064721",
  "purple": "888882031923171378",
  "magenta": "888882031877042218",
  "pink": "888882032149684254",
  "rosy": "888882031541489676",
  "vermilion": "888882031872868402",
  "scarlet": "888882031902228490",
  "red": "888882031772192808",
  "maroon": "888882031600218173",
  "reddish": "888882030581022752",
  "rusty": "888882030765547590",
  "white": "888882030291611748",
  "whitish": "888882030392254535"
};

(async () => {
  try {
    var output = {};
    var adjectives = {};

    await DB.runQuery(DB.createQuery(['Bird']).filter('type', '=',
      'species')).then(([birds]) => {
      birds.forEach((bird) => {
        for (var adjective of bird.adjectives) {
          if (!adjectives[adjective]) {
            adjectives[adjective] = [];
          }

          adjectives[adjective].push(bird.code);
        }
      });
    });

    var keys = Object.keys(adjectives).sort();

    for (var key of keys) {
      output[key] = {
        icon: eggs[key] ? eggs[key] : null,
        species: adjectives[key]
      };
    }

    fs.writeFileSync(__dirname + '/../../public/data/eggs.json', JSON.stringify(output, null, 2));
    fs.writeFileSync(__dirname + '/../../public/data/adjectives.json', JSON.stringify(keys, null, 2));
  } catch (err) {
    console.log(err);
  }
})();