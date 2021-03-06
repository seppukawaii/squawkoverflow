const secrets = require('../secrets.json');
const Database = require('../helpers/database.js');

const {
  Client,
  Intents
} = require('discord.js');

const client = new Client({
  intents: [Intents.FLAGS.GUILD_MEMBERS]
});

(async () => {
  let siteMembers = await Database.query('SELECT members.id `member`, members.avatar, member_auth.id, member_settings.value AS avatarSetting FROM members LEFT JOIN member_auth ON (members.id = member_auth.member AND member_auth.provider = "discord") LEFT JOIN member_settings ON (members.id = member_settings.member AND member_settings.setting = "avatar")');

  client.login(secrets.DISCORD.BOT_TOKEN);

  client.on('ready', () => {
    client.guilds.fetch(secrets.DISCORD.GUILD_ID).then((guild) => {
      guild.members.fetch().then((serverMembers) => {
        let promises = [];

        for (let siteMember of siteMembers) {
          let serverMember = serverMembers.get(siteMember.id);

          if (serverMember) {
            promises.push(Database.query('INSERT INTO member_badges VALUES (?, "discord", NOW()) ON DUPLICATE KEY UPDATE badge = badge', [siteMember.member]));

            Database.set('members', {
              id: siteMember.member,
              avatar: !siteMember.avatarSetting || siteMember.avatarSetting == 'discord' ? serverMember.displayAvatarURL() : siteMember.avatar
            }, {
              serverMember: true
            });
          } else {
            promises.push(Database.query('DELETE FROM member_badges WHERE `member` = ? AND badge = "discord"', [siteMember.member]));

            Database.set('members', {
              id: siteMember.member
            }, {
              serverMember: false
            });
          }

          promises.push('REPLACE INTO counters SELECT counters.member, "species", "total", COUNT(DISTINCT species) FROM counters JOIN species ON (counters.id = species.id) WHERE `member` = ? AND type = "birdypedia"');
          promises.push(Database.query('REPLACE INTO counters SELECT counters.member, "eggs" type, species_adjectives.adjective id, COUNT(DISTINCT species) FROM counters JOIN species_adjectives ON (counters.id = species_adjectives.species) WHERE `member` = ? AND type = "birdypedia" GROUP BY species_adjectives.adjective', [siteMember.member]));
          promises.push(Database.query('REPLACE INTO counters SELECT counters.member, "family", species.family, COUNT(*) FROM counters JOIN species ON (counters.id = species.id) WHERE `member` = ? AND type = "birdypedia" GROUP BY species.family', [siteMember.member]));
        }

        Promise.allSettled(promises).then(() => {

          process.exit(0);
        });
      });
    });
  });
})();