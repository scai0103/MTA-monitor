'use strict';

const winston = require('winston');
const config = require('config');
const path = require('path');
const moment = require('moment-timezone');

var logLevel = config.get('LogLevel');
var logBaseFolderPath = config.get('LogBaseFolderPath');

var configuration = {
  level: logLevel,
  transports: [
    new winston.transports.Console({
      colorize: true,
      timestamp: true
    }),
    new winston.transports.File({
      filename: 'server.log',
      dirname: path.join(__dirname, '../', logBaseFolderPath),
      maxsize: 10485760, //10MB
      maxFiles: 5,
      tailable: true,
      json: false,
      timestamp: function(tz) {
        if(tz) {
          return moment().tz(tz).format();
        }
        return moment().utc().format();
      },
      formatter: function(options) {
        return options.timestamp(moment.tz.guess()) + ' - ' +
          options.level.toUpperCase() + ': ' +
          (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? '\t'+ JSON.stringify(options.meta) : '' );
      }
    })
  ]
};

module.exports = new winston.Logger(configuration);
