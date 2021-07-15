import WindowBus from "../index";

try {

    const bus = new WindowBus(window.opener); // To allow communication with popup use window.opener, to only allow iframe don't pass anything
    bus.setChannel('demo'); // This is optional

    const text = document.getElementsByTagName('textarea')[0];

    text.addEventListener('input', () => {
        document.body.append(document.createTextNode(JSON.stringify(window.parent.location.href)));
        bus.dispatch('change', text.value);
    });

    bus.on('change', (value) => {
        if (text.value !== value) {
            text.value = value;
        }
    });

    const pre = document.getElementsByTagName('pre')[0];
    const display = (res) => {
        pre.append(document.createTextNode(JSON.stringify(res)))
        pre.append(document.createElement('br'));
    }
    const cb = (res) => new Promise((resolve) => {
        setTimeout(() => resolve({...res, result1: true}), 100);
    });
    bus.on('test', cb);

    bus.on('test', (res, original) => {
        bus.off('test', cb);
        display(original);
        return {...res, result2: true};
    });

    bus.once('otherTest', (res) => {
        setTimeout(() => {
            bus.dispatch('print', 'sent from the server').then((msg) => {
                display(msg);
            });
        }, 100);
        return res + ' for the first time';
    });

} catch (e) {
  document.body.append(document.createTextNode(e.toString()))
}
