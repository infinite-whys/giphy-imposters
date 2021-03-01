import * as Discord from 'discord.js'


const client = new Discord.Client();

const deleteChannels=async()=>{
    await client.login('ODA5NDMyMjk1Nzc2ODQ1ODI0.YCVAkQ.NgYGRlVaLcVlbwqDLbM_CWUD1M0');
    const loungeChannel= await client.channels.fetch('815534771676381194',true) as Discord.TextChannel
    const guild=await client.guilds.fetch('771351015894941706')
    const channels=Array.from(guild.channels.cache.values())
    channels.forEach(x=>{
        console.log(x.id)
        if(x.name.startsWith('game-') || x.name.startsWith('giphy-imposters-')){
            x.delete()
        }
    })
}

deleteChannels()

const test=async()=>{
    try{
        client.on('message',async (message)=>{
            const c= await client.channels.fetch('815534771676381194',true) as Discord.TextChannel
            c.members.values()
            console.log(c.members.map(member=>member.displayName))
            if(message.author!=client.user){
                message.delete()
            }
        })
        await client.login('ODA5NDMyMjk1Nzc2ODQ1ODI0.YCVAkQ.NgYGRlVaLcVlbwqDLbM_CWUD1M0');
        const c= await client.channels.fetch('815534771676381194',true) as Discord.TextChannel
        c.members.values()
        console.log(c.members.values())
    }
    catch(e){
        console.error(e)
    }
 
}

test()