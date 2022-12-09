import { OpenAIAuth } from './OpenAIAuth';

jest.setTimeout(20000);
describe('OpenAIAuth', () => {
  it('should be able to get a session token', async () => {
    // const auth = new OpenAIAuth(
    //   '***REMOVED***',
    //   '***REMOVED***',
    //   false
    // );
    const auth = new OpenAIAuth('***REMOVED***', '***REMOVED***', false);
    await auth.init();

    const token = await auth.login();
    console.log(token);
  });
});
