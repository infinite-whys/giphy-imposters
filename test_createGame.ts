import * as Discord from 'discord.js'

import {CreateGame} from './modules/lounge'

const client = new Discord.Client();

const test=async()=>{
    await client.login('ODA5NDMyMjk1Nzc2ODQ1ODI0.YCVAkQ.NgYGRlVaLcVlbwqDLbM_CWUD1M0');
    const guild=await client.guilds.fetch('771351015894941706')
    const loungeChannel= await client.channels.fetch('815534771676381194',true) as Discord.TextChannel
    const testMessage=new Discord.Message(
        client,
        {
            id:'12345'
        },
        loungeChannel
    )
    
    testMessage.mentions=new Discord.MessageMentions(testMessage,[client.user],[],false)
    
    // createGame(client,testMessage) 
}

test()