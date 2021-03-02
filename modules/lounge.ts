import {Message, TextChannel} from 'discord.js'

import {Worker} from '../worker'
import {Game} from './game'

export class CreateGame extends Worker{
    filter(message:Message){
        const met=message.mentions.has(this.client.user)
        && message.content.toLowerCase().endsWith('create')
        return met
    }

    async act(message:Message){
        console.log(`Creating Game in channel ${message.channel.id}`)
        try{
            new Game(message.channel.id,message.channel as TextChannel).init()
        }catch(e){
            console.log(e)
        }
    }
}

new CreateGame().init()
  

 
