import initCycleTLS, { CycleTLSClient, Cookie as TLSCookie } from 'cycletls';
import { Cookie, CookieJar } from 'tough-cookie';

const agents = [
  {
    ja3: '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-51-57-47-53-10,0-23-65281-10-11-35-16-5-51-43-13-45-28-21,29-23-24-25-256-257,0',
    userAgent:
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0',
  },
  {
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36 Edg/100.0.1185.44',
  },
  {
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-21,29-23-24,0',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36',
  },
];

const randomAgent = agents[Math.floor(Math.random() * agents.length)];

const defaultConfig = {
  headers: {
    Host: 'ask.openai.com',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent': randomAgent.userAgent,
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
  },
  ja3: randomAgent.ja3,
  disableRedirect: true,
};

export class OpenAIAuth {
  sessionToken?: string;
  emailAddress: string;
  password: string;
  useProxy: boolean;
  proxy?: string;
  session: CycleTLSClient;
  cookieJar: CookieJar = new CookieJar();
  accessToken?: string;

  constructor(
    emailAddress: string,
    password: string,
    useProxy: boolean,
    proxy?: string
  ) {
    this.emailAddress = emailAddress;
    this.password = password;
    this.useProxy = useProxy;
    this.proxy = proxy;
  }

  async init() {
    this.session = await initCycleTLS();
  }

  async processCookies(response, url, cookieJar) {
    if (!response.headers['Set-Cookie']) return;
    if (response.headers['Set-Cookie'] instanceof Array) {
      response.headers['Set-Cookie'].map(
        async (cookieString) => await cookieJar.setCookie(cookieString, url)
      );
    } else {
      await cookieJar.setCookie(response.headers['Set-Cookie'], url);
    }
  }

  async get(
    url: string,
    headers: Record<string, string> = {},
    redirect = false
  ) {
    const response = await this.session.get(url, {
      ...defaultConfig,
      proxy: this.useProxy ? this.proxy : undefined,
      headers: {
        ...defaultConfig.headers,
        ...headers,
        cookie: await this.cookieJar.getCookieString(url),
      },
      disableRedirect: !redirect,
    });

    await this.processCookies(response, url, this.cookieJar);

    return response;
  }

  async post(
    url: string,
    payload: string,
    headers: Record<string, string> = {}
  ) {
    const response = await this.session.post(url, {
      ...defaultConfig,
      proxy: this.useProxy ? this.proxy : undefined,
      headers: {
        ...defaultConfig.headers,
        ...headers,
        cookie: await this.cookieJar.getCookieString(url),
      },
      body: payload,
    });

    await this.processCookies(response, url, this.cookieJar);

    return response;
  }

  async login() {
    if (!this.emailAddress || !this.password) {
      throw new Error('Email address and password are required');
    }

    let response = await this.get('https://chat.openai.com/auth/login', {});
    if (response.status !== 200) {
      throw new Error('Failed to get login page');
    }

    response = await this.get('https://chat.openai.com/api/auth/csrf', {
      Referer: 'https://chat.openai.com/auth/login',
      Accept: '*/*',
    });

    if (
      response.status !== 200 ||
      response.headers['Content-Type'] !== 'application/json; charset=utf-8'
    ) {
      throw new Error('Failed to get CSRF token');
    }

    const csrfToken = (response.body as Record<string, any>).csrfToken;
    if (!csrfToken) throw new Error('Failed to get CSRF token');

    response = await this.post(
      'https://chat.openai.com/api/auth/signin/auth0?prompt=login',
      `callbackUrl=%2F&csrfToken=${csrfToken}&json=true`,
      {
        Origin: 'https://chat.openai.com',
        Accept: '*/*',
        Referer: 'https://chat.openai.com/auth/login',
        'Content-Length': '100',
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    );

    if (response.status === 400) throw new Error('Invalid credentials');

    if (
      response.status !== 200 ||
      response.headers['Content-Type'] !== 'application/json; charset=utf-8'
    ) {
      throw new Error('Failed to get redirect URL');
    }

    const url: string = (response.body as Record<string, any>).url;
    if (!url || url.includes('error'))
      throw new Error('Rate limited, try again in a few minutes');

    response = await this.get(url, {
      Host: 'auth0.openai.com',
      Referer: 'https://chat.openai.com/',
    });

    if (response.status !== 302)
      throw new Error('Wrong response code on redirect');

    const state = response.headers['Location'].split('state=')[1].split('&')[0];

    response = await this.get(
      `https://auth0.openai.com/u/login/identifier?state=${state}`,
      {
        Host: 'auth0.openai.com',
        Referer: 'https://chat.openai.com/',
      }
    );

    if (response.status !== 200)
      throw new Error('Wrong response from login page');

    if (response.body.match(/<img[^>]+alt="captcha"[^>]+>/))
      throw new Error('Captcha required');

    let payload = `state=${state}&username=${encodeURIComponent(
      this.emailAddress
    )}&js-available=true&webauthn-available=true&is-brave=false&webauthn-platform-available=true&action=default`;
    response = await this.post(
      `https://auth0.openai.com/u/login/identifier?state=${state}`,
      payload,
      {
        Host: 'auth0.openai.com',
        Origin: 'https://auth0.openai.com',
        Referer: `https://auth0.openai.com/u/login/identifier?state=${state}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    );

    if (response.status !== 302)
      throw new Error('Wrong response from login page');

    payload = `state=${state}&username=${encodeURIComponent(
      this.emailAddress
    )}&password=${encodeURIComponent(this.password)}&action=default`;
    response = await this.post(
      `https://auth0.openai.com/u/login/password?state=${state}`,
      payload,
      {
        Host: 'auth0.openai.com',
        Origin: 'https://auth0.openai.com',
        Referer: `https://auth0.openai.com/u/login/password?state=${state}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    );

    if (response.status === 400)
      throw new Error('Invalid username or password');

    if (response.status !== 302)
      throw new Error('Wrong response from password page');

    const newState = response.headers['Location']
      .split('state=')[1]
      .split('&')[0];

    response = await this.get(
      `https://auth0.openai.com/authorize/resume?state=${newState}`,
      {
        Host: 'auth0.openai.com',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: `https://auth0.openai.com/u/login/password?state=${state}`,
      }
    );

    if (response.status !== 302)
      throw new Error('Auth0 failed to issue access token');

    response = await this.get(response.headers.Location, {
      Host: 'auth0.openai.com',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: `https://auth0.openai.com/u/login/password?state=${state}`,
    });

    if (response.status !== 302)
      throw new Error('Auth0 failed to issue access token');

    response = await this.get(response.headers.Location, {
      Host: 'auth0.openai.com',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Referer: `https://auth0.openai.com/u/login/password?state=${state}`,
    });

    if (response.status !== 307)
      throw new Error('Auth0 failed to issue access token');

    response = await this.get(
      `https://chat.openai.com${response.headers.Location}`,
      {
        Host: 'auth0.openai.com',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: `https://auth0.openai.com/u/login/password?state=${state}`,
      }
    );

    if (response.status !== 200)
      throw new Error('Auth0 failed to issue access token');

    const accessToken: string = [
      ...response.body.matchAll(/accessToken":"(.*)"/g),
    ][0][1] as string;
    this.accessToken = accessToken;

    response = await this.get('https://chat.openai.com/api/auth/session', {
      Host: 'ask.openai.com',
      'If-None-Match': '"bwc9mymkdm2"',
      Accept: '*/*',
      Referer: 'https://chat.openai.com/chat',
    });

    if (response.status !== 200) throw new Error('Failed to get session token');

    this.sessionToken = (
      await this.cookieJar.getCookies('https://chat.openai.com')
    ).find((t) => t.key === '__Secure-next-auth.session-token').value;

    this.accessToken =
      (response.body as Record<string, any>).accessToken ?? this.accessToken;

    return this.sessionToken;
  }
}
