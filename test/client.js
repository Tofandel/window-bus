/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/tiny-emitter/index.js":
/*!********************************************!*\
  !*** ./node_modules/tiny-emitter/index.js ***!
  \********************************************/
/***/ ((module) => {

function E () {
  // Keep this empty so it's easier to inherit from
  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
}

E.prototype = {
  on: function (name, callback, ctx) {
    var e = this.e || (this.e = {});

    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx
    });

    return this;
  },

  once: function (name, callback, ctx) {
    var self = this;
    function listener () {
      self.off(name, listener);
      callback.apply(ctx, arguments);
    };

    listener._ = callback
    return this.on(name, listener, ctx);
  },

  emit: function (name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;

    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }

    return this;
  },

  off: function (name, callback) {
    var e = this.e || (this.e = {});
    var evts = e[name];
    var liveEvents = [];

    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
          liveEvents.push(evts[i]);
      }
    }

    // Remove event from queue to prevent memory leak
    // Suggested by https://github.com/lazd
    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

    (liveEvents.length)
      ? e[name] = liveEvents
      : delete e[name];

    return this;
  }
};

module.exports = E;
module.exports.TinyEmitter = E;


/***/ }),

/***/ "./index.ts":
/*!******************!*\
  !*** ./index.ts ***!
  \******************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
var tiny_emitter_1 = __webpack_require__(/*! tiny-emitter */ "./node_modules/tiny-emitter/index.js");
var WindowBus = (function () {
    function WindowBus(targetWindow, channel) {
        var _this = this;
        this.emitter = new tiny_emitter_1.TinyEmitter();
        this.frame = null;
        this._client = null;
        this._server = null;
        this.origin = null;
        this.id = 1;
        this.queue = {};
        this.channel = 'window-bus';
        this.chains = {};
        this.frame = targetWindow || (window.parent !== window && window.parent);
        if (!this.frame) {
            throw new Error('A frame is required');
        }
        if (channel) {
            this.setChannel(channel);
        }
        window.addEventListener("message", function (event) {
            if (_this.origin && event.origin !== _this.origin)
                return;
            try {
                var data_1 = typeof event.data === "object" ? event.data : JSON.parse(event.data);
                if (typeof data_1 === "object" && data_1.target === _this.channel && data_1.id) {
                    if (data_1.reply === true && _this.queue[data_1.id]) {
                        _this.queue[data_1.id][data_1.error ? 'reject' : 'resolve'](data_1.payload);
                        delete _this.queue[data_1.id];
                    }
                    else if (data_1.reply !== true) {
                        var chain_1 = Promise.resolve(data_1.payload);
                        _this.emitter.emit(data_1.action, function (cb) {
                            chain_1 = chain_1.then(function (v) { return cb(v, data_1.payload); });
                        });
                        chain_1.then(function (payload) {
                            _this.reply(event, data_1.id, payload);
                        }, function (payload) {
                            _this.reply(event, data_1.id, payload, true);
                        });
                    }
                }
            }
            catch (e) {
            }
        });
    }
    WindowBus.prototype.startClient = function (origin, payload) {
        if (origin === void 0) { origin = document.referrer; }
        if (this._client) {
            throw new Error('Client already started');
        }
        if (origin) {
            this.origin = new URL(origin).origin;
        }
        else {
            this.origin = document.location.origin;
        }
        return this._client = this.dispatch('bus-handshake', {
            payload: payload,
            origin: document.location.origin,
        });
    };
    Object.defineProperty(WindowBus.prototype, "client", {
        get: function () {
            return this._client;
        },
        enumerable: false,
        configurable: true
    });
    WindowBus.prototype.startServer = function (origins, replyPayload) {
        var _this = this;
        if (this._server) {
            throw new Error('Server already started');
        }
        return this._server = new Promise(function (resolve, reject) {
            var t = setTimeout(function () {
                reject(new Error('Window bus timed out, did you forget to startClient?'));
            }, 10000);
            _this.once('bus-handshake', function (_a) {
                var origin = _a.origin, payload = _a.payload;
                if (!origins || origins.includes(origin)) {
                    _this.origin = origin;
                    clearTimeout(t);
                    resolve(payload);
                    return replyPayload;
                }
                else {
                    reject(new Error('Origin ' + origin + ' is not allowed'));
                }
            });
        });
    };
    Object.defineProperty(WindowBus.prototype, "server", {
        get: function () {
            return this._client;
        },
        enumerable: false,
        configurable: true
    });
    WindowBus.prototype.setChannel = function (channel) {
        this.channel = channel;
    };
    WindowBus.prototype.reply = function (event, id, payload, error) {
        event.source.postMessage({
            reply: true,
            target: this.channel,
            id: id,
            payload: payload,
            error: error,
        }, event.origin);
    };
    WindowBus.prototype.dispatch = function (action, payload) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var t = setTimeout(function () { return reject(new Error('timeout')); }, 30000);
            _this.queue[_this.id] = {
                resolve: function (args) {
                    clearTimeout(t);
                    resolve(args);
                },
                reject: reject
            };
            _this.frame.postMessage({
                action: action,
                target: _this.channel,
                id: _this.id++,
                payload: payload,
            }, _this.origin);
        });
    };
    WindowBus.prototype.chainWrap = function (fn, action, cb) {
        var c = function (chain) { return chain(cb); };
        (this.chains[action] || (this.chains[action] = [])).push({ cb: cb, c: c });
        this.emitter[fn](action, c);
    };
    WindowBus.prototype.on = function (action, cb) {
        this.chainWrap('on', action, cb);
    };
    WindowBus.prototype.once = function (action, cb) {
        this.chainWrap('once', action, cb);
    };
    WindowBus.prototype.off = function (action, cb) {
        if (cb) {
            var res = (this.chains[action] || []).find(function (v) { return v.cb === cb; });
            if (res) {
                cb = res.c;
            }
        }
        this.emitter.off(action, cb);
    };
    return WindowBus;
}());
exports.default = WindowBus;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;
/*!************************!*\
  !*** ./test/client.ts ***!
  \************************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
var index_1 = __webpack_require__(/*! ../index */ "./index.ts");
window.startClient = function (iframe) {
    var bus = new index_1.default(iframe.contentWindow);
    bus.setChannel('demo');
    var pre = document.getElementsByTagName('pre')[0];
    var display = function (res) {
        pre.append(document.createTextNode(JSON.stringify(res)));
        pre.append(document.createElement('br'));
    };
    bus.startClient(iframe.src, 'hey').then(function (ho) {
        if (ho !== 'ho') {
            alert("Credentials don't match");
        }
        bus.dispatch('test', {
            somePayload: true
        }).then(function (res) {
            display(res);
            return bus.dispatch('test', {
                another: 'payload'
            });
        }).then(display);
        bus.on('print', function (msg) {
            display(msg);
            return "reply from the client";
        });
        bus.dispatch('otherTest', 'hi').then(function (res) {
            display(res);
            return bus.dispatch('otherTest', 'hi again');
        }).then(display);
        var text = document.getElementsByTagName('textarea')[0];
        text.addEventListener('input', function () {
            bus.dispatch('change', text.value);
        });
        bus.on('change', function (value) {
            text.value = value;
        });
    });
};
window.openPopup = function () {
    var win = window.open('server.html', 'example', 'width=300,height=300');
    win.onload = function () {
        var bus = new index_1.default(win, 'demo-2');
        bus.startClient(window.location.origin).then(function () {
            var text = document.getElementsByTagName('textarea')[0];
            bus.dispatch('change', text.value);
            text.addEventListener('input', function () {
                bus.dispatch('change', text.value);
            });
            bus.on('change', function (value) {
                if (text.value !== value) {
                    text.value = value;
                }
            });
        });
    };
};

})();

/******/ })()
;
//# sourceMappingURL=client.js.map