const { App } = require('@slack/bolt');
const fs = require('fs/promises');
const { list, describe } = require('./pm2-helper');
const { timeSince } = require('./utils');
const path = require('path');
const pmx = require('pmx');
const exec = require('shelljs').exec;


const configFile = pmx.initModule();

const confirmStopServer = require('./src/confirmation.json');
const helpMessage = require('./src/help-message.json');
const reloadButton = require('./src/button-reload.json');


const adminUsers = configFile["SLACK_ADMIN_USERS"].split(' ');

const app = new App({
  token: configFile["SLACK_BOT_TOKEN"],
  signingSecret: configFile["SLACK_SIGNING_SECRET"],
  port: configFile["SLACK_PORT"] || 6666
});


app.message('hi', async ({ message, say }) => {
  await say(`Hey there <@${message.user}>!\nIf you want to see the list of available commands type in chat: "help"`);
});

app.message('help', async ({ say }) => {
  await say(helpMessage);
});

app.message('emergency_stop', async ({ say }) => {
  await say(confirmStopServer)
});

app.message('list', async ({ say }) => {
  const status = {
    online: "\u{1F7E2}",
    stopping: "\u{1F6AB}",
    stopped: "\u{1F6AB}",
    launching: "\u{267B}",
    errored: "\u{1F198}",
  };

  let { err, response } = await list();
  if (err) return await say(err);

  const answer = {
    "text": "List of Processes",
    "blocks": []
  }
  for (const proc of response) {
    answer.blocks.push({
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": `${proc.name === 'pm2-slack-plus' ? proc.name + ' - MODULE' : proc.name}`,
        "emoji": true
      }
    },
      {
        "type": "section",
        "fields": [
          {
            "type": "mrkdwn",
            "text": `*Status:* ${proc.pm2_env.status} ${status[proc.pm2_env.status] || ""}`
          },
          {
            "type": "mrkdwn",
            "text": `*Uptime:* ${proc.pm2_env.status === "online" ? timeSince(proc.pm2_env.pm_uptime) : '0'}`
          },
          {
            "type": "mrkdwn",
            "text": `*MEM:* ${Math.round(proc.monit.memory / 1024 / 1024)}Mb`
          },
          {
            "type": "mrkdwn",
            "text": `*Restarts Count:* ${proc.pm2_env.restart_time}`,
          },
          {
            "type": "mrkdwn",
            "text": `*CPU:* ${proc.monit.cpu} %`
          },
          {
            "type": "mrkdwn",
            "text": `*ID:* ${proc.pm_id}`
          },
        ]
      }
    )
    // if (proc.pm2_env.status === "errored") {
    //   answer.blocks.push()
    // }
  }
  answer.blocks.push(reloadButton);
  await say(answer)
}
);

app.action('button-reload', async ({ body, ack, say }) => {
  await ack();

  if (!adminUsers.find(user => user === body.user.id)) {
    await say(`<@${body.user.name}> has no permissions to reload.`);
    return;
  }

  // const response =  await restart('app');

  const { err, response } = await describe('app');

  if (!response) {
    await say('App is not running. Please start ecosystem manually.')
    return;
  }

  const serverPath = path.resolve(response?.pm2_env?.pm_cwd);
  const child = exec(`cd ${serverPath}; pm2 reload ecosystem.config.js`, { async: true });

  child.stdout.on('end', async function () {
    await say('Reloaded.');
  });
});

app.message('thx', async ({ message, say }) => {
  await say(`You're welcome <@${message.user}>!`);
});


app.action({ callback_id: 'stop_ecosystem' }, async ({ body, ack, say }) => {
  await ack();

  if (!adminUsers.find(user => user === body.user.id)) {
    await say(`<@${body.user.name}> has no permissions to reload.`);
    return;
  }

  const { err, response } = await describe('app');

  if (!response) {
    await say('App is not running. Please start ecosystem manually.')
    return;
  }

  const serverPath = path.resolve(response?.pm2_env?.pm_cwd);
  const child = exec(`cd ${serverPath}; pm2 stop ecosystem.config.js`, { async: true });

  await say('Process stopped.');
});


app.message('info_app', async ({ message, client, say }) => {

  const filePath = '/home/kulak/work/website/server/logs/';

  const template = {
    "text": "Strapi Logs",
    "type": "modal",
    "submit": {
      "type": "plain_text",
      "text": "Submit",
      "emoji": true
    },
    "close": {
      "type": "plain_text",
      "text": "Cancel",
      "emoji": true
    },
    "title": {
      "type": "plain_text",
      "text": "List of logs",
      "emoji": true
    },
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Pick a log from the dropdown"
        },
        "accessory": {
          "type": "multi_static_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Select log",
            "emoji": true
          },
          "options": [],
          "action_id": "multi_static_select_logs"
        }
      }
    ]
  }

  try {
    const files = await fs.readdir(filePath);
    for (const file of files) {
      template.blocks[0].accessory.options.push({
        "text": {
          "type": "plain_text",
          "text": `${file}`,
          "emoji": true
        },
        "value": `${file}`
      });
    }
  } catch (err) {
    console.error(err);
  }

  await say(template);


});

app.action({ action_id: "multi_static_select_logs" }, async ({ ack, action, body, say, client }) => {
  await ack();
  let finalOptions = [];
  action.selected_options.forEach(option => finalOptions.push(option.value));
  await say(`<@${body.user.id}> selected: ${finalOptions}`);
  await Promise.all(finalOptions.map(async (option) => {
    try {
      const date = new Date();
      const filePath = configFile["LOGS_PATH"] + option;
      const data = await fs.readFile(filePath);
      await client.files.upload({ file: data, channels: body.channel.id, title: date.toLocaleString(), filename: option, token: configFile["SLACK_BOT_TOKEN"] });
    } catch (err) {
      console.log(err);
    }
  }))
});


module.exports = app;