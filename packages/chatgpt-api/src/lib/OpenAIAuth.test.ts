import { OpenAIAuth } from './OpenAIAuth';

jest.setTimeout(20000);
describe('OpenAIAuth', () => {
  it.skip('should be able to get a session token', async () => {
    const auth = new OpenAIAuth(
      process.env.TEST_EMAIL,
      process.env.TEST_PASSWORD,
      false
    );
    // const auth = new OpenAIAuth('james@quantum.art', 'N0fxrule@qtm', false);
    await auth.init();

    const token = await auth.login();
    console.log(auth.accessToken);
    console.log(auth.sessionToken);
  });
});
