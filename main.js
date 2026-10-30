const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let mainWindow = null;

const EXPECTED_INDEX_URL = pathToFileURL(path.join(__dirname, 'index.html')).href;

const IPC_CHANNELS = Object.freeze({
  NAVIGATE: 'browser:navigate',
  GO_BACK: 'browser:go-back',
  GO_FORWARD: 'browser:go-forward',
  RELOAD: 'browser:reload'
});

/**
 * Validates a navigation target string strictly allowing only http: and https: protocols.
 * Returns the normalized URL string if valid, or null if rejected.
 */
function validateNavigationUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    // Malformed URL string
    return null;
  }

  return null;
}

/**
 * Ensures IPC messages originate strictly from the trusted main frame of mainWindow.webContents,
 * and confirms the sender frame URL matches the local index.html document.
 */
function isTrustedSender(event) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  if (event.sender !== mainWindow.webContents) {
    return false;
  }

  // Require senderFrame to be present — reject if missing
  if (!event.senderFrame) {
    return false;
  }

  // Require it to equal the main top-level frame (no subframes or child frames)
  if (event.senderFrame !== mainWindow.webContents.mainFrame) {
    return false;
  }

  // Compare senderFrame URL directly — no fallback
  if (event.senderFrame.url !== EXPECTED_INDEX_URL) {
    return false;
  }

  return true;
}

function registerIpcHandlers() {
  ipcMain.on(IPC_CHANNELS.NAVIGATE, (event, targetUrl) => {
    if (!isTrustedSender(event)) {
      console.warn('[IPC:browser:navigate] Blocked request from untrusted sender');
      return;
    }

    const validatedUrl = validateNavigationUrl(targetUrl);
    if (!validatedUrl) {
      console.warn('[IPC:browser:navigate] Rejected invalid or unpermitted URL target');
      return;
    }

    console.log('[IPC:browser:navigate] Accepted validated navigation request');
    // WebContentsView navigation handling will connect here in Step 3
  });

  ipcMain.on(IPC_CHANNELS.GO_BACK, (event) => {
    if (!isTrustedSender(event)) {
      console.warn('[IPC:browser:go-back] Blocked request from untrusted sender');
      return;
    }

    console.log('[IPC:browser:go-back] Accepted navigation request');
  });

  ipcMain.on(IPC_CHANNELS.GO_FORWARD, (event) => {
    if (!isTrustedSender(event)) {
      console.warn('[IPC:browser:go-forward] Blocked request from untrusted sender');
      return;
    }

    console.log('[IPC:browser:go-forward] Accepted navigation request');
  });

  ipcMain.on(IPC_CHANNELS.RELOAD, (event) => {
    if (!isTrustedSender(event)) {
      console.warn('[IPC:browser:reload] Blocked request from untrusted sender');
      return;
    }

    console.log('[IPC:browser:reload] Accepted reload request');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

