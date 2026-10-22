const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");
let mainWindow;
app.setName("Godoy Paint Car");
if (process.platform === "win32") app.setAppUserModelId("com.gabrielgodoy.godoypaintcar");
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 700,
    backgroundColor: "#111214",
    title: "Godoy Paint Car",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets", "app-icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  // Electron cancels beforeunload silently unless the main process handles it.
  mainWindow.webContents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      title: "Fechar Godoy Paint Car?",
      message: "Existem alterações não salvas.",
      detail: "Salve seu projeto antes de sair para continuar a edição depois.",
      buttons: ["Continuar editando", "Sair sem salvar"],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    // For will-prevent-unload, preventDefault ALLOWS closing the window.
    if (choice === 1) event.preventDefault();
  });
  mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
});
app.on("window-all-closed", () => app.quit());
