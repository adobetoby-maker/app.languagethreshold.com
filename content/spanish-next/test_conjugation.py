"""Gold examples catch orthography and exceptions independently of generated course JSON."""
import unittest
from conjugation import present,focused,preterite,PATTERNS
class Forms(unittest.TestCase):
 def test_present_exceptions(self):
  for v,expected in {'dar':'doy das da damos dan','coger':'cojo coges coge cogemos cogen','oír':'oigo oyes oye oímos oyen','almorzar':'almuerzo almuerzas almuerza almorzamos almuerzan','conocer':'conozco conoces conoce conocemos conocen','seguir':'sigo sigues sigue seguimos siguen'}.items():self.assertEqual(present(v),expected.split())
 def test_each_family_gold(self):
  gold=[('present-ar','hablar','yo','hablo'),('present-er','comer','nosotros','comemos'),('present-ir','vivir','nosotros','vivimos'),('present-e-ie','preferir','yo','prefiero'),('present-o-ue','dormir','ellos_ustedes','duermen'),('present-e-i','medir','yo','mido'),('present-go','decir','nosotros','decimos'),('present-zco','agradecer','yo','agradezco'),('reflexive','lavarse','nosotros','nos lavamos'),('near-future','hablar','tú','vas a hablar'),('preterite-ar','hablar','él_ella_usted','habló'),('preterite-er-ir','comer','tú','comiste'),('preterite-spelling','empezar','yo','empecé'),('preterite-strong','hacer','él_ella_usted','hizo'),('preterite-stem','dormir','ellos_ustedes','durmieron'),('imperfect-ar','hablar','nosotros','hablábamos'),('imperfect-er-ir','leer','nosotros','leíamos'),('future','hacer','tú','harás'),('conditional','tener','nosotros','tendríamos'),('subjunctive','dormir','nosotros','durmamos'),('past-subjunctive','ir','nosotros','fuéramos'),('command-tu','decir','tú','di'),('command-negative','tener','tú','no tengas'),('command-formal','ir','ustedes','vayan'),('progressive','seguir','yo','estoy siguiendo'),('perfect','romper','yo','he roto'),('pluperfect','escribir','nosotros','habíamos escrito'),('conditional-perfect','abrir','ellos_ustedes','habrían abierto')]
  self.assertEqual({x[0] for x in gold},{p[0] for p in PATTERNS})
  for pattern,verb,person,expected in gold:
   with self.subTest(pattern=pattern):self.assertEqual(focused(verb,pattern)[person],expected)
 def test_past_and_spelling_contrasts(self):
  for v,expected in {'dar':'di diste dio dimos dieron','decir':'dije dijiste dijo dijimos dijeron','leer':'leí leíste leyó leímos leyeron','buscar':'busqué buscaste buscó buscamos buscaron','jugar':'jugué jugaste jugó jugamos jugaron','pedir':'pedí pediste pidió pedimos pidieron'}.items():self.assertEqual(preterite(v),expected.split())
if __name__=='__main__':unittest.main()
