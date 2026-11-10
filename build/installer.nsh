!macro customHeader
  ; Electron's standard uninstaller removes APPDATA\${APP_FILENAME} and
  ; APPDATA\${APP_PACKAGE_NAME}. Enable that deletion only for true removal;
  ; electron-builder's template skips it during an in-place version update.
  !define DELETE_APP_DATA_ON_UNINSTALL
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    ; Remove AIOF-owned compatibility paths and its private temp directory.
    ; Do not purge shared Windows TEMP, event logs, Prefetch, shell history,
    ; or any data belonging to other applications.
    RMDir /r "$APPDATA\AIOF"
    RMDir /r "$APPDATA\aiof-desktop"
    RMDir /r "$LOCALAPPDATA\AIOF"
    RMDir /r "$LOCALAPPDATA\aiof-desktop"
    RMDir /r "$TEMP\AIOF"
    DeleteRegKey HKCU "Software\Classes\*\shell\AIOF.OpenWith"
    DeleteRegKey HKCU "Software\Classes\Directory\shell\AIOF.OpenWith"
  ${endIf}
!macroend
