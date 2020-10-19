module.exports = ErrorWithStatusCode;

// Custom Error with Status code parameter. Reference: https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Global_Objects/Error
function ErrorWithStatusCode(obj) {
  this.message = obj.message;
  this.statusCode = obj.statusCode;
  // const last_part = new Error().stack;//.match(/[^\s]+$/);
  // this.stack = `${this.name} at ${last_part}`;
  Error.captureStackTrace(this, this.constructor);
};

Object.setPrototypeOf(ErrorWithStatusCode, Error);
ErrorWithStatusCode.prototype = Object.create(Error.prototype);
ErrorWithStatusCode.prototype.name = "ErrorWithStatusCode";
ErrorWithStatusCode.prototype.statusCode = 500;
ErrorWithStatusCode.prototype.message = "";
ErrorWithStatusCode.prototype.constructor = ErrorWithStatusCode;
