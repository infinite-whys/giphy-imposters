import { readFileSync } from 'fs'
import { Message, User, TextChannel, MessageEmbed } from 'discord.js'


import { Worker } from './worker'


const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

const getRandomLine = async (filename: string) => {
    const words = readFileSync(filename).toString().split("\n");
    const word = words[getRandomInt(0, words.length)]
    return word
}

type Identity = 'teammate' | 'imposter'
type PlayerStatus = 'alive' | 'ghost' | 'out'
type PlayerState = {
    playerID: number | string,
    identity: Identity,
    status: PlayerStatus
}
type Votes = {
    [key: string]: string
}

export class Game extends Worker {
    channelID: string
    channel: TextChannel
    selfDestroyTimer: NodeJS.Timeout
    players: Array<User> = []
    currentPlayer?: number
    startingPlayer?: number
    word?: string
    status: 'waiting' | 'ongoing' | 'voting' | 'guessing' = 'waiting'
    playerStates: Array<PlayerState> = []
    votes: Votes = {}
    round: number = 1
    numImposters?: number
    guessingPlayerID?: string

    constructor(channelID: string, channel: TextChannel) {
        super()
        this.channelID = channelID
        this.channel = channel
        this.channel.send(':partying_face: :partying_face: :partying_face: **Welcome to Gif Imposters!**')
        this.channel.send('https://giphy.com/gifs/homecoming-samplertimes-scarlett-spider-hsnEe5wHZCsubINYmT')
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
            const mentionedBot = message.mentions.has(this.client.user)
            const currentPlayer = this.players[this.currentPlayer]

            if (mentionedBot && lowerCaseContent.endsWith('start')) {
                this.startGame(message)
            } else if (mentionedBot && lowerCaseContent.endsWith('join')) {
                this.joinGame(message)
            } else if (mentionedBot && lowerCaseContent.endsWith('close')) {
                this.close()
            } else if (mentionedBot && this.status == 'waiting' && lowerCaseContent.endsWith('leave')) {
                this.leave(message)
            } else if (this.status == 'ongoing' && currentPlayer && currentPlayer.id == message.author.id) {
                this.parseGif(message)
            } else if (this.status == 'ongoing') {
                message.delete()
                const warning = await message.channel.send('Everyone else :shushing_face:')
                this.client.setTimeout(() => warning.delete(), 3000)
            } else if (this.status == 'voting' && mentionedBot && lowerCaseContent.endsWith('guess')) {
                this.startGuess(message.author.id)
            } else if (this.status == 'voting') {
                this.parseVote(message)
            } else if (this.status == 'guessing') {
                this.parseGuess(message)
            } else {
                return
            }
        } catch (e) {
            console.error(e)
        }

    }

    resetGame() {
        this.status = 'waiting'
        this.currentPlayer = null
        this.word = null
        this.playerStates = []
        this.round = 1
        this.guessingPlayerID = null
    }

    async joinGame(message: Message) {
        try {
            const player = message.author
            if (!this.players.includes(player)) {
                this.players.push(player)
                this.playerStates.push({
                    playerID: player.id
                } as PlayerState)
                await message.channel.send(`:heart_eyes: <@${player.id}> Joined the game. We have ${this.players.length} players (${this.getPlayersAsString()}) in the game.`)
            }
        } catch (e) {
            console.error(e)
        }

    }

    close() {
        this.resetGame()
        this.client.destroy()
    }

    leave(message: Message) {
        this.players = this.players.filter(player => player.id != message.author.id)
        message.channel.send(`:sob: <@${message.author.id}> left the game. We have ${this.players.length} players (${this.getPlayersAsString()}) in the game.`)
    }

    getNumImposters() {
        if (!this.numImposters) {
            this.numImposters = Math.ceil(this.players.length / 4)
        } else {
            this.numImposters = this.playerStates.reduce(
                (num, state) => {
                    if (state.identity == 'imposter' && state.status == 'alive') {
                        num++
                    }
                    return num
                }
                , 0)
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
                status: 'alive'
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

    setPlayerStatus(playerID: string | number, status: PlayerStatus) {
        this.playerStates.find(x => x.playerID == playerID).status = status
    }

    async startGame(message: Message) {
        try {
            if (this.selfDestroyTimer) {
                clearTimeout(this.selfDestroyTimer)
            }
            this.selfDestroyTimer = this.client.setTimeout(() => {
                this.close()
            }, 60 * 60 * 1000)

            if (this.players.length == 0) {
                this.channel.send([
                    [`You need at least 3 players to start a game. `,
                        this.players.length > 0 ? `${this.getPlayersAsString()} are in the Game so far` : null].join(' '),
                    `- Use "<@${this.client.user.id}> join" to join a game`,
                    `- Or, "<@${this.client.user.id}> leave" to leave the game`
                ].join('\n')
                )
                return
            }

            this.status = 'ongoing'
            this.word = (await getRandomLine('./assets/words.txt')).toLowerCase()
            this.startingPlayer = getRandomInt(0, this.players.length)
            this.currentPlayer = this.startingPlayer
            this.assignIdentity()
            // 
            this.channel.send('So, the game is about to start, excited?')
            this.channel.send('https://giphy.com/gifs/excited-family-guy-stewie-griffin-7eAvzJ0SBBzHy')
            await this.pause(1)
            // 

            const gameStartMessage = new MessageEmbed({
                color: '#0099ff',
                title: 'Game Rules',
                description: [
                    '- All the players will be given a word, *except* the imposters.',
                    '- During the game, you can only use Gifs to describe the word. The the chosen gif cannot contain the exact word as a keyword.',
                    '- The imposters win by successfully guessing the word',
                    '- And the other players win by finding out who the imposters are.',
                    `- You can messgae <@${this.client.user.id}> privately with the word "help" if you need more information`
                ].join('\n'),
                fields: [
                    { name: 'Number of Players', value: this.players.length, inline: true },
                    { name: 'Number of Imposters', value: this.numImposters, inline: true },
                    { name: 'Players in the Game', value: this.getPlayersAsString() }
                ]
            });

            this.channel.send(gameStartMessage)
            await this.pause(1)
            const gameStartCountdown = 5
            this.countdown(gameStartCountdown, 'The game will start in')
            await this.pause(gameStartCountdown)
            this.channel.send(`Now the game begins, I've send each of you a DM :love_letter: containing the word, except for the imposter :alien:. Check your private message!`)

            const welcomeMessage = {
                teammate: `You are a cheerful team mate. The magic word is **${this.word}**.` +
                    'Remember, you should never mention this word directly in the conversations, or use a Gif containing this keyword.',
                imposter: {
                    singular: 'You are the only imposter in this game. Try to guess the word from the clues other players give.',
                    plural: 'You are an imposter. Try to guess the word from the clues other players give.' +
                        `There are ${this.numImposters} imposters in the game, they are: ${this.getPlayersAsString('imposter')}`
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
        try {
            const player = this.players[this.currentPlayer]
            await this.channel.send(`Now it\'s <@${player.id}>'s turn. ${player.username}, use a Gif to describe the word.` +
                ' (If you are the imposter, just pretend you know)')
        } catch (e) {
            console.error(e)
        }
    }

    async nextRound() {
        try {
            // Checking if either side has won the game as a result of the voting
            if (this.getNumImposters() <= 0) {
                // if there's no imposters alive, the team mates win
                await this.channel.send(`All imposters are out, well done, ${this.getPlayersAsString('teammate')}! And, just FYI, the word was **${this.word}**.`)
                this.resetGame()
            } else if (this.hasImpostersWon()) {
                // if there's no chance for team mates to win, the imposters win
                await this.channel.send(`Imposters have won the game. Congrats ${this.getPlayersAsString('imposter')}`)
                this.resetGame()
            } else {
                // otherwise, start next round
                this.round++

                const newRoundMessage = new MessageEmbed({
                    color: '#0099ff',
                    title: `Round ${this.round}`,
                    description: `You can always messgae <@${this.client.user.id}> privately with the word "help" if you are not sure about something`,
                    fields: [
                        { name: 'Players alive', value: this.players.length, inline: true },
                        { name: 'Imposters alive', value: this.numImposters, inline: true },
                        { name: 'Live players in the game', value: this.getPlayersAsString(null, 'alive') || 'None' },
                        { name: 'Ghosts in the game', value: this.getPlayersAsString('teammate', 'ghost') || 'None' },
                        { name: 'Exposed imposters', value: this.getPlayersAsString('imposter', 'out') || 'None' }
                    ]
                })
                await this.channel.send(newRoundMessage)

                this.status = 'ongoing'
                this.startTurn()
            }

        } catch (e) {
            console.error(e)
        }

    }

    async nextPlayer() {
        try {
            this.status = 'ongoing'

            let next = this.currentPlayer
            const getNextPlayerStatus = () => this.playerStates.find(state => state.playerID == this.players[next].id).status

            do {
                next++
                if (next >= this.players.length) {
                    next = 0
                }
            } while (getNextPlayerStatus() != 'alive')  // Find next live player

            this.currentPlayer = next

            if (this.currentPlayer == this.startingPlayer) {
                await this.endOfRound()
            } else {
                this.startTurn()
            }
        } catch (error) {
            console.error(error)
        }


    }

    async endOfRound() {
        try {
            await this.channel.send([
                'End of this round. Who is an imposter?',
                '- Mention(@) a player\'s name to vote. (If you mention more than one names, the last one will be your final vote.)',
                `- An imposter can say "<@${this.client.user.id}> guess" to guess the word`
            ].join('\n')
            )

            await this.startVoting()
        } catch (error) {
            console.error(error)
        }

    }

    async parseGif(message: Message) {
        try {
            if (message.content.includes(this.word)) {
                message.delete()
                this.channel.send(`:skull_crossbones: You cannot mention the word directly!`)
                return
            }
            if (message.content.endsWith('.gif')) {
                this.channel.send(`:bomb: Please use the Gif button or \`/giphy <keyword>\` to look up for Gifs`)
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

    async startVoting() {
        try {
            this.status = 'voting'
            let seconds = 30

            this.channel.send(`You have ${seconds} seconds to vote`)

            const countdownTimer = this.client.setTimeout(async () => {
                if (this.status == 'voting') {  // if the game status has not changed during the time
                    await this.countVotes()
                }
            }, seconds * 1000)

            const intervalTimer = this.client.setInterval(
                () => {
                    if (this.status == 'voting') { // if the game status has not changed during the interval
                        seconds -= 10
                        if (seconds <= 0) {
                            clearInterval(intervalTimer)
                        } else {
                            this.channel.send(`You have ${seconds} seconds to vote`)
                        }
                    } else {
                        clearInterval(intervalTimer)
                        clearTimeout(countdownTimer)
                    }
                },
                10 * 1000)
        } catch (error) {
            console.error(error)
        }

    }

    async parseVote(message: Message) {
        try {
            const mentions = message.mentions
            if (!mentions.everyone && mentions.users.last()) {
                const voterID = message.author.id.toString()
                const votedID = mentions.users.last().id.toString()
                if (this.getPlayers(null, 'alive').some(player => player.id == votedID)) {
                    this.votes[voterID] = votedID
                    await this.channel.send(`<@${voterID}> has voted. Votes received:`)
                    await this.displayVotes()
                } else {
                    await this.channel.send(`You can only vote for players who are still live in this game`)
                }

            }
        } catch (error) {
            console.error(error)
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
        try {
            await this.channel.send(
                Object.entries(this.getVotesTransposed()).map(
                    ([votedID, voterIDs]) => `- <@${votedID}>: ${voterIDs.length} votes (from ${voterIDs.map(voterID => `<@${voterID}>`).join(' ')})`
                ).join('\n')
            )
        } catch (e) {
            console.error(e)
        }

    }

    async countVotes() {
        try {
            await this.channel.send(`Voting ended. Final votes:`)
            await this.displayVotes()

            let isTie = false
            let votedFor: Array<string> = []

            if (Object.keys(this.votes).length <= 0) {  // No one voted
                isTie = true
            } else {
                // Count how many players have voted for each ID
                // The result is a score
                const voteCount = Object.entries(this.getVotesTransposed()).reduce(
                    (voteCount, [votedID, voterIDs]) => {
                        if (!Object.keys(voteCount).includes(votedID)) {
                            voteCount[votedID] = 0
                        }
                        voterIDs.forEach(voterID => {
                            voteCount[votedID] += this.getPlayerStates(voterID).status == 'ghost' ? 0.5 : 1
                            // each ghost votes count as 0.5
                        })
                        return voteCount
                    }, {} as { [key: string]: number }
                )

                // empty the votes property after counting
                this.votes = {}

                // finding out the player(s) who received the most votes
                const highestVotes = Object.entries(voteCount).reduce(
                    (highestVotes, [votedID, votes]) => {
                        if (votes > highestVotes) {
                            isTie = false
                            votedFor = [votedID]
                            return votes
                        } else if (votes = highestVotes) {
                            isTie = true
                            votedFor.push(votedID)
                            return highestVotes
                        } else {
                            return highestVotes
                        }
                    }, 0)
            }


            if (isTie && votedFor.length == 0) {    // No one voted
                await this.channel.send('No votes? Alright, no one is dead this round')
            } else if (isTie) {
                // If there is a tie
                await this.channel.send(`${votedFor.map(id => `<@${id}>`).join(' ')} received the same number of votes, no one is dead this round`)
            } else {
                // If there is a clear "winner"
                await this.channel.send(`<@${votedFor[0]}> received the most number of votes, `)
                await this.pause(1)

                if (this.getPlayerStates(votedFor[0]).identity == 'imposter') {
                    // Player who got the most votes is an imposter
                    await this.channel.send(`<@${votedFor[0]}> is an imposter`)
                    this.setPlayerStatus(votedFor[0], 'out')
                    await this.channel.send(`<@${votedFor[0]}> is out of the game now. Better luck next time!`)
                } else {
                    // Player who got the most votes is NOT an imposter
                    await this.channel.send(`<@${votedFor[0]}> is not an imposter`)
                    this.setPlayerStatus(votedFor[0], 'ghost')
                    await this.channel.send(`<@${votedFor[0]}> is a ghost now. Ghost cannot talk, but they can still vote - each of their votes counts as a half vote.`)
                }

            }

            this.nextRound()

        } catch (error) {
            console.error(error)
        }

    }

    startGuess(playerID: string | number) {
        const playerState = this.playerStates.find(player => player.playerID == playerID)
        if (playerState && playerState.identity == 'imposter' && playerState.status == 'alive') {
            this.channel.send([
                `Quiet! <@${playerID}> has revealed their true identiy - an Imposter!`,
                'Imposter, which word do you think it is? (just type in the word, nothing else)'
            ].join('\n'))
            this.status = 'guessing'
            this.guessingPlayerID = playerID.toString()
        } else {
            this.channel.send('Only imposters who are still alive can make a guess')
        }
    }

    parseGuess(message: Message) {
        if (message.author.id.toString() == this.guessingPlayerID) {
            const lowerCaseContent = message.content.toLowerCase()
            if (lowerCaseContent == this.word) {
                this.channel.send([
                    ` <@${this.guessingPlayerID}> has guessed the correct word ${this.word}.`,
                    `Imposters win. Well done ${this.getPlayersAsString('imposter')}`
                ].join(' '))
                this.resetGame()
            } else {
                this.channel.send([
                    `Unfortunately, ${lowerCaseContent} is not the correct answer.`,
                    `<@${this.guessingPlayerID}> is out. Farewell. Now, onto the next round!`
                ].join(' '))
                this.setPlayerStatus(this.guessingPlayerID, 'out')
                this.nextRound()
            }
        } else {
            this.channel.send('Only the imposter can guess the word')
        }
    }

    hasImpostersWon() {
        const scores = this.playerStates.reduce(
            (scores, state) => {
                scores[state.identity] += state.status == 'ghost' ? 0.5 : 1
                return scores
            }, { imposter: 0, teammate: 0 }
        )
        if (scores.imposter > scores.teammate) {
            return true
        } else {
            return false
        }
    }

    pause(seconds: number) {
        const pause = new Promise<void>((resolve, reject) => {
            this.client.setTimeout(() => { resolve() }, seconds * 1000)
        })
        return pause
    }

    async countdown(seconds: number = 3, prefix: string = 'In', suffix: string = 'seconds') {
        try {
            const message = await this.channel.send(`${prefix} ${seconds} ${suffix}`)
            const countdownTimer = this.client.setInterval(
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
        } catch (error) {
            console.error(error)
        }

    }


    async sendPrivateMessage(player: User, text: string) {
        try {
            const channel = await player.createDM()
            channel.send(text)
        } catch (error) {
            console.error(error)
        }

    }

    getPlayers(identity?: Identity, status?: PlayerStatus) {
        const IDs = this.playerStates.filter(x => {
            return (identity ? x.identity == identity : true) && (status ? x.status == status : true)
        }).map(x => x.playerID)

        const players = this.players.filter(x => IDs.includes(x.id))

        return players
    }

    getPlayersAsString(identity?: Identity, status?: PlayerStatus) {
        return this.getPlayers(identity, status).map(player => `<@${player.id}>`).join(' ')
    }

}



