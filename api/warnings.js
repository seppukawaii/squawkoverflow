const Database = require('../helpers/database.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "PUT":
          await Database.query('UPDATE member_warnings SET acknowledgedAt = NOW() WHERE id = ? AND `member` = ?', [req.body.warning, req.body.loggedInUser]);

          res.ok();
      break;
    default:
      return res.error(405);
  }
};
