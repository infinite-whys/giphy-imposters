const { ShardingManager } = require('discord.js');

import * as config from './config.json'

const manager = new ShardingManager(`${__dirname}/modules/lounge.js`, { 
    token:config.token
});

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();