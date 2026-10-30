const { app, BrowserWindow, WebContentsView, ipcMain } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let mainWindow = null;
/** Reference to the sandboxed WebContentsView that renders external web pages. */
let webView = null;

/** Height of the HTML toolbar in pixels. Must match the rendered toolbar height in index.html. */
const TOOLBAR_HEIGHT = 48;

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

    if (!webView || webView.webContents.isDestroyed()) {
      console.warn('[IPC:browser:navigate] WebContentsView not available');
      return;
    }

    console.log('[IPC:browser:navigate] Loading validated URL in WebContentsView');
    webView.webContents.loadURL(validatedUrl).catch(() => {
      console.warn('[IPC:browser:navigate] Navigation failed');
    });
  });

  ipcMain.on(IPC_CHANNELS.GO_BACK, (event) => {
    if (!isTrustedSender(event)) {
      console.warn('[IPC:browser:go-back] Blocked request from untrusted sender');
      return;
    }

    if (!webView || webView.webContents.isDestroyed()) {
      return;
    }

    if (webView.webContents.canGoBack()) {
      webView.webContents.goBack();
      console.log('[IPC:browser:go-back] Navigating back');
    }
  });

  ipcMain.on(IPC_CHANNELS.GO_FORWARD, (event) => {
    if (!isTrustedSender(event)) {
      console.warn('[IPC:browser:go-forward] Blocked request from untrusted sender');
      return;
    }

    if (!webView || webView.webContents.isDestroyed()) {
      return;
    }

    if (webView.webContents.canGoForward()) {
      webView.webContents.goForward();
      console.log('[IPC:browser:go-forward] Navigating forward');
    }
  });

  ipcMain.on(IPC_CHANNELS.RELOAD, (event) => {
    if (!isTrustedSender(event)) {
      console.warn('[IPC:browser:reload] Blocked request from untrusted sender');
      return;
    }

    if (!webView || webView.webContents.isDestroyed()) {
      return;
    }

    webView.webContents.reload();
    console.log('[IPC:browser:reload] Reloading WebContentsView');
  });
}

/**
 * Computes and applies the correct bounds for the WebContentsView so it fills
 * the entire content area below the toolbar.
 * Called on creation and on every window resize.
 */
function updateWebViewBounds(webView) {
  const [contentWidth, contentHeight] = mainWindow.getContentSize();
  webView.setBounds({
    x: 0,
    y: TOOLBAR_HEIGHT,
    width: contentWidth,
    height: Math.max(0, contentHeight - TOOLBAR_HEIGHT)
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

  // --- WebContentsView: sandboxed external webpage area ---
  // No preload is attached; the view is fully isolated from main-window privileges.
  webView = new WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Deny all popup/window-open requests from web content.
  webView.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Enforce HTTP/HTTPS-only for all top-level navigations within the view.
  // Blocks file:, blob:, data:, and other schemes initiated by page-level navigation.
  webView.webContents.on('will-navigate', (event, url) => {
    if (!validateNavigationUrl(url)) {
      event.preventDefault();
      console.warn('[WebView] Blocked will-navigate to non-http/https URL');
    }
  });

  // Enforce HTTP/HTTPS-only for server-side redirects.
  webView.webContents.on('will-redirect', (event, url) => {
    if (!validateNavigationUrl(url)) {
      event.preventDefault();
      console.warn('[WebView] Blocked will-redirect to non-http/https URL');
    }
  });

  // Clear the module-level reference when the view's webContents is destroyed.
  webView.webContents.on('destroyed', () => {
    webView = null;
  });

  // Attach to the window's root content view and position below the toolbar.
  mainWindow.contentView.addChildView(webView);
  updateWebViewBounds(webView);

  // Keep bounds correct whenever the window is resized.
  // Guard against webView being null (destroyed before resize fires).
  mainWindow.on('resize', () => {
    if (!mainWindow.isDestroyed() && webView && !webView.webContents.isDestroyed()) {
      updateWebViewBounds(webView);
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    webView = null;
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

