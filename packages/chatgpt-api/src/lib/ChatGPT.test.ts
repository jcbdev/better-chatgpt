import { ChatGPT } from './ChatGPT';

jest.setTimeout(5 * 60000);

describe('ChatGPT', () => {
  let chat: ChatGPT;
  let conversationId: string;
  let parentId: string;

  beforeAll(() => {
    chat = new ChatGPT({
      sessionToken: process.env.TEST_SESSION,
      Authorization: process.env.TEST_AUTH,
    });
    conversationId = chat.conversationId;
  });

  it('should log in with supplied credentials', async () => {
    expect(chat.config.sessionToken).toBe(process.env.TEST_SESSION);
    expect(chat.config.Authorization).toBe(process.env.TEST_AUTH);
    expect(chat.headers.Authorization).toBe(`Bearer ${process.env.TEST_AUTH}`);

    let response = await chat.getNextResponse('Hello, how are you?');
    expect(response).toContain('Hello!');

    response = await chat.getNextResponse(
      'My favourite color is green, What is you favourite color?'
    );
    expect(response).toContain('');
    parentId = chat.parentId;
  });

  it('should log in', async () => {
    const chat = new ChatGPT();
    await chat.login(process.env.TEST_EMAIL, process.env.TEST_PASSWORD);
    expect(chat.config.sessionToken).toEqual(expect.any(String));
    expect(chat.config.Authorization).toEqual(expect.any(String));
  });

  it('should throw error with bad login details', async () => {
    const chat = new ChatGPT();
    await expect(chat.login('bad@email.com', 'badpassword')).rejects.toThrow(
      'Login failed'
    );
  });

  it('should hold new conversation', async () => {
    chat.resetChat();
    let response = await chat.getNextResponse('Hello, how are you?');
    expect(response).toContain('Hello!');

    response = await chat.getNextResponse(
      'Could you write me some python code using turtle to draw a square in red?'
    );
    expect(response).toContain("turtle.pencolor('red')");
    console.log('assistant response', response);
  });

  it('should recover conversation', async () => {
    chat.conversationId = conversationId;
    chat.parentId = parentId;

    const response = await chat.getNextResponse('what is my favourite color?');
    expect(response).toContain('green');
    console.log('assistant response', response);
  });
});
