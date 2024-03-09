# Request X

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/cblonkdlnemhdeefhmaoiijjaedcphbf.svg)](https://chrome.google.com/webstore/detail/request-x/cblonkdlnemhdeefhmaoiijjaedcphbf)

![Request X](./src/resources/x.png)

This is a web extension to block or redirect undesired requests.

Supported browsers:

- Chrome
- Brave
- Edge
- Firefox (not officially released)
- Kiwi Browser (not all features)
- Other Chromium-based browsers

## Installation

- [Chrome web store](https://chrome.google.com/webstore/detail/request-x/cblonkdlnemhdeefhmaoiijjaedcphbf)

## Features

- Block requests by methods and URL patterns
- Maintainable lists
- Easy to share your lists with others
- Redirect requests
- Modify headers
- Modify cookie properties like `SameSite`

## Use cases

- Debug APIs but avoid unexpected mutations
- Block unwanted contents in an extremely flexible way
- Set authorization header to avoid inputing username/password again and again
- Set CORS header to allow certain cross-site requests without server changes
- Change `SameSite` for old services to work on latest browsers
- ...

## Click and Subscribe

Click on URLs with a magic hash `#:request-x:` to subscribe it:

```
<a href="https://example.com/path/to/rules.json#:request-x:">Subscribe</a>
```

Here is an example: [Subscribe](https://gist.github.com/gera2ld/5730305dc9081ec93ccab7a1c7ece5b3/raw/power.json#:request-x:)

## Screenshots

<img width="313" src="https://user-images.githubusercontent.com/3139113/153006528-ba5162e8-e991-4b3e-869e-b7af81b8c15a.png">

<img width="1080" src="https://user-images.githubusercontent.com/3139113/155350420-37db70c6-94d0-4d78-a48d-1e78f7247cb2.png">
