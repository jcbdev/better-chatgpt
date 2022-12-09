import { ChatGPT } from './ChatGPT';

jest.setTimeout(5 * 60000);

describe('ChatGPT', () => {
  it.skip('should log in with supplied credentials', async () => {
    const chat = new ChatGPT({
      sessionToken: process.env.TEST_SESSION,
      Authorization: process.env.TEST_AUTH,
    });
    // await chat.refreshSession();
    // console.log(chat.headers);

    console.log('me', 'Hello, how are you?');
    let response = await chat.getNextResponse('Hello, how are you?');
    console.log('assistant response', response);

    console.log('me', 'Could you write me some p5js code to draw a circle?');
    response = await chat.getNextResponse(
      'Could you write me some p5js code to draw a circle?'
    );
    console.log('assistant response', response);
  });

  it('should log in', async () => {
    const chat = new ChatGPT({});
    await chat.login(process.env.TEST_EMAIL, process.env.TEST_PASSWORD);
  });
});
