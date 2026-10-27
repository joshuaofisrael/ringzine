import re,sys,pathlib,html
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '_site')
LEGAL={'terms','privacy','disclaimer','ad-disclosure','copyright'}
bad=0
for f in sorted(root.rglob('*.html')):
    rel=f.relative_to(root).as_posix()
    raw=f.read_text()
    first=rel.split('/')[0]
    body=re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>','',raw)
    # include visible attrs alt/title/aria-label/content of meta description
    attrs=' '.join(re.findall(r'(?:alt|aria-label|title)="([^"]*)"',body))
    text=html.unescape(re.sub(r'<[^>]+>',' ',body))+' '+html.unescape(attrs)
    probs=[]
    for m in re.finditer(r'.{0,30}[\u2014\u2013\u2012\u2011\u2010].{0,30}',text): probs.append('DASH:'+m.group(0))
    for m in re.finditer(r'.{0,30}(?:\w-\w|\s-\s|\s-\w|\w-\s).{0,30}',text):
        s=m.group(0)
        probs.append('HYPHEN:'+s)
    if first not in LEGAL:
        for m in re.finditer(r'.{0,40}(Joshua|Israel Ventures).{0,40}',text): probs.append('NAME:'+m.group(0))
    for pat in [r'(?i:evnews|ev news|electric vehicle|adsense|pagead|ezoic|ca-pub|ads\.txt)',r'\bSignal\b',r'(?i:\blondon\b|united kingdom|england|britain)|\bUK\b|\bU\.K\.']:
        for m in re.finditer(r'.{0,30}(?:'+pat+r').{0,30}',raw): probs.append('BAN:'+m.group(0))
    if probs:
        bad+=1; print('==',rel); [print('  ',p.replace('\n',' ')) for p in dict.fromkeys(probs)]
print('files with issues:',bad)
