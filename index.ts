const { ShardingManager } = require('discord.js');

import {createAndAccessSecret} from './modules/secret'


createAndAccessSecret().then(
    (token:string)=>{
        const manager = new ShardingManager(`${__dirname}/modules/lounge.js`, {token});
        
        manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
        
        manager.spawn();
    }
).catch(console.error)
