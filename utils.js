function timeSince(timestamp) {
  let diff = (new Date().getTime() - parseInt(timestamp)) / 1000;
  let seconds = diff;
  let minutes = 0;
  let hours = 0;
  let days = 0;
  let str = `${Math.abs(Math.round(seconds))}s`;
  if (seconds > 60) {
    seconds = Math.abs(Math.round(diff % 60));
    minutes = Math.abs(Math.round((diff /= 60)));
    str = `${minutes}m ${seconds}s`;
  }
  if (minutes > 60) {
    minutes = Math.abs(Math.round(diff % 60));
    hours = Math.abs(Math.round(diff / 60));
    str = `${hours}h ${minutes}m`;
  }
  if (hours > 24) {
    days = Math.abs(Math.round(hours / 24));
    hours = Math.abs(Math.round(hours % 24));
    str = `${days}d ${hours}h`;
  }
  return str;
}

/**
 * New PM2 is storing log messages with date in format "YYYY-MM-DD hh:mm:ss +-zz:zz"
 * Parses this date from begin of message
 *
 * @param {string} logMessage
 * @returns {{description:string|null, timestamp:number|null}}
 */
 function parseIncommingLog(logMessage) {
  let description = null;
  let timestamp = null;

  if (typeof logMessage === "string") {
      // Parse date on begin (if exists)
      const dateRegex = /([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{1,2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})? [+\-]?[0-9]{1,2}:[0-9]{2}(\.[0-9]{3})?)[:\-\s]+/;
      const parsedDescription = dateRegex.exec(logMessage);
      // Note: The `parsedDescription[0]` is datetime with separator(s) on the end.
      //       The `parsedDescription[1]` is datetime only (without separators).
      //       The `parsedDescription[2]` are ".microseconds"
      if (parsedDescription && parsedDescription.length >= 2) {
          // Use timestamp from message
          timestamp = Math.floor(Date.parse(parsedDescription[1]) / 1000);
          // Use message without date
          description = logMessage.replace(parsedDescription[0], "");
      } else {
          // Use whole original message
          description = logMessage;
      }
  }

  return {
      description: description,
      timestamp: timestamp
  }
}

/**
 * Get pm2 app display name.
 * If the app is running in cluster mode, id will append [pm_id] as the suffix.
 *
 * @param {object} process
 * @returns {string} name
 */
 function parseProcessName(process) {
  return process.name + (process.exec_mode === 'cluster_mode' && process.instances > 1 ? `[${process.pm_id}]` : '');
}


module.exports = { timeSince, parseIncommingLog, parseProcessName };