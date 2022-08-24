# Gif Imporsters

Gif Imposters is a game for three or more players. In each game, one or more imposters will be hidden among the players. They are trying to steal the secret word from other team mates

- All the players will be given a word at the beginning of the game, except the imposters.
- During the game, you can only use Gifs to describe the word. The the chosen Gif cannot contain the exact word in question.
- The imposters win by successfully guessing the word (or by misleading other players so they cannot win).
- And other players (the team mates) win by finding out who the imposters are.

## How to play

### Create a new game
Type `@Gif-Imposters create` in a text channel the bot has access to. The bot will create a game room in the current channel.

### Join an existing game
After a game room is created, the players can type in `@Gif-Imposters join` in the same channel to join the game

### Start the game
Type `@Gif-Imposters start` in the channel when sufficient players have gathered

### Restart the game with the same players
Type `@Gif-Imposters start` again

### Leave a game
The player who wants to leave types `@Gif-Imposters leave`. You can only leave before a game starts or restarts.

### Close a game for a channel
Type `@Gif-Imposters close`

## Build 

If you want to build the game yourself, you need to,
1. Get a token for your Discord server
2. Configure the token in the programme
3. Build the typescript programme and export the javascript files for deployment

### Configure the token in the programme

You can either hard-code the token (not recommended for production), or, use the Google Secret Manager module that is already built in. 

- Hard-code Discord token: Simply replace the `null` value of `discordToken` in `index.ts`
- Use Google Secret Manager: TBD

### Build Typescript

1. Run `npm install`, which should install the command line tool for Typescript 

2. Then you can use `npm run build` to build Typescript files 

If you use VS Code, the build task is already configured before running the "Launch" debug job. 

## Debug

In VS Code, run the "Launch" debug job.

## Deploy

You can deploy the files in the `build` folder wherever you host your Discord bot. Or, you can deploy to App Engine directly using `app.yaml`.

## File Structure

- `index.ts`: The entrypoint of the bot.
- `config.json`: Where you can configure the secret ID if you use Google Secret Manager.
- `modules`:
    - `lounge.ts`: Creating the lounge of the game including three worker shards: CreateGame, GameHelp and CloseGame.
    - `game.ts`: The worker for each game room.
    - `worker.ts`: A utility module for worker shards.
    - `secret.ts`: A utility module for Google Secret Manager. 
- `assets\words.txt`: All the available words. Can be extended.
- `.vscode`: VS Code Tasks and Debug configurations. 
- `tsconfig.json`: Configurations for TypeScript
- `package.json`: Configurations for this node package
- `app.yaml`: Configurations for App Engine, if used







