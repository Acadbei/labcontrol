import sys
import asyncio
import edge_tts

# Ensure UTF-8 IO on Windows
if hasattr(sys.stdin, "reconfigure"):
    try:
        sys.stdin.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

async def main():
    voice = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].strip() else "uz-UZ-MadinaNeural"
    raw_bytes = sys.stdin.buffer.read()
    text = raw_bytes.decode("utf-8", errors="replace").strip()
    if not text:
        sys.exit(0)

    # Normalize Uzbek apostrophes for Edge-TTS:
    # Edge-TTS uz-UZ models pronounce text best when apostrophes like ‘, ’, ʻ, ʼ, ` are standardized to '
    text = (
        text.replace("‘", "'")
        .replace("’", "'")
        .replace("ʻ", "'")
        .replace("ʼ", "'")
        .replace("`", "'")
    )

    if len(text) > 4000:
        text = text[:4000]

    communicate = edge_tts.Communicate(text, voice)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            sys.stdout.buffer.write(chunk["data"])
            sys.stdout.buffer.flush()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        sys.stderr.write(str(e))
        sys.exit(1)
