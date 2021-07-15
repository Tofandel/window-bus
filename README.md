## Installation

```bash
npm install window-bus --save
```
## Description

An ultra light (2Kb) library to facilitate communication between iframes, regardless of origin

## Example

You can have a look at the test folder on github which contains a runnable basic example

To run the demo, clone the git repository then run ```npm install && npm run test```

### Client
```js
import WindowBus from "window-bus";

const iframe = document.createElement('iframe');
iframe.src = 'some_url';

iframe.onload = () => {
  const bus = new WindowBus(iframe.contentWindow);
  bus.setChannel('demo'); // This is optional, needs to match the server

  const pre = document.body;
  const display = (res) => {
    pre.append(document.createTextNode(JSON.stringify(res)));
    pre.append(document.createElement('br'));
  }

  bus.dispatch('test', {
    somePayload: true
  }).then((res) => {
    display(res);
    return bus.dispatch('test', {
      another: 'payload'
    })
  }).then(display);

  bus.on('print', (msg) => {
    display(msg);
    return "reply from the client";
  });
  
  bus.dispatch('otherTest', 'hi').then((res) => {
    display(res);
    return bus.dispatch('otherTest', 'hi again')
  }).then(display);
}

document.body.append(iframe);
```

### Server (the page displayed in the iframe)
```js
import WindowBus from "window-bus";

const bus = new WindowBus();
bus.setChannel('demo'); // This is optional, needs to match on both sides

const pre = document.body;
const display = (res) => {
  pre.append(document.createTextNode(JSON.stringify(res)))
  pre.append(document.createElement('br'));
}
const cb = (res) => new Promise((resolve) => {
  setTimeout(() => resolve({ ...res, result1: true }), 100);
});
bus.on('test', cb);

bus.on('test', (res, original) => {
  bus.off('test', cb);
  display(original);
  return { ...res, result2: true };
});

bus.once('otherTest', (res) => {
  setTimeout(() => {
    bus.dispatch('print', 'sent from the server').then((msg) => {
      display(msg);
    });
  }, 100);
  return res + ' for the first time';
});
```

## A note on Security

This library assumes the server is a public page and thus any client can connect to it if a CSP is not configured

Here is the header you can serve from the server to only allow `https://some-client.com` to connect to the server
```
Content-Security-Policy: frame-ancestors 'self' https://some-client.com;
```
