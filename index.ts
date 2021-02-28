import * as Discord from 'discord.js'
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const hasMentionedBot=(message)=>{
    // mentions.some()
}

client.on('message', message => {
//   if()
});

client.login('ODA5NDMyMjk1Nzc2ODQ1ODI0.YCVAkQ.NgYGRlVaLcVlbwqDLbM_CWUD1M0');