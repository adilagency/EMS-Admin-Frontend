# EMS Branch Agent — Install EXE + Windows auto-start

This turns the agent into a normal Windows app (no VS Code / `npm start` on branch PCs).

## What you get after build

| File | Use |
|------|-----|
| `EMS Branch Agent-*-Setup.exe` | Installer (Program Files + Start Menu) |
| `EMS Branch Agent-*-portable.exe` | USB / no-install copy |

Config & outbox always live in:

`C:\Users\<user>\.ems-branch-agent\`

## 1) Build on a developer PC

```powershell
cd branch-agent
npm install
npm run dist
```

Output is in `branch-agent\dist\`.

Copy the **Setup.exe** (or portable) to the branch PC via USB.

## 2) On the branch PC

1. Install / run the EXE  
2. Open **Settings** (tray icon → Settings)  
3. Set:
   - API URL: `https://ems-admin-r5m4.onrender.com/api`
   - Device secret (same as admin branch)
   - Device IP / port `4370`
   - Mode: **zk**
4. Tick **Start when Windows starts** → **Save**  
5. Confirm K50 Connected + EMS Online  
6. Tray shows **Auto-recover** — if the device hangs or PC wakes from sleep, agent reconnects itself  

That alone is enough for many branches (starts at user logon).

## 3) Optional — Windows Service (always-on, restarts on crash)

After the EXE is installed and config is saved, open **PowerShell as Administrator**:

```powershell
cd "C:\Program Files\EMS Branch Agent\resources\scripts"
# If scripts are not there, copy from the USB branch-agent\scripts folder.

.\install-service.ps1 -ExePath "C:\Program Files\EMS Branch Agent\EMS Branch Agent.exe"
```

This installs service **EMSBranchAgent** which runs:

`EMS Branch Agent.exe --headless`

Manage in `services.msc`.

### Or Scheduled Task (at logon, no NSSM)

```powershell
.\install-autostart.ps1 -ExePath "C:\Program Files\EMS Branch Agent\EMS Branch Agent.exe"
```

### Uninstall service / task

```powershell
.\uninstall-service.ps1
```

## 4) Headless flag

| Mode | How |
|------|-----|
| Tray + settings UI | Double-click EXE (default) |
| Background only | `EMS Branch Agent.exe --headless` (used by the service) |

## Notes

- **Node.js is not required** on the branch PC after you install the EXE  
- Keep one agent per branch PC / one device secret per branch  
- First successful connect still skips old device history once, then catches punches while the PC was off  

## Dev still works

```powershell
npm start          # Electron UI
npm run sync       # CLI loop
npm run dist       # build installers
```
