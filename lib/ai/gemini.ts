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
    let systemContent = ''

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemContent += (systemContent ? '\n\n' : '') + msg.content
      } else if (msg.role === 'assistant') {
        mapped.push({ role: 'model', parts: [{ text: msg.content }] as Part[] })
      } else {
        let text = msg.content
        if (systemContent && mapped.length === 0) {
          text = `${systemContent}\n\n${text}`
          systemContent = ''
        }
        mapped.push({ role: 'user', parts: [{ text }] as Part[] })
      }
    }

    // Fallback if there was only a system message
    if (systemContent && mapped.length === 0) {
      mapped.push({ role: 'user', parts: [{ text: systemContent }] as Part[] })
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
