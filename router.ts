import * as Discord from 'discord.js'


class GiphyImposters{
  client:Discord.Client= new Discord.Client()
  loungeChannel?:Discord.TextChannel
  constructor(){
   
  }

  async init(){
    this.client.on('ready',this.onReady.bind(this));
    this.client.on('message', this.onMessage.bind(this));

    try{
      await this.client.login();
      this.loungeChannel = await this.client.channels.fetch('815534771676381194', true) as Discord.TextChannel
    }catch(e){
      console.error(e)
    }
  
  }

  onReady (){
    console.log(`Logged in as ${this.client.user.tag}!`);
  }

  onMessage(message: Discord.Message){
    // If this bot user is mentioned
    if (message.channel==this.loungeChannel && message.mentions.has(this.client.user)) {
      this.routeLoungeMessage(message)
    }else if(message.channel.type=='text' && message.channel.name.startsWith('giphy-imposters-')){
      this.routeInGameMessage(message)
    }
  }

  routeLoungeMessage = (message: Discord.Message) => {
    const lowerCaseContent=message.content.toLowerCase()
    if (lowerCaseContent.endsWith('create game')) {
      createGame(this.client,message)
    }
  }

  routeInGameMessage=(message: Discord.Message) => {
    const lowerCaseContent=message.content.toLowerCase()
    if (lowerCaseContent.endsWith('start game')) {
     message.channel.send('starting game')
    }
  }

}

const game=new GiphyImposters()
game.init()