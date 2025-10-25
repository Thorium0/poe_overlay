/**
 * PoB Info Bar - Draggable window showing PoB build info with Tree and Gems buttons
 * Spawns when user imports a PoB build
 */

import { BrowserWindow, ipcMain, screen } from 'electron';
import type { SettingsService } from '../services/settingsService.js';
import type { OverlayVersion } from '../../types/overlayVersion.js';
import type { StoredPobBuild } from '../../shared/pob/types.js';

interface PobInfoBarParams {
  settingsService: SettingsService;
  overlayVersion: OverlayVersion;
  pobBuild: StoredPobBuild;
  currentAct: number;
}

let activePobInfoBar: BrowserWindow | null = null;

export function openPobInfoBar(params: PobInfoBarParams): void {
  // If already open, update it
  if (activePobInfoBar && !activePobInfoBar.isDestroyed()) {
    activePobInfoBar.webContents.send('pob-info-update', {
      build: params.pobBuild,
      currentAct: params.currentAct
    });
    activePobInfoBar.show();
    return;
  }

  const { settingsService, overlayVersion, pobBuild, currentAct } = params;
  
  // Small draggable bar dimensions
  const barWidth = 450; // Increased from 320
  const barHeight = 60;
  
  // Get saved position or use defaults
  const settingsKey = overlayVersion === 'poe1' ? 'levelingWindowPoe1' : 'levelingWindowPoe2';
  const savedSettings = settingsService.get(settingsKey) || {};
  const pobInfoBarSettings = (savedSettings as any).pobInfoBar || {};
  
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const initialX = pobInfoBarSettings.x ?? (width - barWidth - 20);
  const initialY = pobInfoBarSettings.y ?? 100;

  const window = new BrowserWindow({
    width: barWidth,
    height: barHeight,
    x: initialX,
    y: initialY,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: undefined
    }
  });

  activePobInfoBar = window;

  // Keep on top
  window.setAlwaysOnTop(true, 'screen-saver', 1);

  // Build HTML
  const html = buildPobInfoBarHtml(pobBuild, currentAct);
  
  window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  
  window.once('ready-to-show', () => {
    window.show();
  });

  // Save position on move
  window.on('move', () => {
    if (!window || window.isDestroyed()) return;
    const [newX, newY] = window.getPosition();
    settingsService.update(settingsKey, (current: any) => ({
      ...current,
      pobInfoBar: {
        ...(current.pobInfoBar || {}),
        x: newX,
        y: newY
      }
    }));
  });

  // Handle close
  ipcMain.once('pob-info-bar-close', () => {
    if (!window.isDestroyed()) {
      window.close();
    }
  });

  window.on('closed', () => {
    activePobInfoBar = null;
  });
}

export function closePobInfoBar(): void {
  if (activePobInfoBar && !activePobInfoBar.isDestroyed()) {
    activePobInfoBar.close();
    activePobInfoBar = null;
  }
}

export function updatePobInfoBar(pobBuild: StoredPobBuild, currentAct: number): void {
  if (activePobInfoBar && !activePobInfoBar.isDestroyed()) {
    activePobInfoBar.webContents.send('pob-info-update', { build: pobBuild, currentAct });
  }
}

function buildPobInfoBarHtml(pobBuild: StoredPobBuild, currentAct: number): string {
  const className = pobBuild.className || 'Unknown';
  const ascendancy = pobBuild.ascendancyName || '';
  const level = pobBuild.level || 1;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      background: transparent;
      color: #fff;
      overflow: hidden;
      user-select: none;
    }
    
    .pob-bar {
      background: rgba(26, 26, 26, 0.9);
      border: 1px solid rgba(74, 222, 128, 0.3);
      border-radius: 6px;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      -webkit-app-region: drag;
      height: 100%;
    }
    
    .class-info {
      flex: 1;
      min-width: 0;
      -webkit-app-region: drag;
    }
    
    .class-name {
      font-size: 11px;
      font-weight: 600;
      color: #4ade80;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .class-details {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 1px;
    }
    
    .button-group {
      display: flex;
      gap: 4px;
      -webkit-app-region: no-drag;
    }
    
    .pob-btn {
      padding: 3px 8px;
      background: rgba(74, 222, 128, 0.1);
      border: 1px solid rgba(74, 222, 128, 0.3);
      border-radius: 3px;
      color: #4ade80;
      font-size: 10px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    
    .pob-btn:hover {
      background: rgba(74, 222, 128, 0.2);
      border-color: rgba(74, 222, 128, 0.5);
    }
    
    .pob-btn:active {
      transform: translateY(0);
    }
    
    .close-btn {
      width: 18px;
      height: 18px;
      background: rgba(217, 83, 79, 0.1);
      border: 1px solid rgba(217, 83, 79, 0.3);
      border-radius: 3px;
      color: #d9534f;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
      -webkit-app-region: no-drag;
    }
    
    .close-btn:hover {
      background: rgba(217, 83, 79, 0.2);
      border-color: rgba(217, 83, 79, 0.5);
    }
  </style>
</head>
<body>
  <div class="pob-bar">
    <div class="class-info">
      <div class="class-name" id="className">${className}${ascendancy ? ' (' + ascendancy + ')' : ''}</div>
      <div class="class-details">Level ${level} • Act ${currentAct}</div>
    </div>
    <div class="button-group">
      <button class="pob-btn" onclick="openGems()" title="View gem links for current act">💎 Gems</button>
      <button class="pob-btn" onclick="openTree()" title="View passive tree progression">🌳 Tree</button>
    </div>
    <div class="close-btn" onclick="closeBar()">×</div>
  </div>
  
  <script>
    const { ipcRenderer } = require('electron');
    
    // Listen for updates
    ipcRenderer.on('pob-info-update', (event, data) => {
      const { build, currentAct } = data;
      const className = build.className || 'Unknown';
      const ascendancy = build.ascendancyName || '';
      const level = build.level || 1;
      
      document.getElementById('className').textContent = 
        className + (ascendancy ? ' (' + ascendancy + ')' : '');
      document.querySelector('.class-details').textContent = 
        \`Level \${level} • Act \${currentAct}\`;
    });
    
    function openGems() {
      ipcRenderer.send('open-pob-gems-window');
    }
    
    function openTree() {
      ipcRenderer.send('open-pob-tree-window');
    }
    
    function closeBar() {
      ipcRenderer.send('pob-info-bar-close');
    }
  </script>
</body>
</html>
  `;
}
