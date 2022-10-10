const { App } = require('@slack/bolt');
const { list, restart } = require('./pm2-helper');
const { timeSince } = require('./utils');
require('dotenv').config();
// const exec = require('shelljs').exec;
const path = require('path');


const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.SLACK_APP_PORT || 6666
});

// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say(`Hey there <@${message.user}>!\nIf you want to see the list of available commands type in chat: "help"`);
});

app.message('help', async ({ message, say }) => {
  await say(`*List of available commands:*\ntype 'list' - to see the list of PM2 processes`);
});

app.message('list', async ({ message, say }) => {
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
        "text": `${proc.name}`,
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
    })
    if (proc.pm2_env.status !== "online") {
      answer.blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `To reload *ecosystem.config* click the button: `
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Start",
            "emoji": true
          },
          "value": `${proc.name}`,
          "action_id": `button-reload`
        }
      })
    }
  }
  await say(answer)
}
);

app.action('button-reload', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  
  await say(`<@${body.user.id}> clicked the button\nHe wants to restart ecosystem`);

  // console.log('Restart response: ', response);
  const configPath = path.join(process.env.PWD, 'ecosystem.config.js');
  const response =  await restart('ecosystem.config.js');
//  = path.resolve(__dirname, 'ecosystem.config.js');
  console.log(response);
});

app.message('thx', async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say(`You're welcome <@${message.user}>!`);
});


module.exports = app;