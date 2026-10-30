const { contextBridge, ipcRenderer } = require('electron');

/**
 * AETHER Preload Script
 *
 * Exposes a narrow, secure, and frozen `window.aether` API for the trusted
 * browser chrome UI.
 *
 * Fixed IPC channels:
 * - 'browser:navigate' (send: url)
 * - 'browser:go-back' (send)
 * - 'browser:go-forward' (send)
 * - 'browser:reload' (send)
 * - 'browser:url-changed' (receive: url)
 * - 'browser:loading-state-changed' (receive: isLoading)
 */

const IPC_CHANNELS = Object.freeze({
  NAVIGATE: 'browser:navigate',
  GO_BACK: 'browser:go-back',
  GO_FORWARD: 'browser:go-forward',
  RELOAD: 'browser:reload',
  URL_CHANGED: 'browser:url-changed',
  LOADING_STATE_CHANGED: 'browser:loading-state-changed'
});

const aetherApi = Object.freeze({
  navigate(url) {
    if (typeof url === 'string' && url.trim().length > 0) {
      ipcRenderer.send(IPC_CHANNELS.NAVIGATE, url.trim());
    }
  },

  goBack() {
    ipcRenderer.send(IPC_CHANNELS.GO_BACK);
  },

  goForward() {
    ipcRenderer.send(IPC_CHANNELS.GO_FORWARD);
  },

  reload() {
    ipcRenderer.send(IPC_CHANNELS.RELOAD);
  },

  onUrlChanged(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('onUrlChanged: callback must be a function');
    }

    const subscription = (_event, url) => {
      if (typeof url === 'string') {
        callback(url);
      }
    };

    ipcRenderer.on(IPC_CHANNELS.URL_CHANGED, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.URL_CHANGED, subscription);
    };
  },

  onLoadingStateChanged(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('onLoadingStateChanged: callback must be a function');
    }

    const subscription = (_event, isLoading) => {
      if (typeof isLoading === 'boolean') {
        callback(isLoading);
      }
    };

    ipcRenderer.on(IPC_CHANNELS.LOADING_STATE_CHANGED, subscription);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.LOADING_STATE_CHANGED, subscription);
    };
  }
});

contextBridge.exposeInMainWorld('aether', aetherApi);

