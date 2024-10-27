export function AnimateAsyncRunFactoryProvider() {
  this.$get = [
    function () {
      var waitQueue = [];

      function waitForTick(fn) {
        waitQueue.push(fn);
        if (waitQueue.length > 1) return;
        window.requestAnimationFrame(function () {
          for (var i = 0; i < waitQueue.length; i++) {
            waitQueue[i]();
          }
          waitQueue = [];
        });
      }

      return function () {
        var passed = false;
        waitForTick(function () {
          passed = true;
        });
        return function (callback) {
          if (passed) {
            callback();
          } else {
            waitForTick(callback);
          }
        };
      };
    },
  ];
}

const INITIAL_STATE = 0;
const DONE_PENDING_STATE = 1;
const DONE_COMPLETE_STATE = 2;
let $q, $$animateAsyncRun;

export function AnimateRunnerFactoryProvider() {
  this.$get = [
    "$$animateAsyncRun",
    function (animateAsyncRun) {
      $$animateAsyncRun = animateAsyncRun;
      return AnimateRunner;
    },
  ];
}

export class AnimateRunner {
  static chain(chain, callback) {
    let index = 0;

    function next() {
      if (index === chain.length) {
        callback(true);
        return;
      }

      chain[index]((response) => {
        if (response === false) {
          callback(false);
          return;
        }
        index++;
        next();
      });
    }

    next();
  }

  static all(runners, callback) {
    let count = 0;
    let status = true;

    runners.forEach((runner) => {
      runner.done(onProgress);
    });

    function onProgress(response) {
      status = status && response;
      if (++count === runners.length) {
        callback(status);
      }
    }
  }

  constructor(host) {
    this.setHost(host);

    const rafTick = $$animateAsyncRun();
    const timeoutTick = (fn) => {
      setTimeout(fn, 0, false);
    };

    this._doneCallbacks = [];
    this._tick = (fn) => {
      if (document.hidden) {
        timeoutTick(fn);
      } else {
        rafTick(fn);
      }
    };
    this._state = 0;
  }

  setHost(host) {
    this.host = host || {};
  }

  done(fn) {
    if (this._state === DONE_COMPLETE_STATE) {
      fn();
    } else {
      this._doneCallbacks.push(fn);
    }
  }

  progress() {}

  getPromise() {
    if (!this.promise) {
      const self = this;
      this.promise = $q((resolve, reject) => {
        self.done((status) => {
          if (status === false) {
            reject();
          } else {
            resolve();
          }
        });
      });
    }
    return this.promise;
  }

  then(resolveHandler, rejectHandler) {
    return this.getPromise().then(resolveHandler, rejectHandler);
  }

  catch(handler) {
    return this.getPromise().catch(handler);
  }

  finally(handler) {
    return this.getPromise().finally(handler);
  }

  pause() {
    if (this.host.pause) {
      this.host.pause();
    }
  }

  resume() {
    if (this.host.resume) {
      this.host.resume();
    }
  }

  end() {
    if (this.host.end) {
      this.host.end();
    }
    this._resolve(true);
  }

  cancel() {
    if (this.host.cancel) {
      this.host.cancel();
    }
    this._resolve(false);
  }

  complete(response) {
    if (this._state === INITIAL_STATE) {
      this._state = DONE_PENDING_STATE;
      this._tick(() => {
        this._resolve(response);
      });
    }
  }

  _resolve(response) {
    if (this._state !== DONE_COMPLETE_STATE) {
      this._doneCallbacks.forEach((fn) => {
        fn(response);
      });
      this._doneCallbacks.length = 0;
      this._state = DONE_COMPLETE_STATE;
    }
  }
}
