; 설치 파일·업데이트 파일 공통: 브라우저 찾기 + 전체 화면 바로가기
;
; 웹페이지는 스스로 전체 화면(F11)이 될 수 없어서(브라우저 보안 정책),
; 바로가기가 브라우저를 --start-fullscreen 옵션으로 직접 켜게 한다.
; 출결 데이터는 브라우저마다 따로 저장되므로, 예전에 쓰던 브라우저를 고르게 하고 그 선택을 기억한다.

!include "LogicLib.nsh"

Var BROWSER   ; 선택된 브라우저 실행 파일 경로 (없으면 기본 브라우저로 HTML을 연다)
Var CHROME
Var EDGE

; App Paths 레지스트리(64/32비트)와 기본 설치 위치에서 실행 파일을 찾는다
!macro _SBCP_FindExe exe dir1 dir2 dir3 out
  StrCpy ${out} ""
  SetRegView 64
  ReadRegStr ${out} HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${exe}" ""
  SetRegView 32
  ${If} ${out} == ""
    ReadRegStr ${out} HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${exe}" ""
  ${EndIf}
  ${If} ${out} == ""
    ReadRegStr ${out} HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${exe}" ""
  ${EndIf}
  ${IfNot} ${FileExists} "${out}"
    StrCpy ${out} ""
  ${EndIf}
  ${If} ${out} == ""
  ${AndIf} ${FileExists} "${dir1}\${exe}"
    StrCpy ${out} "${dir1}\${exe}"
  ${EndIf}
  ${If} ${out} == ""
  ${AndIf} ${FileExists} "${dir2}\${exe}"
    StrCpy ${out} "${dir2}\${exe}"
  ${EndIf}
  ${If} ${out} == ""
  ${AndIf} ${FileExists} "${dir3}\${exe}"
    StrCpy ${out} "${dir3}\${exe}"
  ${EndIf}
!macroend

Function SBCP_ChooseBrowser
  ; 이미 고른 적이 있고 그 브라우저가 아직 있으면 그대로 쓴다 (업데이트 때 다시 묻지 않음)
  ReadRegStr $BROWSER HKCU "Software\SBCP" "Browser"
  ${If} $BROWSER != ""
  ${AndIf} ${FileExists} "$BROWSER"
    Return
  ${EndIf}

  !insertmacro _SBCP_FindExe "chrome.exe" "$PROGRAMFILES64\Google\Chrome\Application" "$PROGRAMFILES32\Google\Chrome\Application" "$LOCALAPPDATA\Google\Chrome\Application" $CHROME
  !insertmacro _SBCP_FindExe "msedge.exe" "$PROGRAMFILES32\Microsoft\Edge\Application" "$PROGRAMFILES64\Microsoft\Edge\Application" "$LOCALAPPDATA\Microsoft\Edge\Application" $EDGE

  ${If} $CHROME != ""
  ${AndIf} $EDGE != ""
    MessageBox MB_YESNO|MB_ICONQUESTION "출결 프로그램을 어떤 브라우저로 열까요?$\r$\n$\r$\n\
예전에 출결 프로그램을 열던 브라우저를 고르세요.$\r$\n\
(출결 데이터는 브라우저마다 따로 저장되어, 다른 브라우저로 열면 데이터가 보이지 않습니다)$\r$\n$\r$\n\
[예] 크롬 (Chrome)$\r$\n\
[아니요] 엣지 (Edge)" /SD IDYES IDNO useEdge
    StrCpy $BROWSER $CHROME
    Goto chosen
    useEdge:
    StrCpy $BROWSER $EDGE
  ${ElseIf} $CHROME != ""
    StrCpy $BROWSER $CHROME
  ${ElseIf} $EDGE != ""
    StrCpy $BROWSER $EDGE
  ${Else}
    StrCpy $BROWSER ""
  ${EndIf}
  chosen:
  WriteRegStr HKCU "Software\SBCP" "Browser" "$BROWSER"
FunctionEnd

; 바로가기: 브라우저를 전체 화면으로 켜서 출결 프로그램을 연다
; (브라우저를 못 찾으면 예전처럼 HTML을 기본 브라우저로 연다 → 첫 입력 때 화면 안에서 전체 화면 전환)
!macro SBCP_Shortcut lnk
  ${If} $BROWSER != ""
    CreateShortcut "${lnk}" "$BROWSER" '--start-fullscreen "$INSTDIR\SBCP.html"' "$INSTDIR\sbcp.ico" 0
  ${Else}
    CreateShortcut "${lnk}" "$INSTDIR\SBCP.html" "" "$INSTDIR\sbcp.ico" 0
  ${EndIf}
!macroend
