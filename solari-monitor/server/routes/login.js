const express = require('express');
const router = express.Router();
const config = require('config');

module.exports = function(passport) {

    router.get('/', function(req, res) {
        return res.json({
            user: req.user
        });
    });

    router.post('/', function(req, res, next) {
        passport.authenticate('local-login', function(err, user, info) {
            if (err) {
                return next(err);
            }

            if (!user) {
                return res.status(400).json({ error: req.flash('errorMessage')[0] });
            }

            req.logIn(user, function(err) {
                if (err) {
                    return next(err);
                }

                // Add extra info
                const batchConfig = config.get('Batch');
                const redmineConfig = config.get('Redmine');
                user.extra = {
                  commandDashboardURI: batchConfig.URI,
                  commandDashboardAuth: batchConfig.Auth,
                  redmineURI: redmineConfig.URI + redmineConfig.Path
                };

                return res.json({
                    user: user
                });
            })
        })(req, res, next);
    });

    return router;
}
