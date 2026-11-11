' Launch EMS Branch Agent with no console window.
' Double-click this file (or pin a shortcut to it).
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = appDir & "\node_modules\electron\dist\electron.exe"

If Not fso.FileExists(electronExe) Then
  MsgBox "Electron not found. Run npm install in:" & vbCrLf & appDir, 16, "EMS Branch Agent"
  WScript.Quit 1
End If

shell.CurrentDirectory = appDir
' 0 = hidden window (no CMD)
shell.Run """" & electronExe & """ .", 0, False
