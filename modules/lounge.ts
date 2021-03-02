import {Message, TextChannel} from 'discord.js'

import {Worker} from '../worker'
import {Game} from './game'

export class CreateGame extends Worker{
    channels:{[key:string]:Game} ={}  // key = the IDs of the channels that have a game running already
    filter(message:Message){
        const met=message.mentions.has(this.client.user)
        && message.content.toLowerCase().endsWith('create')
        return met
    }

    async act(message:Message){
        try{
            console.log(`Creating Game in channel ${message.channel.id}`)
            if(Object.keys(this.channels).includes(message.channel.id)){
                message.channel.send([
                    'A game has already been created in this channel. ',
                    `- Use "<@${this.client.user.id}> start" to restart the game with the same players`,
                    `- Or, "<@${this.client.user.id}> close" to close the existing game`
                ].join('\n')
                )
                return
            }else{
                const game=new Game(message.channel.id,message.channel as TextChannel)
                this.channels[message.channel.id.toString()]=game
                game.init()
            }
        }catch(e){
            console.log(e)
        }
    }
}

new CreateGame().init()
  

 
