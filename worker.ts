import * as Discord from 'discord.js'
import * as config from './config.json'

export class Worker{
  client:Discord.Client= new Discord.Client()

  constructor(){
   
  }

  async init(){
    this.client.on('ready',this.onReady.bind(this));
    this.client.on('message', this.onMessage.bind(this));
    try{
      await this.client.login();
    }catch(e){
      console.error(e)
    }
  
  }

  filter(message: Discord.Message):Boolean{
     return false
  }

  onReady (){
    console.log(`Logged in as ${this.client.user.tag}!`);
  }

  onMessage(message: Discord.Message){
    if (this.filter(message)){
      this.act(message)
    }
  }

  async act(message: Discord.Message){
  }

}

