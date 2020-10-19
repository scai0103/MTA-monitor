const express = require('express');
const router = express.Router();
const config = require('config');
const request = require('request');
const logger = require('../../config/logger');
const bcrypt = require('bcrypt');
const format = require('string-format');

const redmineConfig = config.get('Redmine');
const baseUrl = redmineConfig.URI + redmineConfig.Path;
const authSegment = redmineConfig.Auth.split(':');

/**
 * Call redmine and delete the user
 * @param Id : the redmine id of the user
 * @param req : req obj of express
 * @param res : res obj of express
 * @param (optional) callback : a callback to be executed when the request is completed
 */
const deleteRedmineUser = function (id, req, res, description, callback) {
  const endpoint = format(redmineConfig.EndpointUser, id);

  // questa callback viene utilizzata in seguito ad un errore
  const defaultCallback = function (error, response, body) {
    if (error) {
      logger.error(error);
    }

    if (response.statusCode != 200) {
      logger.error(body);
    }

    // Restituisce l'errore originale che ha provocato il *roolback* dell'utente creato
    return res.status(500).json({ error: "SERVER_ERROR", description: description });
  };

  const callbackFunction = typeof callback == 'function' ? callback : defaultCallback;

  request({
    url: baseUrl + endpoint,
    method: 'DELETE',
    auth: {
      user: authSegment[0],
      pass: authSegment[1]
    },
    strictSSL: false,
    rejectUnhauthorized: false
  }, function (error, response, body) {
    callbackFunction(error, response, body);
  });

};

const tryToExtractRedmineErrors = function (redmineBodyResponse) {
  let errors = "";

  if (redmineBodyResponse && redmineBodyResponse.errors) {
    errors = redmineBodyResponse.errors.map(function (error) {
      return error;
    }).join(',\n');
  } else {
    errors = JSON.stringify(redmineBodyResponse);
  }

  return errors;
};

module.exports = function (app) {

  const auditLogger = require('../shared/auditLogger')(app);

  // Checks that the user operating is an superadmin or admin, otherwise throw an error
  router.use(function (req, res, next) {
    if (req.user.idRole != app.get('roles').superadmin && req.user.idRole != app.get('roles').admin) {
      res.status(403).json({ error: "ERROR_USER_UNAUTHORIZED" });
    } else {
      next();
    }
  });

  // CREATE ROUTE
  /**
   * Request body:
   * @param name : name of user (required)
   * @param surname : surname of user (required)
   * @param email : email of user (will also be redmine login)
   * @param password : password of user (will also be redmine pass)
   * @param idRole : Role of User (currently isn't needed, hardcoded on server side)
   * @param idGroup : Group which the user is part of
   * @param idRedmine : id of the redmine user associated ( populated by server )
   * @param idKibana : Kibanda Id (currently unused)
   */
  router.post('/', function (req, res) {
    try {
      const userRoles = app.get('roles');
      const userModel = app.get('models').User;
      const requestBody = req.body;
      const endpointUsers = redmineConfig.EndpointUsers;
      const endpointMemberships = redmineConfig.EndpointMemberships;

      let redmineRequestBody = {
        user: {
          login: requestBody.email,
          firstname: requestBody.name,
          lastname: requestBody.surname,
          mail: requestBody.email,
          password: requestBody.password,
          must_change_passwd: false
        }
      };

      let user = userModel.build({
        name: requestBody.name,
        surname: requestBody.surname,
        email: requestBody.email,
        password: requestBody.password,
        idRole: requestBody.idRole,
        idGroup: requestBody.idGroup,
        idRedmine: null,
        idKibana: null
      });

      if (user.idRole == userRoles.superadmin) {
        return res.status(400).json({ error: "BAD_REQUEST" });
      }

      let passLength = requestBody.password ? requestBody.password.length : 0;
      if (passLength > 15 || passLength < 8) {
        return res.status(400).json({ error: "BAD_REQUEST" });
      }

      /**
       * Redmine User Creation request
       */
      request({
        url: baseUrl + endpointUsers,
        method: 'POST',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        json: redmineRequestBody
      }, function (error, response, body) {

        if (error) {
          logger.error(error);
          return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
        }

        if (response.statusCode !== 201) {
          logger.error(body);
          return res.status(response.statusCode).json({ error: "SERVER_ERROR", description: tryToExtractRedmineErrors(body) });
        }


        let redmineId = body.user.id;
        let roleId = config.get("Redmine").RoleId;
        let membershipRequestBody = {
          membership: {
            user_id: redmineId,
            role_ids: [roleId]
          }
        };

        /**
         * Redmine membership association for
         *  newly created user
         */
        request({
          url: baseUrl + endpointMemberships,
          method: 'POST',
          auth: {
            user: authSegment[0],
            pass: authSegment[1]
          },
          strictSSL: false,
          rejectUnhauthorized: false,
          json: membershipRequestBody
        }, function (error, response, body) {

          if (error) {
            logger.error(error);
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          if (response.statusCode !== 201) {
            logger.error(body);

            /**
             * There's an error in the request
             * rollback by deleting the newly created user
             */
            return deleteRedmineUser(redmineId, req, res, tryToExtractRedmineErrors(body));
          }

          // Create user in local DB
          let saltRounds = 10;
          bcrypt.hash(user.password, saltRounds, function (err, hash) {

            if (err) {
              logger.error(err);
              return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(err) });
            }

            user.password = hash;
            user.idRedmine = redmineId;
            user.save().then(function (newUser) {

              auditLogger.logCreate(req.user, auditLogger.TYPE_USER, newUser);

              return res.status(201).json(newUser.dataValues);
            }).catch(function (err) {
              logger.error(err);
              return deleteRedmineUser(redmineId, req, res, JSON.stringify(err));
            });

          });

        });

      });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // READ ROUTE
  router.get('/', function (req, res) {
    try {
      const userModel = app.get('models').User;

      userModel
        .findAll({
          include: [{ model: app.get('models').Group }]
        })
        .then(function (users) {
          return res.json({ "users": users });
        })
        .catch(function (err) {
          logger.error(err);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
        })
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // READ BY ID ROUTE
  router.get('/:id', function (req, res) {
    try {
      const userId = req.params.id;

      if (!userId) {
        return res.status(400).json({ error: "BAD_REQUEST" });
      }

      app.get('models').User
        .findById(userId)
        .then(function (user) {
          if (!user) {
            return res.status(404).json({ error: "USER_NOT_FOUND" });
          }

          return res.json({ "user": user });
        })
        .catch(function (err) {
          logger.error(err);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
        })
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // UPDATE ROUTE
  /**
   * Update on redmine and if successfull update on our DB
   *
   * @param : userId is the id of the user
   * @param : userData is the same as POST request body
   */
  router.put('/', function (req, res) {
    try {
      const userRoles = app.get('roles');
      const userId = req.body.userId;
      const userData = req.body.user;

      let redmineRequestBody = {
        user: {
          login: userData.email,
          firstname: userData.name,
          lastname: userData.surname,
          mail: userData.email,
          password: userData.password,
        }
      };

      if (!userId) {
        return res.status(400).json({ error: "BAD_REQUEST" });
      }

      // If password isn't passed, don't change it
      if (userData.password.trim() == "")
        delete redmineRequestBody.user.password;

      app.get('models').User
        .findById(userId)
        .then(function (user) {

          if (!user) {
            return res.status(404).json({ error: "USER_NOT_FOUND" });
          }

          let updateUser = function () {

            if (userData.password.trim() == "") {
              userData.password = user.password;
              user.update(userData)
                .then(function (updatedUser) {

                  auditLogger.logUpdate(req.user, auditLogger.TYPE_USER, updatedUser);

                  return res.status(200).json(updatedUser);
                })
                .catch(function (err) {
                  logger.error(err);
                  return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
                });
            }
            else {
              let saltRounds = 10;
              bcrypt.hash(userData.password, saltRounds, function (err, hash) {
                userData.password = hash;
                user.update(userData)
                  .then(function (updatedUser) {

                    auditLogger.logUpdate(req.user, auditLogger.TYPE_USER, updatedUser);

                    return res.json(updatedUser);
                  })
                  .catch(function (err) {
                    logger.error(err);
                    return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
                  });
              });
            }
          }

          // If user is an SUPERADMIN, update only the DB
          if (user.idRole == userRoles.superadmin) {

            // Update user on DB
            updateUser();

          } else {

            const endpoint = format(redmineConfig.EndpointUser, user.idRedmine);

            // Update user on REDMINE
            request({
              url: baseUrl + endpoint,
              method: 'PUT',
              auth: {
                user: authSegment[0],
                pass: authSegment[1]
              },
              strictSSL: false,
              rejectUnhauthorized: false,
              json: redmineRequestBody
            }, function (error, response, body) {

              if (error) {
                logger.error(error);
                return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
              }

              if (response.statusCode != 200) {
                logger.error(body);
                return res.status(response.statusCode).json({ error: 'SERVER_ERROR', description: tryToExtractRedmineErrors(body) });
              }

              // Update user on DB
              updateUser();

            });
          }
        });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // DELETE
  /**
   * @param userIds : Array of User IDs to be deleted
   */
  router.delete('/', function (req, res) {
    try {
      const usersToDelete = req.body.userIds;

      if (!usersToDelete || !usersToDelete.length) {
        return res.status(400).json({ error: "BAD_REQUEST" });
      }

      const userModel = app.get('models').User;

      userModel
        .findAll({
          where: {
            id: usersToDelete
          }
        })
        .then(function (users) {

          if (!users.length) {
            return res.status(404).json({ error: "USER_NOT_FOUND" });
          }

          let promises = [];
          for (var i in users) {
            let user = users[i];

            // Se l'utente è se stesso oppure un superadmin non cancellarlo
            if (user.idRole == app.get('roles').superadmin || user.id == req.user.id) {
              let isError = true;
              promises.push({ error: isError, description: format('User "{0} {1}" can not be deleted', user.name, user.surname) });
              continue;
            }

            let promise = new Promise(function (resolve, reject) {
              deleteRedmineUser(user.idRedmine, req, res, null, function (error, response, body) {
                let isError = false;
                let description = "";

                if (error) {
                  logger.error(error);
                  isError = true;
                  description = format('User "{0} {1}" can not be deleted: {2}', user.name, user.surname, JSON.stringify(error));
                }

                // Se 200 l'utente è stato trovato su redmine, posso cancellarlo anche su solari monitor
                // Se 404 l'utente non è stato trovato su redmine, posso cancellarlo anche su solari monitor
                if (response.statusCode != 200 && response.statusCode != 404) {
                  logger.error(body);
                  isError = true;
                  description = format('User "{0} {1}" can not be deleted: {2}', user.name, user.surname, tryToExtractRedmineErrors(body));
                }

                if (!isError) {
                  userModel
                    .destroy({
                      where: {
                        id: user.id
                      }
                    })
                    .then(function () {
                      auditLogger.logDelete(req.user, auditLogger.TYPE_USER, user);

                      resolve({ error: isError, description: description });
                    })
                    .catch(function (error) {
                      logger.error(error);

                      isError = true;
                      description = JSON.stringify(error);
                      resolve({ error: isError, description: description });
                    })
                } else {
                  resolve({ error: isError, description: description });
                }
              });
            });
            promises.push(promise);
          }

          return Promise.all(promises);
        })
        .then(function (errors) {
          let errorObj = errors.reduce(function (a, b) {
            return {
              error: a.error | b.error,
              description: a.description + ', \n' + b.description
            };
          })

          if (errorObj.error) {
            return res.status(500).json({ error: "SERVER_ERROR", description: errorObj.description });
          }

          return res.status(200).json({ success: true });

        })
        .catch(function (error) {
          logger.error(error);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(error) });
        })
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  return router;
}
