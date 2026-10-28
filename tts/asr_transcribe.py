import sys, json, os
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
from faster_whisper import WhisperModel

wav = r"E:\dsh_chatting_bot\tts\assets\tomori_raw.wav"
model_size = sys.argv[1] if len(sys.argv) > 1 else "small"
model = WhisperModel(model_size, device="cpu", compute_type="int8")
segments, info = model.transcribe(wav, vad_filter=True, beam_size=5)
print("detected_language", info.language, round(info.language_probability, 3), flush=True)
out = []
for s in segments:
    out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
    print(f"[{s.start:6.1f}-{s.end:6.1f}] {s.text.strip()}", flush=True)
with open(r"E:\dsh_chatting_bot\tts\assets\tomori_asr.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("segments", len(out))
