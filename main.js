const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#f8fafc'
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  const { searchTorrents } = require('./torrentSearch');

  ipcMain.handle('search-torrents', async (event, query, category) => {
    try {
      console.log('Searching for:', query, 'Category:', category);
      const torrents = await searchTorrents(query, category);
      console.log('Found', torrents.length, 'torrents');
      return { success: true, torrents };
    } catch (error) {
      console.error('Search error:', error);
      return { success: false, error: error.message };
    }
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
