from pathlib import Path
import json
r=Path(__file__).resolve().parent.parent
v=json.loads((r/'content/spanish-basics/verbs.json').read_text()); lex=json.loads((r/'content/spanish-basics/lexicon.json').read_text())
pairs=[{'english':x['en'],'translation':x['es'],'kind':'term'} for x in lex]
for row in v:
 pairs.append({'english':row[1]+' · infinitive','translation':row[0],'kind':'term'})
 for i,(es,en) in enumerate(zip(['yo','tú','él/ella/usted','nosotros/nosotras','ellos/ellas/ustedes'],['I','you (informal singular)','he/she/you (formal singular)','we','they/you (plural)'])):
  pairs.append({'english':en+' · '+row[1]+' · present tense','translation':es+' '+row[2+i],'kind':'term'})
(r/'src/data/spanish-basics-flashcards.json').write_text(json.dumps(pairs,ensure_ascii=False,indent=2)+'\n')
