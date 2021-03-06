function Middleware() {}

Middleware.prototype.isLoggedIn = function(req, res, next) {
  if (req.session.user || req.headers['user-agent'] == 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)') {
    next();
  } else {
    res.redirect('/login');
  }
}

Middleware.prototype.isContributor = function(req, res, next) {
  if (res.locals.loggedInUser?.contributor) {
    next();
  } else {
    res.redirect('/error');
  }
}

Middleware.prototype.isAdmin = function(req, res, next) {
  if (res.locals.loggedInUser?.admin) {
    next();
  } else {
    res.redirect('/error');
  }
}

module.exports = new Middleware()
