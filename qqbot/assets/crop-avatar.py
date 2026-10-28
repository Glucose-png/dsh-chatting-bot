from PIL import Image
src = Image.open(r"G:\dsh\qqbot\qq-bridge\assets\deepseek娘.png").convert("RGB")
w, h = src.size
side = 470
left = (w - side) // 2
top = 36
out = src.crop((left, top, left + side, top + side)).resize((1024, 1024), Image.LANCZOS)
out.save(r"G:\dsh\qqbot\assets\deepseek-girl-avatar.png", "PNG")
print("ok", out.size)