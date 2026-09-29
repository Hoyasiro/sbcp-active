#!/bin/bash
# macOS: 더블클릭 실행용 (처음 한 번: 터미널에서 chmod +x start_mac.command)
cd "$(dirname "$0")"
python3 serve_local.py
