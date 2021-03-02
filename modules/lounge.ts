import {Message, TextChannel,MessageEmbed} from 'discord.js'

import {Worker} from './worker'
import {Game} from './game'

const channels:{[key:string]:Game} ={}  // key = the IDs of the channels that have a game running already

export class CreateGame extends Worker{
    filter(message:Message){
        const met=message.mentions.has(this.client.user)
        && message.content.toLowerCase().endsWith('create')
        && message.channel.type=='text'
        return met
    }

    async act(message:Message){
        try{
            console.log(`Creating Game in channel ${message.channel.id}`)
            if(Object.keys(channels).includes(message.channel.id)){
                message.channel.send([
                    'A game has already been created in this channel. ',
                    `- Use "<@${this.client.user.id}> start" to restart the game with the same players`,
                    `- Or, "<@${this.client.user.id}> close" to close the existing game`
                ].join('\n')
                )
                return
            }else{
                const game=new Game(message.channel.id,message.channel as TextChannel)
                channels[message.channel.id.toString()]=game
                game.init()
            }
        }catch(e){
            console.log(e)
        }
    }
}

export class CloseGame extends Worker{
    filter(message:Message){
        const met=message.mentions.has(this.client.user)
        && message.content.toLowerCase().endsWith('close')
        return met
    }

    async act(message:Message){
        try{
            console.log(`Closing Game in channel ${message.channel.id}`)
            if(Object.keys(channels).includes(message.channel.id)){
                channels[message.channel.id].close()
                delete channels[message.channel.id]
                message.channel.send('The game has been closed for this channel')
            }else{
                message.channel.send('No game has been found for this channel')
            }
           
        }catch(e){
            console.log(e)
        }
    }
}

export class GameHelp extends Worker{
    constructor(){
        super()
        
    }
    filter(message:Message){
        const met=(message.mentions.has(this.client.user)||message.channel.type=='dm')
        && message.content.toLowerCase().endsWith('help')
        return met
    }

    async act(message:Message){
        try{
            const helpMessage = new MessageEmbed({
                color: '#0099ff',
                title:  'Welcome to Gif Imposters!',
                description: [
                    '**Game Rules**',
                    ['Gif Imposters is a game for three or more players.',
                     'In each game, one or more imposters will be hidden among the players.',
                     'They are trying to steal the secret *word*  from other team mates'
                    ].join(' '),   
                    null,
                    '- All the players will be given a word at the beginning of the game, *except* the imposters.',
                    '- During the game, you can only use Gifs to describe the word. The the chosen Gif cannot contain the exact word in question.',
                    '- The imposters win by successfully guessing the word (or by misleading other players so they cannot win).',
                    '- And other players (the team mates) win by finding out who the imposters are.'
                ].join('\n'),
                fields: [
                    { name: 'Create a new game', value: `Type "<@${this.client.user.id}> create" in any text channel`},
                    { name: 'Join an existing game', value:`The player who wants to join types "<@${this.client.user.id}> join" in the channel, where a game has been created`},
                    { name: 'Start the game', value: `Type "<@${this.client.user.id}> start" in the channel where sufficient players have gathered`},
                    { name: 'Restart the game with the same players', value: `Type "<@${this.client.user.id}> start" again`},
                    { name: 'Leave a game', value: `The player who wants to leave types "<@${this.client.user.id}> leave". You can only leave before a game starts or restarts.`},
                    { name: 'Close a game for a channel', value: `Type "<@${this.client.user.id}> close"`},
                ]
            });
            message.channel.send(helpMessage)
        }catch(e){
            console.log(e)
        }
    }
}

new CreateGame().init()
new CloseGame().init()
new GameHelp().init()
  

 
