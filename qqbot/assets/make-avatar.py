from PIL import Image, ImageDraw, ImageFilter
import math, random

S = 2048          # supersample canvas
F = S / 1024.0    # scale from 1024 design space

def sc(*v):
    return [x * F for x in v]

img = Image.new("RGB", (S, S), "#dff2ff")
d = ImageDraw.Draw(img, "RGBA")

# ---- background: vertical gradient + light halo -------------------------
top, bot = (223, 242, 255), (150, 202, 240)
for y in range(S):
    t = y / (S - 1)
    d.line([(0, y), (S, y)], fill=(
        int(top[0] + (bot[0] - top[0]) * t),
        int(top[1] + (bot[1] - top[1]) * t),
        int(top[2] + (bot[2] - top[2]) * t), 255))

halo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
hd = ImageDraw.Draw(halo)
hd.ellipse(sc(80, 60, 944, 924), fill=(255, 255, 255, 90))
img = Image.alpha_composite(img.convert("RGBA"), halo.filter(ImageFilter.GaussianBlur(60 * F)))
d = ImageDraw.Draw(img, "RGBA")

# ---- bubbles ------------------------------------------------------------
random.seed(7)
for _ in range(16):
    x, y = random.uniform(60, 964), random.uniform(40, 980)
    r = random.uniform(6, 26)
    d.ellipse(sc(x - r, y - r, x + r, y + r), fill=(255, 255, 255, 70))
    d.ellipse(sc(x - r * 0.45, y - r * 0.55, x - r * 0.1, y - r * 0.2), fill=(255, 255, 255, 120))

# ---- body / hoodie ------------------------------------------------------
d.ellipse(sc(238, 812, 786, 1180), fill=(63, 111, 181, 255))          # shoulders
d.ellipse(sc(352, 860, 672, 1120), fill=(143, 195, 234, 255))         # belly panel
# flippers
d.ellipse(sc(206, 906, 330, 1042), fill=(52, 94, 158, 255))
d.ellipse(sc(694, 906, 818, 1042), fill=(52, 94, 158, 255))

# ---- back hair ----------------------------------------------------------
d.ellipse(sc(292, 300, 732, 900), fill=(38, 48, 76, 255))
d.ellipse(sc(238, 640, 360, 968), fill=(38, 48, 76, 255))
d.ellipse(sc(664, 640, 786, 968), fill=(38, 48, 76, 255))

# ---- hood (whale head) --------------------------------------------------
hood = Image.new("RGBA", (S, S), (0, 0, 0, 0))
gh = ImageDraw.Draw(hood)
gh.ellipse(sc(268, 190, 756, 760), fill=(63, 111, 181, 255))          # main hood
gh.ellipse(sc(300, 300, 724, 742), fill=(31, 61, 107, 255))          # hood interior (dark)
img = Image.alpha_composite(img, hood)
d = ImageDraw.Draw(img, "RGBA")

# hood rim highlight
d.arc(sc(268, 190, 756, 760), 200, 340, fill=(143, 195, 234, 255), width=int(16 * F))
# whale eyes on the hood
for cx in (352, 672):
    d.ellipse(sc(cx - 26, 300, cx + 26, 352), fill=(240, 250, 255, 255))
    d.ellipse(sc(cx - 12, 314, cx + 12, 338), fill=(31, 61, 107, 255))
# whale cheeks
d.ellipse(sc(316, 372, 388, 408), fill=(247, 168, 186, 140))
d.ellipse(sc(636, 372, 708, 408), fill=(247, 168, 186, 140))

# ---- hair bangs ---------------------------------------------------------
d.ellipse(sc(318, 300, 706, 520), fill=(38, 48, 76, 255))             # bangs mass
# side locks with whale-fluke tips
d.polygon(sc(300, 400, 372, 980, 236, 980), fill=(38, 48, 76, 255))
d.polygon(sc(652, 400, 724, 980, 788, 980), fill=(38, 48, 76, 255))
# fluke curls
d.ellipse(sc(212, 930, 320, 1006), fill=(38, 48, 76, 255))
d.ellipse(sc(704, 930, 812, 1006), fill=(38, 48, 76, 255))
# hair shine
d.arc(sc(330, 316, 694, 470), 200, 340, fill=(74, 92, 132, 255), width=int(14 * F))

# ---- face ---------------------------------------------------------------
d.ellipse(sc(344, 400, 680, 690), fill=(255, 227, 211, 255))
# ears hidden by hood; blush
d.ellipse(sc(372, 580, 452, 616), fill=(247, 168, 186, 110))
d.ellipse(sc(572, 580, 652, 616), fill=(247, 168, 186, 110))

# ---- eyes ---------------------------------------------------------------
def eye(cx, flip=1):
    # white
    d.ellipse(sc(cx - 52, 500, cx + 52, 604), fill=(255, 255, 255, 255))
    # iris
    d.ellipse(sc(cx - 36, 512, cx + 36, 610), fill=(46, 92, 132, 255))
    # iris gradient bottom
    d.ellipse(sc(cx - 30, 552, cx + 30, 608), fill=(94, 176, 214, 255))
    # pupil
    d.ellipse(sc(cx - 20, 520, cx + 20, 586), fill=(24, 40, 60, 255))
    # highlights
    d.ellipse(sc(cx - 22, 512, cx + 6, 548), fill=(255, 255, 255, 235))
    d.ellipse(sc(cx + 8, 560, cx + 26, 578), fill=(255, 255, 255, 180))
    # lashes
    d.arc(sc(cx - 56, 486, cx + 56, 610), 200, 340, fill=(24, 30, 44, 255), width=int(12 * F))

eye(452)
eye(572)
# brows
d.arc(sc(408, 462, 496, 512), 200, 340, fill=(70, 62, 70, 220), width=int(7 * F))
d.arc(sc(528, 462, 616, 512), 200, 340, fill=(70, 62, 70, 220), width=int(7 * F))
# nose
d.arc(sc(500, 610, 524, 630), 200, 340, fill=(230, 168, 150, 200), width=int(5 * F))
# mouth (small smile)
d.arc(sc(478, 626, 546, 676), 20, 160, fill=(196, 100, 104, 235), width=int(8 * F))

# ---- water spout --------------------------------------------------------
sp = Image.new("RGBA", (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(sp)
for i, (x, y, r) in enumerate([(512, 150, 34), (466, 104, 26), (558, 104, 26), (512, 66, 18)]):
    sd.ellipse(sc(x - r, y - r, x + r, y + r), fill=(255, 255, 255, 220))
for i in range(14):
    a = math.pi * (0.15 + 0.7 * i / 13)
    x = 512 + math.cos(a) * random.uniform(70, 110)
    y = 170 - math.sin(a) * random.uniform(50, 90)
    r = random.uniform(4, 10)
    sd.ellipse(sc(x - r, y - r, x + r, y + r), fill=(255, 255, 255, 170))
img = Image.alpha_composite(img, sp)

# ---- finish -------------------------------------------------------------
out = img.convert("RGB").resize((1024, 1024), Image.LANCZOS)
out.save(r"G:\dsh\qqbot\assets\whale-girl.png", "PNG")
print("saved", out.size)