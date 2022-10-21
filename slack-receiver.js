const { App } = require('@slack/bolt');
const { list, restart, describe } = require('./pm2-helper');
const { timeSince } = require('./utils');
const path = require('path');
const pmx = require('pmx');
const exec = require('shelljs').exec;

const configFile = pmx.initModule();


const adminUsers = ['U045UMM99FC', 'U044B66LTUZ'];

const app = new App({
  token: configFile["SLACK_BOT_TOKEN"],
  signingSecret: configFile["SLACK_SIGNING_SECRET"],
  port: configFile["SLACK_PORT"] || 6666
});

app.message('hi', async ({ message, say }) => {
  await say(`Hey there <@${message.user}>!\nIf you want to see the list of available commands type in chat: "help"`);
});

app.message('help', async ({ message, say }) => {
  await say(`*List of available commands:*\ntype 'list' - to see the list of PM2 processes\ntype 'emergency_stop' - to stop PM2 processes`);
});

app.message('emergency_stop', async ({ message, say }) => {
  await say({
    "text": "Are you sure you want to stop ecosystem.config file?",
    "attachments": [
      {
        "text": "Please confirm",
        "fallback": "Confirm stop",
        "callback_id": "stop_ecosystem",
        "color": "#3AA3E3",
        "attachment_type": "default",
        "actions": [
          {
            "name": "game",
            "text": "Thermonuclear War",
            "style": "danger",
            "type": "button",
            "value": "stop_ecosystem_confirm",
            "confirm": {
              "title": "Are you sure?",
              "text": "This will stop server process.",
              "ok_text": "Yes",
              "dismiss_text": "No"
            }
          }
        ]
      }
    ]
  })
});

app.action('stop_ecosystem_confirm', async ({ body, ack, say }) => {
  await ack();

  console.log('Body:', body);
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
  answer.blocks.push(
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `Force reload *ecosystem.config* : `
      },
      "accessory": {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Reload",
          "emoji": true
        },
        "style": "primary",
        "value": `reload`,
        "action_id": `button-reload`
      }
    })
  await say(answer)
}
);

app.action('button-reload', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();

  await say(`<@${body.user.id}> wants to restart ecosystem`);

  if (!adminUsers.find(user => user === body.user.id)) {
    await say(`But <@${body.user.name}> has no permissions to reload.`);
    return;
  }

  // const response =  await restart('BinaryStrapi');

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
})

app.action({ text: 'View Job' }, async ({ body, ack, say }) => {
  await ack();
  await say(`<@${body.user.id} is viewing deployment info.`)
});


// app.view('stop_ecosystem', async ({ ack, view, say }) => {
//   await ack();

//   await say(`Viewing: , ${view}`)

//   const viewing = view.notify_on_close;
//   const blocks = view.blocks;
//   await say(`${viewing, blocks}`);


//   if (!body) return;
//   await say(`Body: , ${body}`);
//   const isConfirmed = body?.actions.filter(action => action.value === 'stop_ecosystem_confirm')

//   if (isConfirmed) {
//     await say('Action confirmed')
//   }

// });




module.exports = app;