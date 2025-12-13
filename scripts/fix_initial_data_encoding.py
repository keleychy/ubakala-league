#!/usr/bin/env python3
"""Detect and re-encode initial_data.json to UTF-8 (no BOM)."""
import sys
from pathlib import Path


def detect_and_rewrite(path: Path) -> bool:
    raw = path.read_bytes()
    # Try common encodings
    encodings = ['utf-8', 'utf-8-sig', 'utf-16', 'utf-16-le', 'utf-16-be', 'latin-1']
    for enc in encodings:
        try:
            text = raw.decode(enc)
            # If decoding succeeded, write back as utf-8 (no BOM)
            path.write_text(text, encoding='utf-8')
            print(f"Rewrote {path} from {enc} -> utf-8")
            return True
        except Exception:
            continue
    print(f"Failed to decode {path} using common encodings.")
    return False


def main():
    p = Path(__file__).resolve().parent.parent / 'initial_data.json'
    if not p.exists():
        print(f"File not found: {p}")
        sys.exit(2)
    ok = detect_and_rewrite(p)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
