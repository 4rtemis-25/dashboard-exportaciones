p=open('app.js', encoding='utf-8').read(); css=open('style.css', encoding='utf-8').read(); body=open('body.html', encoding='utf-8').read(); pa=open('parser.js', encoding='utf-8').read(); st=open('studio.js', encoding='utf-8').read()
def build(ff,th):
    return ('<title>Panel de Exportaciones</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
     '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap">\n'
     '<style>\n'+css+'\n</style>'+body+'<script src="'+ff+'"></script>\n<script src="'+th+'"></script>\n<script>\n'+pa+'\n'+st+'\n'+p+'\n</script>\n')
open('dash.html', 'w', encoding='utf-8').write(build('https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js','https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'))
open('dash_local.html', 'w', encoding='utf-8').write(build('fflate.js','three.js'))
