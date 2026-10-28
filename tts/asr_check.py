import sys, json
from faster_whisper import WhisperModel
m = WhisperModel("medium", device="cuda", compute_type="float16")
res = []
for p in sys.argv[1:]:
    segs, info = m.transcribe(p, language="zh", vad_filter=False)
    res.append({"file": p.split("\\")[-1], "lang": info.language, "p": round(info.language_probability, 3),
                "text": "".join(s.text for s in segs).strip()})
open(r"E:\dsh_chatting_bot\tts\asr_check.json", "w", encoding="utf-8").write(json.dumps(res, ensure_ascii=False, indent=1))
