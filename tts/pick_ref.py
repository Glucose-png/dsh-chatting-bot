import os, subprocess, sys
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
from faster_whisper import WhisperModel

ff = r"C:\ffmpeg-2026-06-15-git-44d082edc8-essentials_build\bin\ffmpeg.exe"
src = r"E:\dsh_chatting_bot\tts\assets\tomori_raw.wav"
cands = {"a": (8.5, 15.0), "b": (29.5, 37.5), "c": (44.8, 52.0), "d": (52.4, 60.5), "e": (59.8, 69.0)}
out_dir = r"E:\dsh_chatting_bot\tts\assets\cand"
os.makedirs(out_dir, exist_ok=True)
paths = {}
for k, (s, e) in cands.items():
    p = os.path.join(out_dir, f"{k}.wav")
    subprocess.run([ff, "-y", "-v", "error", "-ss", str(s), "-to", str(e), "-i", src,
                    "-ar", "32000", "-ac", "1", "-af", "loudnorm=I=-18:TP=-2", p], check=True)
    paths[k] = p

model = WhisperModel("medium", device="cpu", compute_type="int8")
for k, p in paths.items():
    segs, info = model.transcribe(p, language="ja", beam_size=5, vad_filter=False)
    txt = "".join(s.text for s in segs).strip()
    print(f"{k}: {cands[k]} lang={info.language} text={txt}", flush=True)
