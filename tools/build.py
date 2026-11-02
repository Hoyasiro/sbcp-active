"""설치 파일 빌드

    python3 tools/build.py

만드는 것
  build/SBCP.html      index.html + css + js를 한 파일로 합친 실행 파일 (폴더가 빠져도 깨지지 않도록)
  build/manual.html    docs/사용설명서.md → HTML (설치 후 '사용설명서.html'로 들어감)
  release/SBCP_Setup_v<버전>.exe   처음 설치용 (설치 마법사, 바로가기 생성)
  release/SBCP_Update_v<버전>.exe  업데이트용 (이미 설치된 PC에서 프로그램 파일만 교체)

필요한 것: Python 3, `pip install markdown`, NSIS(makensis)
  - Ubuntu: sudo apt install nsis   /  Windows: https://nsis.sourceforge.io
"""
import base64
import io
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
RELEASE = os.path.join(ROOT, "release")


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read()


def app_version():
    m = re.search(r"var APP_VERSION = 'Acad-atd-03_(\d+\.\d+)", read("js/main.js"))
    if not m:
        sys.exit("js/main.js 에서 APP_VERSION을 찾지 못했습니다.")
    return m.group(1)


def favicon_data_uri():
    """installer/sbcp.ico 의 32px 그림을 파비콘으로 넣는다 (Pillow가 없으면 생략)."""
    try:
        from PIL import Image
    except ImportError:
        return None
    img = Image.open(os.path.join(ROOT, "installer", "sbcp.ico"))
    buf = io.BytesIO()
    img.convert("RGBA").resize((32, 32)).save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def build_app():
    html = read("index.html")
    css = read("css/style.css")
    js = read("js/main.js").replace("</script>", "<\\/script>")

    for old, new in [
        ('<link rel="stylesheet" href="css/style.css">', "<style>\n" + css + "\n</style>"),
        ('<script src="js/main.js"></script>', "<script>\n" + js + "\n</script>"),
    ]:
        if old not in html:
            sys.exit(f"index.html 에서 '{old}' 를 찾지 못했습니다.")
        html = html.replace(old, new)

    icon = favicon_data_uri()
    if icon:
        html = html.replace('<link rel="icon" href="data:,">', f'<link rel="icon" href="{icon}">')
    return html


MANUAL_CSS = """
:root { --pink:#eb3192; --navy:#05055d; --text:#1a1a2e; --text2:#6b6b8a; --line:#f0d0e8; --soft:#fdf0f8; }
* { box-sizing:border-box; }
body { margin:0; font-family:'Malgun Gothic','맑은 고딕','Noto Sans KR',sans-serif; color:var(--text); background:#fff; line-height:1.75; }
main { max-width:860px; margin:0 auto; padding:40px 24px 80px; }
h1 { color:var(--navy); font-size:28px; border-bottom:4px solid var(--pink); padding-bottom:12px; }
h2 { color:var(--navy); font-size:22px; margin-top:48px; padding:8px 14px; background:var(--soft); border-left:6px solid var(--pink); border-radius:6px; }
h3 { color:var(--navy); font-size:18px; margin-top:28px; }
table { border-collapse:collapse; width:100%; margin:14px 0; font-size:15px; }
th, td { border:1px solid var(--line); padding:9px 12px; text-align:left; vertical-align:top; }
th { background:var(--soft); color:var(--navy); }
code { background:#f4f4f8; padding:2px 6px; border-radius:4px; font-size:14px; }
pre { background:#1a1a2e; color:#fff; padding:14px 16px; border-radius:8px; overflow-x:auto; }
pre code { background:none; color:inherit; padding:0; }
blockquote { margin:14px 0; padding:10px 16px; background:#fff8e1; border-left:5px solid #f5b400; border-radius:6px; }
blockquote p { margin:4px 0; }
a { color:var(--pink); }
hr { border:none; border-top:1px dashed var(--line); margin:36px 0; }
.toc { background:var(--soft); border-radius:10px; padding:14px 22px; }
.toc ul { margin:4px 0; }
@media print { h2 { break-before:page; } a { color:inherit; } }
"""


def build_manual():
    import markdown
    from markdown.extensions.toc import TocExtension, slugify_unicode

    md = read("docs/사용설명서.md")
    conv = markdown.Markdown(extensions=["tables", "fenced_code", TocExtension(slugify=slugify_unicode, toc_depth="2")])
    body = conv.convert(md)
    # 제목(h1) 바로 뒤에 목차를 넣는다
    body = body.replace("</h1>", "</h1>\n<nav class=\"toc\"><b>목차</b>" + conv.toc + "</nav>", 1)
    title = re.search(r"^# (.+)$", md, re.M).group(1)
    return (
        "<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n<meta charset=\"UTF-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n"
        f"<title>{title}</title>\n<style>{MANUAL_CSS}</style>\n</head>\n<body><main>\n"
        + body + "\n</main></body>\n</html>\n"
    )


def main():
    version = app_version()
    os.makedirs(BUILD, exist_ok=True)
    os.makedirs(RELEASE, exist_ok=True)

    with open(os.path.join(BUILD, "SBCP.html"), "w", encoding="utf-8") as f:
        f.write(build_app())
    with open(os.path.join(BUILD, "manual.html"), "w", encoding="utf-8") as f:
        f.write(build_manual())
    print("build/SBCP.html, build/manual.html 생성")

    makensis = shutil.which("makensis")
    if not makensis:
        sys.exit("makensis(NSIS)가 없어 설치 파일은 만들지 않았습니다.")
    # 예전 버전 파일은 지운다 (release 폴더에는 최신 버전만 둔다)
    for name in os.listdir(RELEASE):
        if name.startswith(("SBCP_Setup_v", "SBCP_Update_v")) and f"_v{version}." not in name:
            os.remove(os.path.join(RELEASE, name))
    for script, out in [("sbcp.nsi", "Setup"), ("sbcp_update.nsi", "Update")]:
        subprocess.run([makensis, "-V2", f"-DVERSION={version}", script],
                       cwd=os.path.join(ROOT, "installer"), check=True)
        print(f"release/SBCP_{out}_v{version}.exe 생성")


if __name__ == "__main__":
    main()
