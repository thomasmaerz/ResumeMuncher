import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai'
import { getConfig } from '@/lib/config'
import { AIProvider, Message } from './provider'

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI

  constructor() {
    const config = getConfig()
    this.client = new GoogleGenerativeAI(config.ai.geminiApiKey)
  }

  private mapToContent(messages: Message[]): Content[] {
    const mapped: Content[] = []
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        if (mapped.length === 0 || mapped[0].role !== 'user') {
          mapped.unshift({ role: 'user', parts: [{ text: msg.content }] })
        } else {
          const existingParts = mapped[0].parts as Part[]
          const newText = msg.content + '\n\n' + (existingParts[0]?.text || '')
          mapped[0] = { role: 'user', parts: [{ text: newText }] }
        }
      } else if (msg.role === 'assistant') {
        mapped.push({ role: 'model', parts: [{ text: msg.content }] as Part[] })
      } else {
        mapped.push({ role: 'user', parts: [{ text: msg.content }] as Part[] })
      }
    }
    
    return mapped
  }

  private async run(
    modelName: string,
    messages: Message[]
  ): Promise<string> {
    const model = this.client.getGenerativeModel({ model: modelName })
    const mappedMessages = this.mapToContent(messages)
    
    const chat = model.startChat({
      history: mappedMessages.slice(0, -1),
    })
    
    const lastMessage = mappedMessages[mappedMessages.length - 1]
    const result = await chat.sendMessage(lastMessage.parts as Part[])
    const response = result.response
    
    return response.text()
  }

  async chat(messages: Message[]): Promise<string> {
    return this.run('gemini-3-flash-preview', messages)
  }

  async *streamChat(messages: Message[]): AsyncGenerator<string> {
    const model = this.client.getGenerativeModel({ model: 'gemini-3-flash-preview' })
    const mappedMessages = this.mapToContent(messages)
    
    const chat = model.startChat({
      history: mappedMessages.slice(0, -1),
    })
    
    const lastMessage = mappedMessages[mappedMessages.length - 1]
    const result = await chat.sendMessageStream(lastMessage.parts as Part[])
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      if (chunkText) {
        yield chunkText
      }
    }
  }

  async extract(messages: Message[]): Promise<string> {
    return this.run('gemini-3-flash-preview', messages)
  }
}
