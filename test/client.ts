import WindowBus from "../index";

(window as any).startClient = (iframe) => {
  const bus = new WindowBus(iframe.contentWindow);
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

  bus.dispatch('otherTest', 'hi').then((res) => {
    display(res);
    return bus.dispatch('otherTest', 'hi again')
  }).then(display);
}
