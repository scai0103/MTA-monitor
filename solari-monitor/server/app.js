// Set the global base path
global.__base = __dirname + '/';

// Required modules importation
const path = require('path');
const express = require('express');
const expressWinston = require('express-winston');
const session = require('express-session');
const bodyParser = require('body-parser');
const http = require('http');
const logger = require(__base + '../config/logger');
const config = require('config');
const passport = require('passport');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const fs = require('fs');
const compression = require('compression');
const icingaSyncManager = require('./shared/icingaSyncManager');
const saltRounds = 10

// Create the *log* path for the logger
let logBaseFolderPath = config.get('LogBaseFolderPath')
if (!fs.existsSync(logBaseFolderPath)) {
  fs.mkdirSync(logBaseFolderPath);
}

// Create the *upload* path for the logger
let uploadBaseFolderPath = config.get('UploadBaseFolderPath')
if (!fs.existsSync(uploadBaseFolderPath)) {
  fs.mkdirSync(uploadBaseFolderPath);
}

// App initialization
const app = express()

// compress all responses
app.use(compression())

// Model initialization and setup in the app instance
app.set('models', require('./models'))
app.set('roles', {
  superadmin: 1,
  admin: 2,
  operator: 3,
  maintainer: 4
})

// Icinga Sync Manager
icingaSyncManager.deleteLockFile();
app.set('icingaSyncManager', icingaSyncManager);

//Importing middlewares
require('./middlewares/passport')(passport, app)
const authMiddleware = require('./middlewares/authentication')

//Importing routes
const indexRoutes = require('./routes/index')
const loginRoutes = require('./routes/login')(passport)
const logoutRoutes = require('./routes/logout')
const profileRoutes = require('./routes/profile')
const devicesRoutes = require('./routes/devices')(app)
const usersRoutes = require('./routes/users')(app)
const groupsRoutes = require('./routes/groups')(app)
const notifyRoutes = require('./routes/notify')(app)
const setupRoute = require('./routes/setup')(app)
const maintenanceRoutes = require('./routes/maintenance')(app)
const ticketsRoutes = require('./routes/tickets')(app)
const kibanaRoutes = require('./routes/kibana')(app)
const commandsRoutes = require('./routes/commands')(app)
const stationsRoutes = require('./routes/stations')(app)
const auditLogs = require('./routes/auditLogs')(app)

// Middlewares binding
app.use(express.static(path.join(__dirname, 'public')))
app.use(flash())

// Initialize middlewares for the app
app.use(bodyParser.urlencoded({ extended: false })) // parse body for passport js
app.use(bodyParser.json()) // Parse JSON bodies

/** Logger for requests and general debugging purposes
 * can also be written on files (log folder)
 */
app.use(expressWinston.logger({
  winstonInstance: logger,
  colorStatus: true,
  statusLevels: true
}))

// Session initialization
app.use(session({
  secret: config.get("SessionSecretKey"),
  resave: config.get("SessionResave"),
  saveUninitialized: config.get("SessionSaveUninitialized")
  //cookie: { secure: true }
}))

/** Passport JS initialization
 * Passport is use to handle session and
 * authentication of users (passportjs.org)
 */
app.use(passport.initialize())
app.use(passport.session())

// Routes binding
app.use('/', indexRoutes)
app.use('/login', loginRoutes)
app.use('/logout', logoutRoutes)
app.use('/api/icinga/notify', notifyRoutes)
app.use('/setup', setupRoute)
app.use(authMiddleware())
app.use('/profile', profileRoutes)
app.use('/devices', devicesRoutes)
app.use('/users', usersRoutes)
app.use('/groups', groupsRoutes)
app.use('/maintenance', maintenanceRoutes)
app.use('/tickets', ticketsRoutes)
app.use('/kibana', kibanaRoutes)
app.use('/commands', commandsRoutes)
app.use('/stations', stationsRoutes)
app.use('/auditLogs', auditLogs)

/**
 * This section contains
 * proxying requests from the app
 * to the various platforms
 * (Redmine, Redmine APIs, Icinga)
 */
const httpProxy = require('http-proxy')
const proxy = httpProxy.createProxyServer({
  proxyTimeout: 15000
})

/** Fix issue between bodyParser
 * and proxy POST requests
 */
proxy.on('proxyReq', function (proxyReq, req, res, options) {
  // Match POST request except the request to '/elasticsearch/_msearch' (hack for kibana)
  if (req.body && req.url != '/elasticsearch/_msearch') {

    let bodyData = JSON.stringify(req.body);   // incase if content-type is application/x-www-form-urlencoded -> we need to change to application/json

    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));   // stream the content

    proxyReq.write(bodyData);
  }
});

// Redmine WEB proxy
app.all('/redmine/*', function (req, res) {

  const options = {
    target: config.get("Redmine").URI
  };

  proxy.web(req, res, options, function (e) {
    logger.error("\n" + e)
    return res.status(500).json({
      "code": e.code,
      "description": e.message,
      "error": "SERVER_ERROR"
    })
  })
})

// Batch Dashboard WEB proxy
app.all('/dashboard/*', function (req, res) {
  req.url = unescape(req.url.replace('/dashboard', ''));

  const options = {
    target: config.get("Batch").URI
  };

  proxy.web(req, res, options, function (e) {
    logger.error("\n" + e)
    return res.status(500).json({
      "code": e.code,
      "description": e.message,
      "error": "SERVER_ERROR"
    })
  })
})

// Icinga APIs proxy
app.all('/proxy/api/icinga/*', function (req, res) {
  const options = {
    target: config.get("Icinga").URI,
    secure: false,
    auth: config.get("Icinga").Auth
  };
  req.url = req.url.replace('/proxy/api/icinga', '/')
  proxy.web(req, res, options, function (e) {
    logger.error("\n" + e)
    return res.status(500).json({
      "code": e.code,
      "description": e.message,
      "error": "SERVER_ERROR"
    })
  })
})

// Redmine APIs proxy
app.all('/proxy/api/redmine/*', function (req, res) {
  let target = config.get("Redmine").URI + config.get("Redmine").Path
  const options = {
    target: target,
    auth: config.get("Redmine").Auth,
    secure: false
  };
  req.url = req.url.replace('/proxy/api/redmine', '/')
  proxy.web(req, res, options, function (e) {
    logger.error("\n" + e)
    return res.status(500).json({
      "code": e.code,
      "description": e.message,
      "error": "SERVER_ERROR"
    })
  })
})

// Device screenshot proxy
app.all('/proxy/screenshot/*', function (req, res) {
  const options = {
    target: 'https://' + req.url.replace('/proxy/screenshot/', ''),
    proxyTimeout: 5000, //TODO: Da capire il tempo reale per generare lo screenshot
    auth: 'admin:naspas',
    https: true,
    secure: false,
    rejectUnauthorized: false
  }

  proxy.web(req, res, options, function (e) {
    logger.error("\n" + e)
    return res.status(500).end();
  })
})


// Kibana proxy
const isKibanaRequest = function (req) {
  const referer = req.headers['referer'];
  const urls = ['/bundles/src/ui/public/images/kibana.svg', '/bundles/node_modules/font-awesome/fonts/fontawesome-webfont.woff2'];

  return urls.includes(req.url) || (referer && referer.indexOf('proxy/kibana') != -1) || (referer && referer.indexOf('/bundles/commons.style.css') != -1);
}

const kibanaProxy = function (req, res) {
  req.url = unescape(req.url.replace('/proxy/kibana', ''));

  const options = {
    target: config.get("Kibana").URI,
  };

  proxy.web(req, res, options, function (e) {
    logger.error("\n" + e)
    return res.status(500).json({
      "code": e.code,
      "description": e.message,
      "error": "SERVER_ERROR"
    })
  })
}

app.all('/proxy/kibana/*', function (req, res) {
  kibanaProxy(req, res)
})

app.all("*", function (req, res, next) {
  if (isKibanaRequest(req)) {
    kibanaProxy(req, res)
  }
  else {
    next()
  }
})

/**
 * Proxy END
 */

// Create public server based on express app
const server = http.createServer(app)

/**
 * Sync DB changes from models
 * and run the server on the configured port
 */
app.get('models').sequelize.sync().then(function () {
  server.listen(config.get('ServerPort'), function () {
    logger.debug('NODE_ENV: ' + process.env.NODE_ENV)
    logger.info('Server running on port: ' + config.get('ServerPort'))
  })
})

// ----------------------------------------------------------------------------------------------------------------------------------
// GLOBAL PROCESS HANDLERS.
// ----------------------------------------------------------------------------------------------------------------------------------
process.on('SIGINT', () => {
  "use strict";

  try {
    icingaSyncManager.deleteLockFile();
  } catch (error) { }

  process.exit(0);
});

process.on('uncaughtException', (error) => {
  "use strict";

  if (error != null) {
      if (logger != null) {
          logger.error('Internal Server Error (ErrCode 500) - Uncaught Exception in server process: %s', error.stack);
      }

      console.log('Internal Server Error (ErrCode 500) - Uncaught Exception in server process: ' + error.stack);
  } else {
      if (logger != null) {
          logger.error('Internal Server Error (ErrCode 500) - Unknown Uncaught Exception in server process');
      }

      console.log('Internal Server Error (ErrCode 500) - Unknown Uncaught Exception in server process');
  }

  try {
    icingaSyncManager.deleteLockFile();
  } catch (error) { }

  process.exit(1);
});
// ----------------------------------------------------------------------------------------------------------------------------------
