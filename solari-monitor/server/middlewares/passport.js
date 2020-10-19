/**
 * Passport JS configurator. configure this
 * to handle the behaviour of the login request
 */
const logger = require('./../../config/logger')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

module.exports = function(passport, app) {
    passport.serializeUser(function(user, done) {
        done(null, user);
    });

    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    passport.use('local-login', new LocalStrategy({
            passReqToCallback: true
        },
        function(req, username, password, done) {

            app.get('models').User.findOne({
                where: {
                    email: username
                }
            }).then(function(userObj) {

                if (userObj == null)
                    return done(null, false, req.flash('errorMessage', 'LOGIN_ERROR'))

                bcrypt.compare(password, userObj.password, function(err, res) {
                    if (!res) {
                        return done(null, false, req.flash('errorMessage', 'LOGIN_ERROR'))
                    }

                    return done(null, {
                        id: userObj.id,
                        username: username,
                        name: userObj.name,
                        surname: userObj.surname,
                        idRole: userObj.idRole
                    })
                })

            })
        }))
}
