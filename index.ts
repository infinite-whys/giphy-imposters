/* 
This is the entrypoint of the bot
*/

const { ShardingManager } = require('discord.js');

import { createAndAccessSecret } from './modules/secret'

// You can hard code the discord token here for testing
// Not recommended for production
const discordToken:string|null=null

const main = (token: string) => {
    const manager = new ShardingManager(`${__dirname}/modules/lounge.js`, { token });

    manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

    manager.spawn();
}

if(discordToken){
    main(discordToken)
}else{
    createAndAccessSecret().then(main).catch(console.error)
}
