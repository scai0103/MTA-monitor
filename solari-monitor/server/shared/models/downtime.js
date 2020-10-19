module.exports = Downtime;

function Downtime(obj) {
  const self = this;
  self.name = null;
  self.author = null;
  self.comment = null;
  self.startTime = null;
  self.endTime = null;
  self.duration = 0;
  self.fixed = false;
  self.wasCancelled = false;
  self.paused = false;

  Object.keys(obj).forEach((prop, idx) => {
    if (obj.hasOwnProperty(prop) && self.hasOwnProperty(prop)) {
      self[prop] = obj[prop];
    }
  });
};

Downtime.prototype.convertToIcingaDowntime = function() {
  return {
    author: this.author,
    comment: this.comment,
    start_time: this.startTime / 1000,
    end_time: this.endTime / 1000,
    fixed: this.fixed,
    duration: this.duration
  };
};

Downtime.createFromDowntime = function (downtime) {
  return new Downtime({
    name: downtime.name,
    author: downtime.author,
    comment: downtime.comment,
    startTime: downtime.start_time * 1000,
    endTime: downtime.end_time * 1000,
    duration: downtime.duration,
    fixed: downtime.fixed,
    wasCancelled: downtime.was_cancelled,
    paused: downtime.paused
  });
};
