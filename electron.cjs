const { app, BrowserWindow } = require("electron");
const path = require("node:path");
let mainWindow;
app.setName("Godoy Paint Car");
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 700,
    backgroundColor: "#111214",
    title: "Godoy Paint Car",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
});
app.on("window-all-closed", () => app.quit());
