"""삼복출프(SBCP) 로컬 실행 서버

학원 PC에서 인터넷 배포(Vercel) 없이 프로그램을 쓰기 위한 실행 파일.
  - 화면 파일(index.html, css, js)을 http://localhost:8000 으로 보여 준다
  - AI 리포트 요청(POST /api/report)은 api/report.py를 그대로 불러 처리한다

실행:  윈도우 → start_windows.bat 더블클릭
       직접 → python serve_local.py

Gemini 키는 아래 순서로 찾는다. 코드에는 절대 적지 않는다.
  1) 환경변수 GEMINI_API_KEY
  2) 이 파일과 같은 폴더의 gemini_key.txt (첫 줄에 키만 적는다)

주의: 포트(8000)를 바꾸면 브라우저가 다른 사이트로 인식해 저장된 출결 데이터가
      안 보이게 된다(데이터는 주소별로 따로 저장됨). 바꾸지 말 것.
"""
import os
import sys
import posixpath
import urllib.parse
import webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HOST = "127.0.0.1"   # 이 PC에서만 접속 가능 (같은 와이파이의 다른 기기에 노출하지 않음)
PORT = 8000

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "api"))


def load_key():
    if os.environ.get("GEMINI_API_KEY"):
        return "환경변수"
    key_file = os.path.join(ROOT, "gemini_key.txt")
    if os.path.exists(key_file):
        with open(key_file, encoding="utf-8-sig") as f:   # 메모장 BOM 대응
            key = f.readline().strip()
        if key:
            os.environ["GEMINI_API_KEY"] = key
            return "gemini_key.txt"
    return None


from report import handler as ReportHandler  # noqa: E402  (경로 추가 후 import)


class LocalHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # 화면 파일 외의 파일(키 파일, 파이썬 코드 등)은 내보내지 않는다
    def do_GET(self):
        # "/css/../키파일" 같은 우회를 막기 위해 경로를 정리한 뒤 검사한다
        path = posixpath.normpath(urllib.parse.unquote(self.path.split("?")[0].split("#")[0]))
        allowed = path in ("/", "/index.html") or path.startswith(("/css/", "/js/"))
        if not allowed:
            self.send_error(404)
            return
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/report":
            self.send_error(404)
            return
        return ReportHandler.do_POST(self)

    _send = ReportHandler._send

    def log_message(self, fmt, *args):
        pass   # 접속 기록으로 창이 지저분해지지 않게 끈다


def main():
    source = load_key()
    print("=" * 52)
    print(" 삼복출프(SBCP) 출결 프로그램 - 로컬 실행")
    print("=" * 52)
    if source:
        print(f" Gemini 키: 확인됨 ({source})")
    else:
        print(" Gemini 키: 없음 -> AI 리포트 문장은 만들어지지 않습니다.")
        print("            (출결·통계·랭킹은 정상 동작)")
        print("            gemini_key.txt 파일을 만들어 키를 넣어 주세요.")

    try:
        server = ThreadingHTTPServer((HOST, PORT), LocalHandler)
    except OSError:
        print(f"\n [오류] {PORT}번 포트를 이미 사용 중입니다.")
        print("  프로그램이 이미 켜져 있는지(검은 창이 또 있는지) 확인해 주세요.")
        input("\n Enter 키를 누르면 창이 닫힙니다.")
        return

    url = f"http://localhost:{PORT}/"
    print(f"\n 주소: {url}")
    print(" 이 검은 창을 닫으면 프로그램이 멈춥니다. 수업 중에는 최소화만 해 두세요.")
    print("=" * 52)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
