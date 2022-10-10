const pm2 = require('pm2');

const connectAsync = () => {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

const listAsync = () => {
  return new Promise((resolve, reject) => {
    pm2.list((err, processDescriptionList) => {
      if (err) reject(err);
      resolve(processDescriptionList);
    });
  });
};

const restartAsync = (process) => {
  return new Promise((resolve, reject) => {
    
    pm2.actionFromJson('restartProcessId', process, 'file', (err, proc) => {
      if (err) reject(err);
      resolve(proc);
    });
    
    // pm2.restart(process, (err, proc) => {
    //   if (err) reject(err);
    //   resolve(proc);
    // });
  });
};

const describeAsync = (process) => {
  return new Promise((resolve, reject) => {
    pm2.describe(process, (err, proc) => {
      if (err) reject(err);
      resolve(proc[0]);
    });
  });
};

async function list() {
  try {
    await connectAsync();

    let response = await listAsync();

    return { err: undefined, response };
  } catch (err) {
    return { err, response: undefined };
  } finally {
    pm2.disconnect();
  }
}

async function restart(process) {
  try {
    await connectAsync();
    let _test = await describeAsync(process);
    if (_test.pm2_env.pm_exec_path == module.parent.parent.filename) {
      throw Error("Can not restart PM2 BOT");
    }
    let response = await restartAsync(process);
    return { err: undefined, response };
  } catch (err) {
    return { err, response: undefined };
  } finally {
    pm2.disconnect();
  }
}

/**
 * Returns various information about a process: eg what stdout/stderr and pid files are used.
 *
 * @export
 * @param {(string|number)} process
 * @returns {Promise<restartResponse>}
 */
async function describe(process) {
  try {
    await connectAsync();
    let response = await describeAsync(process);
    return { err: undefined, response };
  } catch (err) {
    return { err, response: undefined };
  } finally {
    pm2.disconnect();
  }
}
module.exports = { list, restart };