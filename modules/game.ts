import * as process from 'process'

import { Worker } from '../worker'
import { Message, User, TextChannel, MessageEmbed } from 'discord.js'

// import { GiphyFetch } from '@giphy/js-fetch-api'

// const gf = new GiphyFetch('nm9JgdHDAeOUF6HmoojvSqOoW1Rf6N89')

import * as config from '../config.json'
import { memory } from 'console'
import { get } from 'https'
import { stat } from 'fs'

const makeid = (length: number) => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

type Identity = 'teammate' | 'imposter' 
type PlayerStatus='alive'|'ghost'
type PlayerState = { 
    playerID: number | string, 
    identity: Identity, 
    status:PlayerStatus
}
type Votes = {
    [key: string]: string
}

export class Game extends Worker {
    channelID: string
    players: Array<User> = []
    channel?: TextChannel
    currentPlayer?: number
    startingPlayer?: number
    word?: string
    status: 'waiting' | 'ongoing' | 'voting' = 'waiting'
    playerStates: Array<PlayerState>=[]
    votes: Votes = {}
    numImposters?:number

    constructor(channelID: string) {
        super()
        this.channelID = channelID
    }

    filter(message: Message) {
        const met = message.channel.id == this.channelID
            && message.author != this.client.user
        return met
    }

    async act(message: Message) {
        this.route(message)
    }

    async route(message: Message) {
        try {
            const lowerCaseContent = message.content.toLowerCase()
            if (message.mentions.has(this.client.user) && lowerCaseContent.endsWith('start')) {
                this.startGame(message)
            } else if (message.mentions.has(this.client.user) && lowerCaseContent.endsWith('join')) {
                this.joinGame(message)
            } else if (message.mentions.has(this.client.user) && lowerCaseContent.endsWith('close')) {
                this.close()
            } else if (this.status == 'ongoing' && this.players[this.currentPlayer] && this.players[this.currentPlayer].id == message.author.id) {
                this.parseGIF(message)
            } else if (this.status == 'ongoing') {
                message.delete()
                const warning = await message.channel.send('Everyone else :shushing_face:')
                setTimeout(() => warning.delete(), 3000)
            } else if (this.status == 'voting') {
                this.parseVote(message)
            } else {
                //test
                const warning = await message.channel.send('Everyone else :shushing_face: (just testing)')
                setTimeout(() => warning.delete(), 3000)
            }
        } catch (e) {
            console.error(e)
        }

    }

    resetGame() {
        this.status = 'waiting'
        this.currentPlayer = null
        this.word = null
        this.playerStates=[]
    }

    async close() {
        if (!this.channel) {
            this.channel = await this.client.channels.fetch(this.channelID, true) as TextChannel
        }
        this.channel.delete()
    }

    getNumImposters() {
        if(!this.numImposters){
            this.numImposters=Math.ceil(this.players.length / 4)
        }else{
            this.numImposters=this.playerStates.reduce(
                (num,state)=>{
                    if(state.identity=='imposter' && state.status=='alive'){
                        num++
                    }
                    return num
                }
            ,0)
        }
        return this.numImposters
    }

    assignIdentity() {
        const imposterIndexes = []
        const numImposters = this.getNumImposters()

        while (imposterIndexes.length < numImposters) {
            const imposterIndex = getRandomInt(0, this.players.length)
            if (!imposterIndexes.includes(imposterIndex)) {
                imposterIndexes.push(imposterIndex)
            }
        }

        this.playerStates = this.players.map((player, i) => {
            let item = {
                playerID: player.id,
                identity: 'teammate',
                status:'alive'
            } as PlayerState
            if (imposterIndexes.includes(i)) {
                item.identity = 'imposter'
            }
            return item
        })
    }

    getPlayerStates(playerID: string | number) {
        return this.playerStates.find(x => x.playerID == playerID)
    }

    setPlayerStatus(playerID:string | number,status:PlayerStatus){
        this.playerStates.find(x => x.playerID == playerID).status=status
    }

    async startGame(message: Message) {
        try {
            if (!this.channel) {
                this.channel = message.channel as TextChannel
                setTimeout(() => {
                    this.channel.delete()
                }, 60 * 60 * 1000)
            }
            this.status = 'ongoing'
            this.word = 'cat'
            this.startingPlayer = getRandomInt(0, this.players.length)
            this.currentPlayer = this.startingPlayer
            this.assignIdentity()
            // 
            this.channel.send('So, the game is about to start, excited?')
            this.channel.send('https://giphy.com/gifs/excited-family-guy-stewie-griffin-7eAvzJ0SBBzHy')
            await this.pause(1)
            // 
            this.channel.send(`There are ${this.players.length} players (${this.getPlayers()}) in the game, ` + 'and one of them is the *imposter*.')
            await this.pause(1)
            const gameStartMessages = [
                '**The Rules of the Game**',
                '```',
                '- All the players will be given a word, except the imposters.',
                '- During the game, you can only use GIFs to describe the word. The the chosen gif cannot contain the exact word as a keyword.',
                '- The imposters win by successfully guessing the word',
                '- And the other players win by finding out who the imposters are.',
                '```'
            ]
            this.channel.send(gameStartMessages.join('\n'))
            const gameStartCountdown = 5
            this.countdown(gameStartCountdown, 'The game will start in')
            await this.pause(gameStartCountdown)
            this.channel.send(`Now the game begins, I've send each of you a DM :love_letter: containing the word, except for the imposter :alien:. Check your private message!`)

            const teammateWelcome = `You are a cheerful teammate. The magic word is **${this.word}**.` +
                'Remember, you should never mention this word directly in the conversations, or use a GIF containing this keyword.'

            const welcomeMessage = {
                teammate: `You are a cheerful team mate. The magic word is **${this.word}**.` +
                    'Remember, you should never mention this word directly in the conversations, or use a GIF containing this keyword.',
                imposter: {
                    singular: 'You are the only imposter in this game. Try to guess the word from the clues other players give.',
                    plural: 'You are an imposter. Try to guess the word from the clues other players give.' +
                        `There are ${this.numImposters} imposters in the game, they are: ${this.getImposters()}`
                }
            }

            this.players.map(
                player => this.sendPrivateMessage(
                    player,
                    this.getPlayerStates(player.id).identity == 'teammate' ?
                        welcomeMessage.teammate :
                        this.numImposters == 1 ?
                            welcomeMessage.imposter.singular :
                            welcomeMessage.imposter.plural
                )
            )
            await this.pause(1)

            this.startTurn()
        } catch (e) {
            console.error(e)
        }

    }

    async startTurn() {
        const player = this.players[this.currentPlayer]
        this.channel.send(`Now it\'s <@${player.id}>'s turn. ${player.username}, use a GIF to describe the word.` +
            ' (If you are the imposter, just pretend you know)')
    }

    async parseGIF(message: Message) {
        try {
            if (message.content.includes(this.word)) {
                message.delete()
                this.channel.send(`:skull_crossbones: You cannot mention the word directly!`)
                return
            }
            if (message.content.endsWith('.gif')) {
                this.channel.send(`:bomb: Please use the GIF button or \`/giphy <keyword>\` to look up for GIFs`)
                return
            }

            if (message.content.includes('giphy.com/gifs/') || message.content.includes('tenor.com/view/')) {
                const chunks = message.content.split('/')
                const lastChunk = chunks[chunks.length - 1]
                if (lastChunk != 'gifs' && lastChunk != 'view') {
                    await this.pause(1)
                    this.nextPlayer()
                    return
                }
            }
        } catch (e) {
            console.error(e)
        }

    }

    async nextPlayer() {
        this.status = 'ongoing'
        let next = this.currentPlayer + 1
        if (next >= this.players.length) {
            next = 0
        }
        this.currentPlayer = next
        if (this.currentPlayer == this.startingPlayer) {
            await this.endOfRound()
        }else{
            this.startTurn()
        }
       
    }

    async endOfRound() {
        this.status = 'voting'
        let seconds = 30
        await this.channel.send('End of this round. Who is an imposter? Mention(@) a player\'s name to vote.' +
            '(If you mention more than one names, the last one will be your final vote.)' +
            `\nYou have ${seconds} seconds to vote`)

        const countdownTimer = setInterval(
            () => {
                seconds -= 10
                if (seconds <= 0) {
                    clearInterval(countdownTimer)
                } else {
                    this.channel.send(`You have ${seconds} seconds to vote`)
                }
            },
            10 * 1000)

        await this.pause(seconds)

        await this.channel.send(`Voting ended. Final votes:`)
        await this.displayVotes()
        const {highestVotes,votedFor,isTie} = this.countVotes()
        this.votes={}
        if(isTie){
            await this.channel.send(`${votedFor.map(id=>`<@${id}>`).join(' ')} received the same number of votes, no one is dead this round`)
        }else{
            await this.channel.send(`<@${votedFor[0]}> received the most number of votes, `)
            await this.pause(1)
            await this.channel.send(this.getPlayerStates(votedFor[0]).identity=='imposter'?`<@${votedFor[0]}> is an imposter`:`<@${votedFor[0]}> is not an imposter`)
            this.setPlayerStatus(votedFor[0],'ghost')
        }

        if(this.getNumImposters()<=0){
            await this.channel.send(`All imposters have been voted out, well done, ${this.getTeammates()}!`)
        }else if(this.hasImpostersWin()){
            await this.channel.send(`Imposters have won the game. Congrats ${this.getImposters()}`)
        }else{
            await this.channel.send(`<@${votedFor[0]}> is a ghost now. Ghost cannot talk, but they can still vote - each of their votes counts as a half vote.`)
            this.startTurn()
        }
        
    }

    async parseVote(message: Message) {
        const mentions = message.mentions
        if (!mentions.everyone && mentions.users.last) {
            const voterID = message.author.id.toString()
            const votedID=mentions.users.last().id.toString()
            if(this.players.some(player=>player.id==votedID)){
                this.votes[voterID] =votedID
                await this.channel.send(`<@${voterID}> has voted. Votes received:`)
                await this.displayVotes()
            }else{
                await this.channel.send(`<@${votedID}> is not part of the game`)
            }
            
        }
    }

    getVotesTransposed() {
        const votesTransposed = Object.entries(this.votes).reduce((votesTransposed, item) => {
            const [voterID, votedID] = item
            if (Object.keys(votesTransposed).includes(votedID)) {
                votesTransposed[votedID].push(voterID)
            } else {
                votesTransposed[votedID] = [voterID]
            }
            return votesTransposed
        }, {} as { [key: string]: Array<string> })
        return votesTransposed
    }

    async displayVotes() {
        this.channel.send(
            Object.entries(this.getVotesTransposed()).map(
                ([votedID, voterIDs]) => `- <@${votedID}>: ${voterIDs.length} votes (from ${voterIDs.map(voterID => `<@${voterID}>`).join(' ')})`
            ).join('\n')
        )
    }

    countVotes() {
        const voteCount = Object.entries(this.getVotesTransposed()).reduce(
            (voteCount, [votedID, voterIDs]) => {
                if (!Object.keys(voteCount).includes(votedID)) {
                    voteCount[votedID] = 0
                }
                voterIDs.forEach(voterID => {
                    voteCount[votedID] += this.getPlayerStates(voterID).status=='ghost'? 0.5 : 1
                })
                return voteCount
            }, {}
        )

        let isTie = false
        let votedFor: Array<string> = []

        const highestVotes = Object.entries(voteCount).reduce(
            (highestVotes, [votedID, votes]) => {
                if (votes > highestVotes) {
                    isTie = false
                    votedFor=[votedID]
                    return votes
                } else if (votes = highestVotes) {
                    isTie = true
                    votedFor.push(votedID)
                    return highestVotes
                } else {
                    return highestVotes
                }
            }, 0)

        return {highestVotes,votedFor,isTie}
    }

    hasImpostersWin(){
        const scores=this.playerStates.reduce(
            (scores,state)=>{
                scores[state.identity]+=state.status=='ghost'? 0.5 : 1
                return scores
            },{imposter:0,teammate:0}
        )
        if(scores.imposter>scores.teammate){
            return true
        }else{
            return false
        }
    }

    pause(seconds: number) {
        const pause = new Promise((resolve, reject) => {
            setTimeout(() => { resolve() }, seconds * 1000)
        })
        return pause
    }

    async countdown(seconds: number = 3, prefix: string = 'In', suffix: string = 'seconds') {
        const message = await this.channel.send(`${prefix} ${seconds} ${suffix}`)
        const countdownTimer = setInterval(
            () => {
                seconds--
                if (seconds <= 0) {
                    clearInterval(countdownTimer)
                    message.delete()
                } else {
                    message.edit(`${prefix} ${seconds} ${suffix}`)
                }
            },
            1000)
    }


    async sendPrivateMessage(player: User, text: string) {
        const channel = await player.createDM()
        channel.send(text)
    }

    async joinGame(message: Message) {
        const player = message.author
        if (!this.players.includes(player)) {
            this.players.push(player)
            await message.channel.send(`:heart_eyes: <@${player.id}> Joined the game. We have ${this.players.length} players (${this.getPlayers()}) in the game.`)
        }
    }

    getPlayers() {
        return this.players.map(player => `<@${player.id}>`).join(' ')
    }

    getImposters() {
        const imposterIDs = this.playerStates.filter(x=>x.identity=='imposter').map(x => x.playerID)
        return this.players.filter(x => imposterIDs.includes(x.id)).map(player => `<@${player.id}>`).join(' ')
    }

    getTeammates() {
        const teammateIDs = this.playerStates.filter(x=>x.identity=='teammate').map(x => x.playerID)
        return this.players.filter(x => teammateIDs.includes(x.id)).map(player => `<@${player.id}>`).join(' ')
    }


}



