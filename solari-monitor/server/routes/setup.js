const express = require('express');
const router = express.Router();
const config = require('config');
const logger = require('../../config/logger');
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = function(app) {

    router.get('/', function(req, res) {
        app.get('models').User.findAll().then(function(users) {
            if (!users.length) {

                const pass = 'naspas123';

                bcrypt.hash(pass, saltRounds, function(err, hash) {

                    app.get('models').User.create({
                        name: 'Admin',
                        surname: 'Solari',
                        email: 'admin@solari.it',
                        password: hash,
                        idRole: 1,
                        idGroup: null,
                        idRedmine: null,
                        idKibana: null
                    }).then(function(user) {
                        res.json({ message: "Setup completed" })
                    });

                });
            } else {
                res.redirect('/');
            }
        });
    });

    return router;
}
