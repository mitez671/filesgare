#!/data/data/com.termux/files/usr/bin/bash
# One-time setup on Android / Termux, then starts the dashboard.
#   bash termux_setup.sh
set -e
pkg update -y
pkg install -y python python-numpy git
# prebuilt scientific packages (much faster than compiling on the phone)
pkg install -y tur-repo || true
pkg install -y python-pandas 2>/dev/null || pip install pandas
# optional: stronger ML models; if it fails the built-in NumPy model is used
pkg install -y python-scikit-learn 2>/dev/null || pip install scikit-learn || echo "scikit-learn skipped (NumPy model will be used)"
termux-wake-lock 2>/dev/null || true   # keep running while the screen is off
python -m gold_analyzer --web --open
