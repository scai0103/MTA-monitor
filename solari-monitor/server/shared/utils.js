const fs = require('fs');
const path = require('path');
const logger = require(__base + '../config/logger');
const ErrorWithStatusCode = require(__base + 'shared/models/errorWithStatusCode');

module.exports = {
  deleteFilesOlderThan: deleteFilesOlderThan,
  isNullOrUndefined: isNullOrUndefined,
  tryToExtractIcingaErrors: tryToExtractIcingaErrors
};

function deleteFilesOlderThan(tempBaseFolderPath, tempFileLiveTime) {
  try {
    fs.readdir(tempBaseFolderPath, function (err, files) {
      if (err) {
        logger.error(err);
        return;
      }

      files.forEach(function (file, index) {

        const filePath = path.join(tempBaseFolderPath, file);

        // Check if a file is older than 1h and delete it
        fs.stat(path.join(tempBaseFolderPath, file), function (err, stat) {
          if (err) {
            logger.error(err);
            return;
          }

          const now = new Date().getTime();
          const endTime = new Date(stat.ctime).getTime() + tempFileLiveTime;
          if (now > endTime) {
            fs.unlink(filePath, function (err) {
              if (err) {
                logger.error(err);
              }
            })
          }
        })
      })
    })
  } catch (e) {
    logger.error(e);
  }
};

function isNullOrUndefined(object) {
  return object == null || typeof object === 'undefined';
}

function tryToExtractIcingaErrors(responseStatusCode, responseBody) {
  if (!responseBody || !responseBody.results) {
    return new ErrorWithStatusCode({ statusCode: responseStatusCode, message: JSON.stringify(responseBody) });
  }

  if (responseStatusCode != 200) {
    return new ErrorWithStatusCode({ statusCode: responseStatusCode, message: JSON.stringify(responseBody) });
  }

  const result = responseBody.results[0];
  if (!result) {
    return new ErrorWithStatusCode({ statusCode: responseStatusCode, message: JSON.stringify(responseBody) });
  }

  // Da qui in poi gestione del 200 con errore!!!
  if (result.code && result.code != 200) {
    const statusCode = result.code;

    let tmp = [];
    if (result.status) {
      tmp.push(result.status);
    }

    if (result.errors) {
      tmp = tmp.concat(
        result.errors.map((error) => {
          return error;
        })
      );
    }

    const message = tmp.join(',\n');
    return new ErrorWithStatusCode({ statusCode: statusCode, message: message });
  }

  return null;
};
