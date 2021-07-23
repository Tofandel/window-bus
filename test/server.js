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
    function WindowBus(targetWindow, origin, channel) {
        var _this = this;
        this.emitter = new tiny_emitter_1.TinyEmitter();
        this.frame = null;
        this._client = null;
        this._server = null;
        this.serverReady = true;
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
        this.origin = origin || document.referrer;
        if (this.origin) {
            this.origin = new URL(this.origin).origin;
        }
        else {
            this.origin = document.location.origin;
        }
        window.addEventListener("message", function (event) {
            if (_this.serverReady && event.origin !== _this.origin)
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
    WindowBus.prototype.startClient = function (payload) {
        if (this._client) {
            throw new Error('Client already started');
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
    WindowBus.prototype.startServer = function () {
        var _this = this;
        if (this._server) {
            throw new Error('Server already started');
        }
        this.serverReady = false;
        return this._server = new Promise(function (resolve, reject) {
            var t = setTimeout(function () {
                reject(new Error('Window bus timed out, did you forget to startClient?'));
            }, 10000);
            _this.once('bus-handshake', function (_a) {
                var origin = _a.origin, payload = _a.payload;
                _this.origin = origin;
                _this.serverReady = true;
                clearTimeout(t);
                resolve(payload);
                return payload;
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


/***/ }),

/***/ "./test/server.ts":
/*!************************!*\
  !*** ./test/server.ts ***!
  \************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var index_1 = __webpack_require__(/*! ../index */ "./index.ts");
if (window.opener) {
    var bus_1 = new index_1.default(window.opener);
    bus_1.setChannel('demo-2');
    bus_1.startServer().then(function () {
        var text = document.getElementsByTagName('textarea')[0];
        text.addEventListener('input', function () {
            bus_1.dispatch('change', text.value);
        });
        bus_1.on('change', function (value) {
            text.value = value;
        });
    });
}
else {
    try {
        var bus_2 = new index_1.default();
        bus_2.setChannel('demo');
        bus_2.startServer().then(function () {
            var text = document.getElementsByTagName('textarea')[0];
            text.addEventListener('input', function () {
                bus_2.dispatch('change', text.value);
            });
            bus_2.on('change', function (value) {
                if (text.value !== value) {
                    text.value = value;
                }
            });
            var pre = document.getElementsByTagName('pre')[0];
            var display = function (res) {
                pre.append(document.createTextNode(JSON.stringify(res)));
                pre.append(document.createElement('br'));
            };
            var cb = function (res) { return new Promise(function (resolve) {
                setTimeout(function () { return resolve(__assign(__assign({}, res), { result1: true })); }, 100);
            }); };
            bus_2.on('test', cb);
            bus_2.on('test', function (res, original) {
                bus_2.off('test', cb);
                display(original);
                return __assign(__assign({}, res), { result2: true });
            });
            bus_2.once('otherTest', function (res) {
                setTimeout(function () {
                    bus_2.dispatch('print', 'sent from the server').then(function (msg) {
                        display(msg);
                    });
                }, 100);
                return res + ' for the first time';
            });
        });
    }
    catch (e) {
        document.body.append(document.createTextNode(e.toString()));
    }
}


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
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./test/server.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=server.js.map