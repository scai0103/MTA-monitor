const express = require('express');
const router = express.Router();
const config = require('config');
const nodemailer = require('nodemailer');
const logger = require('../../config/logger');

const smtpConfig = config.get("SmtpConfig");
const transporter = nodemailer.createTransport(smtpConfig);


module.exports = function (app) {

  router.use(function (req, res, next) {
    // TODO: Da aggiungere autenticazione
    // if (false) {
    //     res.status(777)
    // } else {
    //     next()
    // }
    next();
  });

  router.post('/', function (req, res) {
    let requestBody = req.body;
    app.get('models').DeviceGroup
      .findAll({
        where: {
          idDevice: requestBody.idDevice
        },
        attributes: ['idGroup']
      })
      .then(function (groups) {
        if (!groups.length)
          res.status(404).json({ error: "No group found" });
        else {
          let groupIds = groups.map(function (group) { return group.dataValues.idGroup });
          app.get('models').User
            .findAll({
              where: {
                idGroup: groupIds
              },
              attributes: ['email']
            })
            .then(function (emails) {
              let emailStrings = emails.map(function (email) { return email.dataValues.email });
              let mailRecipients = emailStrings.join(', ');
              let mailOptions = {
                to: mailRecipients,
                subject: 'ERROR LOG REPORT', // Subject line
                text: requestBody.mailBody, // plaintext body, check the post param name
              };

              // send mail with defined transport object
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  return logger.error(error);
                }
                res.status(200).json(info.response);
              });
            });
        }
      });
  });

  return router;
}
