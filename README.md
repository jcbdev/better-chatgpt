# better-chatgpt

_*Unoffical ChatGPT Api*_

Based on reverse engineering work done by the python community and quickly ported to nodejs for a project 😉

---

_*CAN USE EMAIL/PASSWORD TO GET SESSION TOKEN AUTOMAGICALLY*_ 🚀

---

# Install

```
npm install better-chatgpt
```

# Features

- No moderation
- Programmable.
- Resume conversation
- Rewind/undo
- Email/password authentication
- Cookie based authentication
- Access Token authentication
- Progressive responses
- Multiple sessions
- Conversation history
- Token refresh

# Usage

_Login via email and password_

```
import { ChatGPT } from 'better-chatgpt';

const chat = new ChatGPT();
await chat.login('some@email.com', 'mypassword');

let response = await chat.getNextResponse('Hello, how are you?');
console.log(response);

response = await chat.getNextResponse('');
```

_Use existing session/auth token_

```
import { ChatGPT } from 'better-chatgpt';

const chat = new ChatGPT({
  Authorization: '<token>',
  sessionToken: '<token>'.
});
```

_revert last response_

```
chat.rollback()
```

_WIP_ - More info to be added

# TODO

- Examples
- Documentation
- Proxies
- Logging
- Improve test conerage

# Credits

- [acheong08](https://github.com/acheong08/ChatGPT) - Original python implementation that inspired this
- [rawandahmad698](https://github.com/rawandahmad698) - Reverse engineering Auth0
- [FlorianREGAZ](https://github.com/FlorianREGAZ) - TLS client
- [PyRo1121](https://github.com/PyRo1121) - Linting
- [Harry-Jing](https://github.com/Harry-Jing) - Async support
- [Ukenn2112](https://github.com/Ukenn2112) - Documentation
- [All other contributors](https://github.com/acheong08/ChatGPT/graphs/contributors)
