; 삼복출프(SBCP) 출결 프로그램 설치 파일
; 빌드: python3 tools/build.py  (build/ 에 파일을 만든 뒤 이 스크립트를 makensis로 컴파일)
;
; - 관리자 권한 없이 사용자 폴더(%LOCALAPPDATA%\SBCP)에 설치한다
; - 출결 데이터는 브라우저에 저장되므로 설치·업데이트·제거 모두 데이터를 건드리지 않는다

Unicode true
SetCompressor /SOLID lzma

!ifndef VERSION
  !define VERSION "1.6"
!endif
!define APPNAME   "삼복출프 출결"
!define APPKEY    "SBCP"
!define PUBLISHER "삼성영어 셀레나"
!define SMDIR     "$SMPROGRAMS\삼복출프"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPKEY}"

Name "${APPNAME} v${VERSION}"
OutFile "../release/SBCP_Setup_v${VERSION}.exe"
InstallDir "$LOCALAPPDATA\SBCP"
InstallDirRegKey HKCU "Software\${APPKEY}" "InstallDir"
RequestExecutionLevel user
BrandingText "${APPNAME} v${VERSION}"

VIProductVersion "${VERSION}.0.0"
VIAddVersionKey /LANG=1042 "ProductName" "${APPNAME}"
VIAddVersionKey /LANG=1042 "FileDescription" "${APPNAME} 설치 프로그램"
VIAddVersionKey /LANG=1042 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1042 "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=1042 "CompanyName" "${PUBLISHER}"
VIAddVersionKey /LANG=1042 "LegalCopyright" "${PUBLISHER}"

!include "MUI2.nsh"

!define MUI_ICON   "sbcp.ico"
!define MUI_UNICON "sbcp.ico"
!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "${APPNAME} v${VERSION} 설치"
!define MUI_WELCOMEPAGE_TEXT "학원 PC에서 사용하는 출결 프로그램을 설치합니다.$\r$\n$\r$\n\
■ 예전 버전을 쓰고 계셨다면$\r$\n\
설치 전에 예전 프로그램의 [데이터 관리 → 전체 데이터 백업]으로$\r$\n\
백업 파일을 먼저 받아 두세요.$\r$\n$\r$\n\
■ 출결 데이터는 브라우저에 저장되므로 설치해도 지워지지 않습니다.$\r$\n\
예전과 같은 브라우저(크롬/엣지)로 열면 그대로 보입니다.$\r$\n$\r$\n\
[다음]을 눌러 계속하세요."

!define MUI_COMPONENTSPAGE_SMALLDESC

!define MUI_FINISHPAGE_TITLE "설치가 끝났습니다"
!define MUI_FINISHPAGE_TEXT "처음 한 번은 [설정 → AI 연결]에서 Gemini API 키를 등록해 주세요.$\r$\n\
(발급 방법은 사용설명서 2절)$\r$\n$\r$\n\
학생 명단이 기본값(3명)으로 보이면 백업 파일로 복구하세요.$\r$\n\
(사용설명서 5-2절)"
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "지금 출결 프로그램 열기"
!define MUI_FINISHPAGE_RUN_FUNCTION OpenApp
!define MUI_FINISHPAGE_SHOWREADME
!define MUI_FINISHPAGE_SHOWREADME_TEXT "사용설명서 열기"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION OpenManual

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Korean"

Function OpenApp
  ExecShell "open" "$INSTDIR\SBCP.html"
FunctionEnd

Function OpenManual
  ExecShell "open" "$INSTDIR\사용설명서.html"
FunctionEnd

Section "프로그램 (필수)" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"
  File "../build/SBCP.html"
  File "/oname=사용설명서.html" "../build/manual.html"
  File "sbcp.ico"

  CreateDirectory "${SMDIR}"
  CreateShortcut "${SMDIR}\${APPNAME}.lnk" "$INSTDIR\SBCP.html" "" "$INSTDIR\sbcp.ico" 0
  CreateShortcut "${SMDIR}\사용설명서.lnk" "$INSTDIR\사용설명서.html"
  CreateShortcut "${SMDIR}\삼복출프 제거.lnk" "$INSTDIR\uninstall.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "Software\${APPKEY}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTKEY}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\sbcp.ico"
  WriteRegStr HKCU "${UNINSTKEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
SectionEnd

Section "바탕화면 바로가기" SecDesktop
  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\SBCP.html" "" "$INSTDIR\sbcp.ico" 0
SectionEnd

Section "Windows 시작 시 자동 실행" SecStartup
  CreateShortcut "$SMSTARTUP\${APPNAME}.lnk" "$INSTDIR\SBCP.html" "" "$INSTDIR\sbcp.ico" 0
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain}    "출결 프로그램과 사용설명서 (필수)"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} "바탕화면에 '${APPNAME}' 아이콘을 만듭니다."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecStartup} "PC를 켜면 프로그램이 자동으로 열립니다. 13:30 지난주 리포트 자동 생성을 놓치지 않도록 권장합니다."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Section "Uninstall"
  Delete "$INSTDIR\SBCP.html"
  Delete "$INSTDIR\사용설명서.html"
  Delete "$INSTDIR\sbcp.ico"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$DESKTOP\${APPNAME}.lnk"
  Delete "$SMSTARTUP\${APPNAME}.lnk"
  Delete "${SMDIR}\${APPNAME}.lnk"
  Delete "${SMDIR}\사용설명서.lnk"
  Delete "${SMDIR}\삼복출프 제거.lnk"
  RMDir "${SMDIR}"

  DeleteRegKey HKCU "${UNINSTKEY}"
  DeleteRegKey HKCU "Software\${APPKEY}"

  MessageBox MB_ICONINFORMATION "프로그램을 제거했습니다.$\r$\n출결 데이터는 브라우저에 그대로 남아 있습니다."
SectionEnd
