import * as Discord from 'discord.js'

import {Game} from './game'

const client = new Discord.Client();

const test=async()=>{
    await client.login('ODA5NDMyMjk1Nzc2ODQ1ODI0.YCVAkQ.NgYGRlVaLcVlbwqDLbM_CWUD1M0');

    const guild=await client.guilds.fetch('771351015894941706')

    const gameChannelID='815992624733224960'
    const channel= await client.channels.fetch(gameChannelID,true) as Discord.TextChannel
    const game=new Game('lounge',gameChannelID,channel)

    game.client=client
    await game.init()

    const member=await guild.members.fetch('765584896760086598') as Discord.GuildMember
    const player=new Discord.UserManager(client).resolve(member)

    game.players.push(player)
    
   
    const testMessage=new Discord.Message(
        client,
        {
            id:'12345',
            content:'start game'
        },
        channel
    )
    
    testMessage.mentions=new Discord.MessageMentions(testMessage,[client.user],[],false)
    
    game.startGame(testMessage)
}

test()