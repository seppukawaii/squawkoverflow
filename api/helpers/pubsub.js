const {
  PubSub
} = require('@google-cloud/pubsub');

exports.publish = function(topic, action, body) {
  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV) {
      const pubsub = new PubSub();

      const data = {
        ...body,
        action
      };

      pubsub.topic(topic).publish(Buffer.from(JSON.stringify(data))).then(() => {
        resolve();
      });
    } else {
      exports.receive(Buffer.from(JSON.stringify(data))).then(() => {
        resolve();
      });
    }
  });
}

exports.receive = function(message, context) {
  const Bird = require('./models/bird.js');
  const Illustration = require('./models/illustration.js');
  const Member = require('./models/member.js');

  const Cache = require('./helpers/cache.js');
  const Counters = require('./helpers/counters.js');
  const Redis = require('./helpers/redis.js');
  const Search = require('./helpers/search.js');
  const Webhook = require('./helpers/webhook.js');

  return new Promise(async (resolve, reject) => {
    var data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    var member = new Member(data.member);
    var promises = [];

    await member.fetch();

    switch (data.action) {
      case "COLLECT":
        var illustration = new Illustration(data.illustration);

        await illustration.fetch();

        if (member.settings.general?.includes('updateWishlist')) {
          promises.push(member.updateWishlist(illustration.bird.code, "remove"));
        }

        var bird = new Bird(illustration.bird.code);

        await bird.fetch();

        for (let adjective of bird.adjectives) {
          promises.push(Counters.refresh('eggs', member.id, adjective));
        }

        if (data.adjective) {
          if (!member.settings.privacy?.includes('activity')) {
            promises.push(Webhook('egg-hatchery', {
              content: " ",
              embeds: [{
                title: illustration.bird.name,
                description: `<@${member.id}> hatched the ${data.adjective} egg!`,
                url: `https://squawkoverflow.com/birdypet/${data.birdypet}`,
                image: {
                  url: illustration.image
                }
              }]
            }));
          }
        } else if (data.freebird) {
          promises.push(Redis.connect().del(`freebird:${data.freebird}`));
          promises.push(Cache.remove('cache', 'freebirds', data.freebird));
        }
        break;
      case "RELEASE":
        let id = await Redis.create('freebird', data.illustration);

        promises.push(Redis.connect().sendCommand('EXPIRE', [`freebird:${id}`, 2628000]));
        promises.push(Cache.add('cache', 'freebirds', id));
        break;
    }

    promises.push(Search.invalidate(member.id));

    Promise.all(promises).then(resolve);
  });
}