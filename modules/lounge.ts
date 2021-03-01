import {Message} from 'discord.js'

import {Worker} from '../worker'
import {Game} from './game'

import * as config from '../config.json'

const makeid=(length:number)=>{
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

export class CreateGame extends Worker{
    filter(message:Message){
        const met=message.channel==this.loungeChannel 
        && message.mentions.has(this.client.user)
        && message.content.toLowerCase().endsWith('create')
        return met
    }

    async act(message:Message){
        console.log('Creating Game')
        try{
            const category=await this.client.channels.fetch(config.categoryID,true)
            const channelName=`${config.gamePrefix}-${makeid(6)}`
            const gameChannel=await message.guild.channels.create(channelName,{
                parent:category
            } )
            message.channel.send(`Created new game - join <\#${gameChannel.id}> to play`)
            new Game(gameChannel.id).init()
        }catch(e){
            console.log(e)
        }
    }
}

new CreateGame().init()
  

 
