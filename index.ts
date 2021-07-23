import {TinyEmitter} from 'tiny-emitter';

export default class WindowBus {
    private readonly emitter = new TinyEmitter();

    private readonly frame: Window = null;
    private _client: Promise<void> = null;
    private _server: Promise<void> = null;
    private serverReady: boolean = true;
    private origin: string = null;

    private id = 1;
    private queue = {};
    private channel = 'window-bus';

    constructor(targetWindow?: Window, origin?: string, channel?: string) {
        this.frame = targetWindow || (window.parent !== window && window.parent);

        if (!this.frame) {
            throw new Error('A frame is required')
        }

        if (channel) {
            this.setChannel(channel);
        }

        this.origin = origin || document.referrer;
        if (this.origin) {
            this.origin = new URL(this.origin).origin;
        } else {
            this.origin = document.location.origin;
        }

        window.addEventListener("message", (event) => {
            if (this.serverReady && event.origin !== this.origin)
                return;
            try {
                const data = typeof event.data === "object" ? event.data : JSON.parse(event.data);

                if (typeof data === "object" && data.target === this.channel && data.id) {
                    if (data.reply === true && this.queue[data.id]) {
                        this.queue[data.id][data.error ? 'reject' : 'resolve'](data.payload);
                        delete this.queue[data.id];
                    } else if (data.reply !== true) {
                        let chain = Promise.resolve(data.payload);
                        this.emitter.emit(data.action, (cb) => {
                            chain = chain.then((v) => cb(v, data.payload))
                        });
                        chain.then((payload?: any) => {
                            this.reply(event, data.id, payload);
                        }, (payload?: any) => {
                            this.reply(event, data.id, payload, true);
                        });
                    }
                }
            } catch (e) {
            }
        });
    }

    startClient(payload?) {
        if (this._client) {
            throw new Error('Client already started');
        }
        return this._client = this.dispatch('bus-handshake', {
            payload,
            origin: document.location.origin,
        });
    }

    get client(): null|Promise<any> {
        return this._client;
    }

    startServer(): Promise<any> {
        if (this._server) {
            throw new Error('Server already started');
        }
        this.serverReady = false;
        return this._server = new Promise((resolve, reject) => {
            const t = setTimeout(() => {
                reject(new Error('Window bus timed out, did you forget to startClient?'))
            }, 10000);
            this.once('bus-handshake', ({origin, payload}) => {
                this.origin = origin;
                this.serverReady = true;
                clearTimeout(t);
                resolve(payload);
                return payload;
            });
        });
    }

    get server(): null|Promise<any> {
        return this._client;
    }

    setChannel(channel: string) {
        this.channel = channel;
    }

    private reply(event, id, payload?: any, error?: boolean) {
        event.source.postMessage({
            reply: true,
            target: this.channel,
            id,
            payload,
            error,
        }, event.origin);
    }

    dispatch(action: string, payload?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('timeout')), 30000);
            this.queue[this.id] = {
                resolve: (args) => {
                    clearTimeout(t);
                    resolve(args);
                },
                reject
            };
            this.frame.postMessage({
                action,
                target: this.channel,
                id: this.id++,
                payload,
            }, this.origin);
        });
    }

    private chains = {};

    private chainWrap(fn, action, cb) {
        const c = (chain) => chain(cb);
        (this.chains[action] || (this.chains[action] = [])).push({cb, c});
        this.emitter[fn](action, c);
    }

    on(action: string, cb: CallableFunction) {
        this.chainWrap('on', action, cb);
    }

    once(action: string, cb: CallableFunction) {
        this.chainWrap('once', action, cb);
    }

    off(action: string, cb?: CallableFunction) {
        if (cb) {
            const res = (this.chains[action] || []).find((v) => v.cb === cb);
            if (res) {
                cb = res.c;
            }
        }
        this.emitter.off(action, cb);
    }
}

