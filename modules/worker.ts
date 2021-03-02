import { Client, Message } from 'discord.js'

export class Worker {
  client: Client = new Client()

  constructor() {

  }

  async init() {
    this.client.on('ready', this.onReady.bind(this));
    this.client.on('message', this.onMessage.bind(this));
    try {
      await this.client.login();
      this.client.user.setPresence({ activity: { name: '? ask "help" from me' }, status: 'online' })
    } catch (e) {
      console.error(e)
    }

  }

  filter(message: Message): Boolean {
    return false
  }

  onReady() {
    console.log(`Logged in as ${this.client.user.tag}!`);
  }

  onMessage(message: Message) {
    if (this.filter(message)) {
      this.act(message)
    }
  }

  async act(message: Message) {
  }

}

