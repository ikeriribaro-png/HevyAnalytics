#!/usr/bin/env bash
# Starts the dashboard on http://localhost:5555 (override with: ./start.sh 8080)
cd "$(dirname "${BASH_SOURCE[0]}")" && exec python3 server.py "${1:-5555}"
