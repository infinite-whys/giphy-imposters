import * as process from 'process'

import { Worker } from '../worker'
import { Message, User, TextChannel, MessageEmbed } from 'discord.js'

// import { GiphyFetch } from '@giphy/js-fetch-api'

// const gf = new GiphyFetch('nm9JgdHDAeOUF6HmoojvSqOoW1Rf6N89')

import * as config from '../config.json'
import { memory } from 'console'

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

export class Game extends Worker {
    channelID: string
    players: Array<User> = []
    channel?: TextChannel
    currentPlayer?: number
    startingPlayer?:number
    word?: string
    status: 'waiting' | 'ongoing' |'voting' = 'waiting'

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
            } else if (this.currentPlayer>=0 && this.players[this.currentPlayer] && this.players[this.currentPlayer].id==message.author.id) {
                this.parseGIF(message)
            } else if (this.status == 'ongoing') {
                message.delete()
                const warning = await message.channel.send('Everyone else :shushing_face:')
                setTimeout(() => warning.delete(), 3000)
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
    }

    async close(){
        if (!this.channel){
            this.channel=await this.client.channels.fetch(this.channelID,true) as TextChannel
        }
        this.channel.delete()
    }

    async startGame(message: Message) {
        try {
            if (!this.channel) {
                this.channel = message.channel as TextChannel
                setTimeout(()=>{
                    this.channel.delete()
                },60*60*1000)
            }
            this.status = 'ongoing'
            this.word = 'cat'
            this.startingPlayer=  getRandomInt(0,this.players.length)
            this.currentPlayer = this.startingPlayer
            this.channel.send('So, the game is about to start, excited?')
            this.channel.send('https://giphy.com/gifs/excited-family-guy-stewie-griffin-7eAvzJ0SBBzHy')
            await this.pause(1)
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
            this.countdown(10, 'The game will start in')
            await this.pause(10)
            this.channel.send(`Now the game begins, I've send each of you a DM :love_letter: containing the word, except for the imposter :alien:. Check your private message!`)
            this.players.map(player => this.sendPrivateMessage(player, `The magic word is **${this.word}**. Remember, you can never mention this word in the conversations, or use a GIF containing this keyword.`))
            await this.pause(1)

            this.startTurn()
        } catch (e) {
            console.error(e)
        }

    }

    async startTurn() {
        const player = this.players[this.currentPlayer]
        this.channel.send(`Now it\'s <@${player.id}>'s turn. ${player.username}, use a GIF to describe the word.\n Tips: type \`/giphy <keyword>\` to search for a GIF in Discord.`)
    }

    async parseGIF(message: Message) {
        try{
            if (message.content.includes(this.word)) {
                message.delete()
                this.channel.send(`:skull_crossbones: You cannot mention the word directly!`)
                return
            }
            if (message.content.includes('tenor.com') || message.content.endsWith('.gif')) {
                this.channel.send(`:bomb: Please use \`/giphy <keyword>\` to look up for GIFs`)
                return
            }
    
            if (message.content.includes('giphy.com/gifs/')) {
                const chunks = message.content.split('/')
                const lastChunk = chunks[chunks.length - 1]
                if (lastChunk != 'gifs') {
                    await this.pause(1)
                    this.nextPlayer()
                    return
                }
            }
        }catch(e){
            console.error(e)
        }
       
    }

    async nextPlayer() {
        let next = this.currentPlayer + 1
        if (next >= this.players.length) {
            next = 0
        }
        this.currentPlayer = next
        if(this.currentPlayer==this.startingPlayer){
            await this.endOfRound()
        }
        this.startTurn()
    }

    async endOfRound(){
        this.status='voting'
        await this.channel.send('End of this round. Who is an imposter? Mention(@) a player\'s name to vote.'+
            '\nIf you mention more than one names, the last one will be your final vote')

        this.status='ongoing'
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


}



