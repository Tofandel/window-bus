import WindowBus from "../index";

(window as any).startClient = (iframe) => {
  const bus = new WindowBus(iframe.contentWindow);
  bus.setChannel('demo'); // This is optional, needs to match server channel

  const pre = document.getElementsByTagName('pre')[0];
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

(window as any).openPopup = () => {
  const win = window.open('server.html', 'example', 'width=300,height=300');
  win.onload = () => {
    const bus = new WindowBus(win);
    bus.setChannel('demo'); // This is optional, needs to match server channel

    const text = document.createElement('textarea');
    document.body.append(text);
    text.addEventListener('input', () => {
      bus.dispatch('change', text.value);
    });

    bus.on('change', (value) => {
      if (text.value !== value) {
        text.value = value;
      }
    });
  };
}
