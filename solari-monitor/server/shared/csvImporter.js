const request = require('request');
const config = require('config');
const logger = require(__base + '../config/logger');
const csvParse = require('csv-parse');
const fs = require('fs');
const path = require('path');
const uuidV4 = require('uuid/v4');
const format = require('string-format');
const lockFile = require('lockfile');
const execSync = require('child_process').execSync;
const ErrorWithStatusCode = require(__base + 'shared/models/errorWithStatusCode');

const STATION_UNDEFINED = 'MR-UNDEFINED';
const CSV_HEAD = '"template_display_name","display_name","address","station_display_name","model","lat","lng","serial_number","notes"';

module.exports = {
  process: function (filePath, auditLogger, user) {
    return new Promise((resolve, reject) => {
      try {

        // PROCESS ACTIVITY
        const bulkImportReportPath = config.get('BulkImportReportPath');
        const bulkImportReportFilePath = path.join(bulkImportReportPath, 'report.json');
        const bulkImportLockFilePath = path.join(bulkImportReportPath, 'report.lock');

        // wait 30s before lock is considered to have expired
        lockFile.lock(bulkImportLockFilePath, { stale: 30000 }, function (err) {

          try {

            if (err) {
              throw err;
            }

            let bulkImportReport = {
              processing: true,
              date: new Date(),
              message: "",
              logs: []
            };

            // validate the CSV format
            // if (!validateCSV(filePath)) {
            //   const validationMessage = 'CSV file format is not valid';
            //   const error = new Error(validationMessage);
            //   handleProcessError(error, bulkImportReport);
            //   return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: ' + error }));
            // }

            // empty previous import report
            fs.writeFileSync(bulkImportReportFilePath, JSON.stringify(bulkImportReport));

            // delete icinga undefined data
            deleteIcingaUndefinedData()
              .then(function () {

                // retireve icinga data
                Promise
                  .all(requestIcingaData())
                  .then(function (responses) {
                    const hosts = responses[0];
                    const hostgroups = responses[1];
                    const templates = responses[2];

                    // get the csv content
                    const csvText = fs.readFileSync(filePath, 'utf-8');

                    // parse the csv
                    csvParse(csvText, { quote: '"', delimiter: ',', columns: true }, (err, records) => {
                      try {

                        if (err) {
                          throw err;
                        }

                        // generate the files
                        const writeFilePromises = writeFilesFromCsvData(records, templates, hosts, hostgroups);

                        // when all filePromises resolve update the report and resolve the process
                        let successfullImportRecords = [];
                        Promise
                          .all(writeFilePromises)
                          .then(values => {
                            try {

                              // restart icinga
                              const command = config.get("BulkImportCommand");

                              /* The child_process.execSync() method is generally identical to child_process.exec() with the exception that the method will not return until the child process has fully closed.
                               * When a timeout has been encountered and killSignal is sent, the method won't return until the process has completely exited.
                               * Note that if the child process intercepts and handles the SIGTERM signal and doesn't exit, the parent process will wait until the child process has exited.
                               * If the process times out, or has a non-zero exit code, this method will throw. The Error object will contain the entire result from child_process.spawnSync().
                               * https://nodejs.org/api/child_process.html#child_process_child_process_execsync_command_options
                               */
                              const stdout = execSync(command, { timeout: 5 * 60 * 1000 }); // milliseconds

                              // update the report
                              values.forEach(function (value) {
                                if (value.success) {
                                  successfullImportRecords.push(value.record);
                                }
                                if (value.message) {
                                  bulkImportReport.logs.push({ message: value.message });
                                }
                              });

                              bulkImportReport.message = format("{0} of {1} devices imported", successfullImportRecords.length, records.length);
                              bulkImportReport.processing = false;
                              fs.writeFileSync(bulkImportReportFilePath, JSON.stringify(bulkImportReport));

                              lockFile.unlock(bulkImportLockFilePath, function (err) {
                                if (err) {
                                  logger.error(err);
                                }
                              });

                              // delete the uploaded CSV file
                              fs.unlink(filePath, function (err) {
                                if (err) {
                                  logger.error(err);
                                }
                              });

                              // { date: bulkImportReport.date, message: bulkImportReport.message })
                              auditLogger.logBulkImport(user, auditLogger.TYPE_DEVICE, bulkImportReport);

                              successfullImportRecords.forEach(function (record) {
                                record.id = record.name;
                                auditLogger.logCreate(user, auditLogger.TYPE_DEVICE, record);
                              });

                              // resolve the *process*
                              resolve();

                            } catch (e) {
                              handleProcessError(e, bulkImportReport);
                              reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Unable to complete the process: ' + e }));
                            }
                          },
                          error => {
                            handleProcessError(e, bulkImportReport);
                            reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Unable to write files: ' + e }));
                          })
                          .catch((e) => {
                            handleProcessError(e, bulkImportReport);
                            reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Unable to write files: ' + e }));
                          }); // close writeFiles

                      } catch (e) {
                        handleProcessError(e, bulkImportReport);
                        return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Generic error: ' + e }));
                      }
                    }); // close CSVParse

                  },
                  function (e) {
                    handleProcessError(e, bulkImportReport);
                    reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Unable to retrieve icinga data: ' + e }));
                  })
                  .catch(function (e) {
                    handleProcessError(e, bulkImportReport);
                    reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Unable to retrieve icinga data: ' + e }));
                  }); // close retrieve icinga data

              },
              function (e) {
                handleProcessError(e, bulkImportReport);
                reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Unable to delete icinga data: ' + e }));
              })
              .catch(function (e) {
                handleProcessError(e, bulkImportReport);
                reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Unable to delete icinga data: ' + e }));
              }); // close delete icinga undefined data

          } catch (e) {
            handleProcessError(e, bulkImportReport);
            reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Generic error: ' + e }));
          }

        }); // close lock
        // END PROCESS ACTIVITY

      } catch (e) {
        handleProcessError(e, bulkImportReport);
        return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::process: Generic error: ' + e }));
      }
    });
  },

  getReport: function () {
    return new Promise((resolve, reject) => {
      try {

        const bulkImportReportPath = config.get('BulkImportReportPath');
        const bulkImportReportFilePath = path.join(bulkImportReportPath, 'report.json');

        fs.readFile(bulkImportReportFilePath, 'utf8', function (err, reportStr) {
          try {

            if (err) {
              throw err;
            }

            return resolve(JSON.parse(reportStr));

          } catch (e) {
            logger.error(e);
            return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::getReport: Generic error: ' + e }));
          }
        });

      } catch (e) {
        logger.error(e);
        return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::getReport: Generic error: ' + e }));
      }
    });
  }
}


// function validateCSV(csvFilePath) {
//   let isValid = false;

//   try {
//     const QUOTED_VALUE = "\"[^\"]*\""; // A double quote character, zero or more non-double quote characters, and another double quote
//     const NEWLINE = "(\n|\n\r|\r\n)";  // A newline for (almost) any OS: Windows, *NIX or Mac
//     const LINE = "(" + QUOTED_VALUE + ")" +   // Capture the first value
//       "(?:," +                       // Start a group, a comma
//       "(" + QUOTED_VALUE + ")" + // Capture the next value
//       ")*";                        // Close the group.  Allow zero or more of these

//     const regexString = "^" +      // The beginning of the string
//       LINE +            // Read the first line, capture its values
//       "(?:" + NEWLINE + // Start a group for the remaining lines
//       LINE +            // Read more lines, capture their values
//       ")*" +            // Close the group.  Allow zero or more
//       NEWLINE + "$";    // A trailing newline, the end of the input

//     const regex = new RegExp(regexString);

//     // get the csv content
//     const csvText = fs.readFileSync(csvFilePath, 'utf-8');

//     isValid = regex.test(csvText);  // Check the regexp
//     isValid &= csvText.search(CSV_HEAD) == 0; // Check the CSV head

//   } catch (e) {
//     logger.error(e);
//   }

//   return isValid;
// }

function requestIcingaData() {
  const icingaConfig = config.get('Icinga');
  const baseUrl = icingaConfig.URI;
  const authSegment = icingaConfig.Auth.split(':');
  const icingaEndpoints = [
    icingaConfig.EndpointHosts + '?filter=\"solari-monitor\" in host.templates',
    icingaConfig.EndpointHostGroups + '?filter=match(\"LEVEL*\",hostgroup.vars.custom.type)',
    icingaConfig.EndpointHosts + '?filter=\"DUMMY-HOSTS\" in host.groups'
  ];

  let promises = [];
  icingaEndpoints.forEach(function (endpoint) {
    promises.push(
      new Promise(function (resolve, reject) {
        try {
          request({
            url: baseUrl + endpoint,
            method: 'GET',
            auth: {
              user: authSegment[0],
              pass: authSegment[1]
            },
            strictSSL: false,
            rejectUnhauthorized: false,
            json: true,
          }, function (error, response, body) {

            if (error)
              return reject(error);

            if (response.statusCode != 200 && response.statusCode != 404)
              return reject({ statusCode: response.statusCode, body: body });

            if (!body.results) {
              return reject({ statusCode: response.statusCode, body: body });
            }

            let list = body.results || []
            list = list.map(function (el) {
              return el.attrs;
            });

            resolve(list);

          })
        } catch (e) {
          logger.error(e);
          reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::requestIcingaData: Generic error: ' + e }));
        }

      })
    )
  })

  return promises;
};

function writeFilesFromCsvData(records, templates, hosts, hostgroups) {
  // get the template host
  const templateHost = fs.readFileSync(config.get('IcingaHostTemplateFilePath'), 'utf-8');
  const templateHostServiceDefaults = fs.readFileSync(config.get('IcingaHostServiceDefaultsFilePath'), 'utf-8');

  let templateDisplayNameToObjDict = {};
  templates.map(function (template) {
    const templateDisplayName = template.vars.custom.template_display_name.toUpperCase();
    templateDisplayNameToObjDict[templateDisplayName] = template;
  });

  let hostgroupDisplayNameToObjDict = {};
  hostgroups.forEach(function (hostgroup) {
    const hostGroupDisplayName = hostgroup.display_name.toUpperCase();
    hostgroupDisplayNameToObjDict[hostGroupDisplayName] = hostgroup;
  });

  let hostSerialNumbers = [];
  hosts.forEach(function (host) {
    if (host.vars.config) {
      hostSerialNumbers.push(host.vars.config.serial_number);
    }
  });

  let writeFilePromises = []
  records.forEach(function (record, idx) {

    record.name = uuidV4();

    const hostConfigFilePath = path.join(config.get('BulkImportOutputPath'), record.name + '.conf')

    writeFilePromises.push(
      new Promise(function (resolve, reject) {
        try {

          const templateDisplayName = record.template_display_name;
          const stationDisplayName = record.station_display_name;

          const template = templateDisplayNameToObjDict[templateDisplayName.toUpperCase()];
          let templateName;
          if(template) {
            templateName = template.vars.custom.template_name;
          }

          const station = hostgroupDisplayNameToObjDict[stationDisplayName.toUpperCase()];
          let stationName;
          if(station) {
            stationName = station.name;
          }

          if (!templateName) {
            return resolve({ success: false, message: format("Row #{0} NOT IMPORTED because Template '{1}' doesn't exist", idx + 1, templateDisplayName), record: record });
          }

          // check the serial number, if already present skip the record
          if (hostSerialNumbers.includes(record.serial_number)) {
            return resolve({ success: false, message: format("Row #{0} NOT IMPORTED because Serial Number '{1}' already present", idx + 1, record.serial_number), record: record });
          }

          record.os = template ? template.vars.os : null;
          record.faces = template ? template.vars.faces : null;
          record.template_name = templateName;
          record.station_name = stationName ? stationName : STATION_UNDEFINED;
          record.maintainer_group_ids = record.maintainer_group_ids || "[]";
          record.template_services_value = template && record.os == 'Linux' ? templateHostServiceDefaults : "[]";
          record.notes = record.notes.replace(/\\/g, '').replace(/"/g, '\\"');

          const hostConf = format(templateHost, record);

          // write the file
          fs.writeFile(hostConfigFilePath, hostConf, (err) => {
            try {
              if (err) {
                throw err;
              }

              if (!stationName) {
                return resolve({ success: true, message: format("Row #{0} IMPORTED without Station '{1}'", idx + 1, stationDisplayName), record: record });
              }

              // resolve the *writeFilePromise* with success
              resolve({ success: true, record: record });

            } catch (e) {
              logger.error(err);
              return resolve({ success: false, message: err, record: record });
            }
          });

        } catch (e) {
          resolve({ success: false, message: 'CSVImporter::writeFilesFromCsvData: Generic error: ' + e, record: record });
        }
      })
    );
  });

  return writeFilePromises;
}

// Delete icinga2 host associated to *MR-UNDEFINED* hostgroups
function deleteIcingaUndefinedData() {
  const icingaConfig = config.get('Icinga');
  const baseUrl = icingaConfig.URI;
  const authSegment = icingaConfig.Auth.split(':');
  const endpoint = icingaConfig.EndpointHosts + '?filter=\"MR-UNDEFINED\" in host.groups&cascade=1';

  const promise = new Promise(function (resolve, reject) {
    try {
      request({
        url: baseUrl + endpoint,
        method: 'DELETE',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        json: true,
      }, function (error, response, body) {

        if (error)
          return reject(error);

        if (response.statusCode != 200 && response.statusCode != 404)
          return reject({ statusCode: response.statusCode, body: body });

        if (!body.results) {
          return reject({ statusCode: response.statusCode, body: body });
        }

        resolve();

      })
    } catch (e) {
      logger.error(e);
      reject(new ErrorWithStatusCode({ statusCode: 500, message: 'CSVImporter::deleteIcingaUndefinedData: Generic error: ' + e }));
    }

  });

  return promise;
}

function handleProcessError(error, bulkImportReport) {
  logger.error(error);

  const bulkImportReportPath = config.get('BulkImportReportPath');
  const bulkImportReportFilePath = path.join(bulkImportReportPath, 'report.json');
  const bulkImportLockFilePath = path.join(bulkImportReportPath, 'report.lock');

  // write report
  bulkImportReport.message = "Unable to complete import";
  bulkImportReport.processing = false;
  bulkImportReport.logs.push({ message: error.message });
  fs.writeFile(bulkImportReportFilePath, JSON.stringify(bulkImportReport), function (err) {
    if (err) {
      logger.error(err);
    }
  });

  // unlock file
  lockFile.unlock(bulkImportLockFilePath, function (err) {
    if (err) {
      logger.error(err);
    }
  });
};
