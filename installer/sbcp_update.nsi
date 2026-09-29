; 삼복출프(SBCP) 업데이트 파일
; 이미 설치된 PC에서 프로그램 파일(SBCP.html)과 사용설명서만 새 버전으로 바꾼다.
;   - 설치 위치는 설치 파일이 남겨 둔 기록(레지스트리)에서 찾는다 → 고를 것 없음
;   - 바로가기·자동 실행 설정·출결 데이터(브라우저 저장)는 그대로 둔다
; 빌드: python3 tools/build.py

Unicode true
SetCompressor /SOLID lzma

!ifndef VERSION
  !define VERSION "1.6"
!endif
!define APPNAME   "삼복출프 출결"
!define APPKEY    "SBCP"
!define PUBLISHER "삼성영어 셀레나"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPKEY}"

Name "${APPNAME} v${VERSION} 업데이트"
Caption "${APPNAME} v${VERSION} 업데이트"
OutFile "../release/SBCP_Update_v${VERSION}.exe"
Icon "sbcp.ico"
RequestExecutionLevel user
BrandingText "${APPNAME} v${VERSION}"
ShowInstDetails nevershow
AutoCloseWindow true

VIProductVersion "${VERSION}.0.0"
VIAddVersionKey /LANG=1042 "ProductName" "${APPNAME}"
VIAddVersionKey /LANG=1042 "FileDescription" "${APPNAME} 업데이트"
VIAddVersionKey /LANG=1042 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1042 "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=1042 "CompanyName" "${PUBLISHER}"
VIAddVersionKey /LANG=1042 "LegalCopyright" "${PUBLISHER}"

LoadLanguageFile "${NSISDIR}\Contrib\Language files\Korean.nlf"

; 진행 막대 한 화면만 잠깐 보이고 닫힌다
Page instfiles

Section
  ReadRegStr $INSTDIR HKCU "Software\${APPKEY}" "InstallDir"
  StrCmp $INSTDIR "" notInstalled
  IfFileExists "$INSTDIR\SBCP.html" 0 notInstalled

  SetOutPath "$INSTDIR"
  SetOverwrite on
  File "../build/SBCP.html"
  File "/oname=사용설명서.html" "../build/manual.html"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayVersion" "${VERSION}"

  MessageBox MB_YESNO|MB_ICONINFORMATION "v${VERSION} 업데이트가 끝났습니다.$\r$\n$\r$\n\
출결 데이터와 설정은 그대로 유지됩니다.$\r$\n\
이미 열려 있는 프로그램 창이 있다면 F5 키를 눌러 새로고침해 주세요.$\r$\n$\r$\n\
지금 프로그램을 열까요?" IDNO done
  ExecShell "open" "$INSTDIR\SBCP.html"
  Goto done

notInstalled:
  MessageBox MB_ICONEXCLAMATION "이 PC에는 ${APPNAME}이(가) 설치되어 있지 않습니다.$\r$\n$\r$\n\
업데이트 파일은 이미 설치된 PC에서만 쓸 수 있습니다.$\r$\n\
처음 설치할 때는 설치 파일(SBCP_Setup_v${VERSION}.exe)을 실행해 주세요."
  Abort

done:
SectionEnd
