# Original RingZine graphic cards (no photos, no promotion logos). Pillow only.
import sys, os
from PIL import Image, ImageDraw, ImageFont
F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def card(path, kicker, title, accent):
    W,H=1280,720
    im=Image.new("RGB",(W,H),(14,18,32)); d=ImageDraw.Draw(im)
    for i in range(0,H,6): d.line([(0,i),(W,i)],fill=(18,23,40))
    # ring posts and ropes
    for k,(c) in enumerate([(200,40,50),(235,235,240),(40,80,190)]):
        y=470+k*60; d.line([(60,y),(W-60,y-40)],fill=c,width=10)
    d.rectangle([40,380,80,700],fill=(120,125,140)); d.rectangle([W-80,340,W-40,700],fill=(120,125,140))
    d.rectangle([0,0,W,14],fill=accent)
    d.rounded_rectangle([70,70,70+30*len(kicker)+40,130],12,fill=accent)
    d.text((90,78),kicker,font=ImageFont.truetype(F,40),fill=(255,255,255))
    f=ImageFont.truetype(F,64); words=title.split(); lines=[]; cur=""
    for w in words:
        t=(cur+" "+w).strip()
        if d.textlength(t,font=f)>W-160: lines.append(cur); cur=w
        else: cur=t
    lines.append(cur)
    for i,l in enumerate(lines[:3]): d.text((70,170+i*80),l,font=f,fill=(255,255,255))
    d.text((W-330,H-70),"RINGZINE",font=ImageFont.truetype(F,48),fill=accent)
    im.save(path+".webp",quality=80); im.save(path+".avif",quality=60)
if __name__=="__main__":
    out,kicker,title,acc=sys.argv[1:5]
    card(out,kicker,title,tuple(int(acc[i:i+2],16) for i in (0,2,4)))
