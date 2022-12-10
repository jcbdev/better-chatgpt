import { v4 as uuidv4 } from 'uuid';
import { OpenAIAuth } from './OpenAIAuth';
import { context, CookieJar } from 'fetch-h2';

export class ChatGPT {
  config: any;
  conversationId?: string;
  parentId?: string;
  baseUrl: string;
  headers: Record<string, string>;
  conversationIdPrev: string;
  parentIdPrev: string;
  chatHistory: any[];

  constructor(config?: any, conversationId?: string) {
    this.config = config ?? {};
    this.conversationId = conversationId;
    this.parentId = uuidv4();
    this.baseUrl = 'https://chat.openai.com/';
    if (
      this.config.sessionToken ||
      (this.config.email && this.config.password) ||
      this.config.accessToken
    ) {
      this.refreshHeaders();
    }
  }

  resetChat() {
    this.conversationId = undefined;
    this.parentId = uuidv4();
  }

  private async getChatText(data: any) {
    const cookieJar = new CookieJar();
    await cookieJar.setCookie(
      '__Secure-next-auth.session-token=' + this.config.sessionToken,
      'https://chat.openai.com'
    );
    await cookieJar.setCookie(
      '_Secure-next-auth.callback-url=https://chat.openai.com/',
      'https://chat.openai.com'
    );
    const ctx = context({
      cookieJar: cookieJar,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    });
    const response = await ctx.fetch(
      `${this.baseUrl}backend-api/conversation`,
      {
        method: 'POST',
        headers: this.headers,
        json: data,
      }
    );

    const text = (await response.text()).split('\n').filter((x) => x !== '');
    const finalResponse = JSON.parse(text[text.length - 2].substring(6));
    ctx.disconnect(`${this.baseUrl}backend-api/conversation`);
    this.parentId = finalResponse['message']['id'];
    this.conversationId = finalResponse['conversation_id'];

    return finalResponse;
  }

  async getChat(prompt: string) {
    this.conversationIdPrev = this.conversationId;
    this.parentIdPrev = this.parentId;
    const response = await this.getChatText({
      action: 'next',
      messages: [
        {
          id: uuidv4(),
          role: 'user',
          content: { content_type: 'text', parts: [prompt] },
        },
      ],
      conversation_id: this.conversationId,
      parent_message_id: this.parentId,
      model: 'text-davinci-002-render',
    });
    this.chatHistory.push(response);
    return response;
  }

  async getNextResponse(prompt: string) {
    const conversation = await this.getChat(prompt);
    return conversation['message']['content']['parts'][0];
  }

  rollback() {
    this.conversationId = this.conversationIdPrev;
    this.parentId = this.parentIdPrev;
  }

  private refreshHeaders() {
    this.headers = {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${this.config.Authorization}`,
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'X-Openai-Assistant-App-Id': '',
      'Accept-Language': 'en-US,en;q=0.9',
    };
  }

  async refreshSession() {
    if (this.config.sessionToken) {
      const cookieJar = new CookieJar();
      await cookieJar.setCookie(
        '__Secure-next-auth.session-token=' + this.config.sessionToken,
        'https://chat.openai.com'
      );
      const ctx = context({
        cookieJar: cookieJar,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      });
      const response = await ctx.fetch(`${this.baseUrl}api/auth/session`, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        },
      });

      if (response.status !== 200) {
        throw new Error('Session refresh failed');
      }

      this.config.sessionToken = (
        await cookieJar.getCookies('https://chat.openai.com')
      ).find((c) => c.key === '__Secure-next-auth.session-token').value;

      this.config.Authorization = (await response.json()).accessToken;
      this.refreshHeaders();
      await ctx.disconnect(`${this.baseUrl}api/auth/session`);
    }
  }

  async login(email: string, password: string) {
    const auth = new OpenAIAuth(email, password, false);
    await auth.init();
    try {
      await auth.login();
      // eslint-disable-next-line no-empty
    } catch (e) {}

    if (auth.accessToken) {
      this.config.Authorization = auth.accessToken;
      if (auth.sessionToken) {
        this.config.sessionToken = auth.sessionToken;
      } else {
        const sessionToken = (
          await auth.cookieJar.getCookies('https://chat.openai.com')
        ).find((c) => c.key === '__Secure-next-auth.session-token');
        this.config.sessionToken = sessionToken.value;
      }
    } else {
      throw new Error('Login failed');
    }
  }
}
