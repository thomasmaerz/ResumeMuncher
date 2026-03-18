export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIProvider {
  chat(messages: Message[]): Promise<string>
  streamChat(messages: Message[]): AsyncGenerator<string>
  extract(messages: Message[]): Promise<string>
}
