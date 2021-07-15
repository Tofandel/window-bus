import WindowBus from "../index";

const bus = new WindowBus();
bus.setChannel('demo'); // This is optional

const pre = document.getElementsByTagName('pre')[0];
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
