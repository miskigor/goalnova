-- Daily Football Quiz — 100 multilingual seed questions (generated).
-- Regenerate: node scripts/build-daily-quiz-seed.mjs

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0001-4000-8000-000000000001'::uuid,
  'world_cup',
  '{"en":"Which country won the 2022 FIFA World Cup?","hr":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 2022.?","de":"Welches Land gewann die FIFA-Weltmeisterschaft 2022?","bs":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 2022.?","es":"¿Qué país ganó la Copa Mundial de la FIFA 2022?","pt":"Qual país venceu a Copa do Mundo da FIFA de 2022?","sr":"Која је земља освојила Светско првенство у фудбалу 2022.?","fr":"Quel pays a remporté la Coupe du monde de la FIFA 2022 ?","it":"Quale paese ha vinto la Coppa del Mondo FIFA 2022?","nl":"Welk land won het FIFA Wereldkampioenschap 2022?","tr":"2022 FIFA Dünya Kupası''nı hangi ülke kazandı?","ar":"أي دولة فازت بكأس العالم 2022؟"}'::jsonb,
  '{"en":["Argentina","France","Brazil","Croatia"],"hr":["Argentina","Francuska","Brazil","Hrvatska"],"de":["Argentinien","Frankreich","Brasilien","Kroatien"],"bs":["Argentina","Francuska","Brazil","Hrvatska"],"es":["Argentina","Francia","Brasil","Croacia"],"pt":["Argentina","França","Brasil","Croácia"],"sr":["Аргентина","Француска","Бразил","Хрватска"],"fr":["Argentine","France","Brésil","Croatie"],"it":["Argentina","Francia","Brasile","Croazia"],"nl":["Argentinië","Frankrijk","Brazilië","Kroatië"],"tr":["Arjantin","Fransa","Brezilya","Hırvatistan"],"ar":["الأرجنتين","فرنسا","البرازيل","كرواتيا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0002-4000-8000-000000000002'::uuid,
  'world_cup',
  '{"en":"Which country has won the most FIFA World Cup titles?","hr":"Koja zemlja ima najviše naslova svjetskog prvaka u nogometu?","de":"Welches Land hat die meisten FIFA-Weltmeistertitel gewonnen?","bs":"Koja zemlja ima najviše naslova svjetskog prvaka u nogometu?","es":"¿Qué país ha ganado más títulos de la Copa Mundial de la FIFA?","pt":"Qual país venceu mais títulos da Copa do Mundo da FIFA?","sr":"Која земља има највише титула светског првака у фудбалу?","fr":"Quel pays a remporté le plus de titres de Coupe du monde de la FIFA ?","it":"Quale paese ha vinto più titoli di Coppa del Mondo FIFA?","nl":"Welk land heeft de meeste FIFA Wereldkampioenschappen gewonnen?","tr":"En fazla FIFA Dünya Kupası şampiyonluğuna sahip ülke hangisidir?","ar":"أي دولة فازت بأكبر عدد من كؤوس العالم؟"}'::jsonb,
  '{"en":["Brazil","Germany","Italy","Argentina"],"hr":["Brazil","Njemačka","Italija","Argentina"],"de":["Brasilien","Deutschland","Italien","Argentinien"],"bs":["Brazil","Njemačka","Italija","Argentina"],"es":["Brasil","Alemania","Italia","Argentina"],"pt":["Brasil","Alemanha","Itália","Argentina"],"sr":["Бразил","Немачка","Италија","Аргентина"],"fr":["Brésil","Allemagne","Italie","Argentine"],"it":["Brasile","Germania","Italia","Argentina"],"nl":["Brazilië","Duitsland","Italië","Argentinië"],"tr":["Brezilya","Almanya","İtalya","Arjantin"],"ar":["البرازيل","ألمانيا","إيطاليا","الأرجنتين"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0003-4000-8000-000000000003'::uuid,
  'world_cup',
  '{"en":"In which year was the first FIFA World Cup held?","hr":"U kojoj godini je održano prvo FIFA Svjetsko prvenstvo?","de":"In welchem Jahr fand die erste FIFA-Weltmeisterschaft statt?","bs":"U kojoj godini je održano prvo FIFA Svjetsko prvenstvo?","es":"¿En qué año se celebró la primera Copa Mundial de la FIFA?","pt":"Em que ano foi realizada a primeira Copa do Mundo da FIFA?","sr":"У којој години је одржано прво Светско првенство у фудбалу?","fr":"En quelle année a eu lieu la première Coupe du monde de la FIFA ?","it":"In quale anno si è svolta la prima Coppa del Mondo FIFA?","nl":"In welk jaar werd het eerste FIFA Wereldkampioenschap gehouden?","tr":"İlk FIFA Dünya Kupası hangi yılda düzenlendi?","ar":"في أي عام أقيمت أول كأس عالم لكرة القدم؟"}'::jsonb,
  '{"en":["1930","1928","1934","1926"],"hr":["1930.","1928.","1934.","1926."],"de":["1930","1928","1934","1926"],"bs":["1930.","1928.","1934.","1926."],"es":["1930","1928","1934","1926"],"pt":["1930","1928","1934","1926"],"sr":["1930.","1928.","1934.","1926."],"fr":["1930","1928","1934","1926"],"it":["1930","1928","1934","1926"],"nl":["1930","1928","1934","1926"],"tr":["1930","1928","1934","1926"],"ar":["1930","1928","1934","1926"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0004-4000-8000-000000000004'::uuid,
  'world_cup',
  '{"en":"Which country hosted the 2018 FIFA World Cup?","hr":"Koja je zemlja bila domaćin FIFA Svjetskog prvenstva 2018.?","de":"Welches Land war Gastgeber der FIFA-Weltmeisterschaft 2018?","bs":"Koja je zemlja bila domaćin FIFA Svjetskog prvenstva 2018.?","es":"¿Qué país fue sede de la Copa Mundial de la FIFA 2018?","pt":"Qual país sediou a Copa do Mundo da FIFA de 2018?","sr":"Која је земља била домаћин Светског првенства 2018.?","fr":"Quel pays a accueilli la Coupe du monde de la FIFA 2018 ?","it":"Quale paese ha ospitato la Coppa del Mondo FIFA 2018?","nl":"Welk land organiseerde het FIFA Wereldkampioenschap 2018?","tr":"2018 FIFA Dünya Kupası''na hangi ülke ev sahipliği yaptı?","ar":"أي دولة استضافت كأس العالم 2018؟"}'::jsonb,
  '{"en":["Russia","Qatar","Brazil","South Africa"],"hr":["Rusija","Katar","Brazil","Južna Afrika"],"de":["Russland","Katar","Brasilien","Südafrika"],"bs":["Rusija","Katar","Brazil","Južna Afrika"],"es":["Rusia","Catar","Brasil","Sudáfrica"],"pt":["Rússia","Catar","Brasil","África do Sul"],"sr":["Русија","Катар","Бразил","Јужна Африка"],"fr":["Russie","Qatar","Brésil","Afrique du Sud"],"it":["Russia","Qatar","Brasile","Sudafrica"],"nl":["Rusland","Qatar","Brazilië","Zuid-Afrika"],"tr":["Rusya","Katar","Brezilya","Güney Afrika"],"ar":["روسيا","قطر","البرازيل","جنوب أفريقيا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0005-4000-8000-000000000005'::uuid,
  'world_cup',
  '{"en":"Who is the all-time top scorer in FIFA World Cup history?","hr":"Tko je najbolji strijelac u povijesti FIFA Svjetskog prvenstva?","de":"Wer ist der Rekordtorschütze in der Geschichte der FIFA-Weltmeisterschaft?","bs":"Ko je najbolji strijelac u historiji FIFA Svjetskog prvenstva?","es":"¿Quién es el máximo goleador histórico de la Copa Mundial de la FIFA?","pt":"Quem é o maior artilheiro da história da Copa do Mundo da FIFA?","sr":"Ко је најбољи стрелац у историји Светског првенства?","fr":"Qui est le meilleur buteur de l''histoire de la Coupe du monde de la FIFA ?","it":"Chi è il miglior marcatore di sempre della Coppa del Mondo FIFA?","nl":"Wie is de topscorer aller tijden op het FIFA Wereldkampioenschap?","tr":"FIFA Dünya Kupası tarihinin en golcü oyuncusu kimdir?","ar":"من هو الهداف التاريخي لكأس العالم؟"}'::jsonb,
  '{"en":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"hr":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"de":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"bs":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"es":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"pt":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"sr":["Мирослав Клозе","Роналдо Назарио","Герд Милер","Пеле"],"fr":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"it":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"nl":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"tr":["Miroslav Klose","Ronaldo Nazário","Gerd Müller","Pelé"],"ar":["ميروسلاف كلوزه","رونالدو نازاريو","غيرد مولر","بيليه"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0006-4000-8000-000000000006'::uuid,
  'world_cup',
  '{"en":"Which country won the 2014 FIFA World Cup?","hr":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 2014.?","de":"Welches Land gewann die FIFA-Weltmeisterschaft 2014?","bs":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 2014.?","es":"¿Qué país ganó la Copa Mundial de la FIFA 2014?","pt":"Qual país venceu a Copa do Mundo da FIFA de 2014?","sr":"Која је земља освојила Светско првенство 2014.?","fr":"Quel pays a remporté la Coupe du monde de la FIFA 2014 ?","it":"Quale paese ha vinto la Coppa del Mondo FIFA 2014?","nl":"Welk land won het FIFA Wereldkampioenschap 2014?","tr":"2014 FIFA Dünya Kupası''nı hangi ülke kazandı?","ar":"أي دولة فازت بكأس العالم 2014؟"}'::jsonb,
  '{"en":["Germany","Argentina","Brazil","Netherlands"],"hr":["Njemačka","Argentina","Brazil","Nizozemska"],"de":["Deutschland","Argentinien","Brasilien","Niederlande"],"bs":["Njemačka","Argentina","Brazil","Holandija"],"es":["Alemania","Argentina","Brasil","Países Bajos"],"pt":["Alemanha","Argentina","Brasil","Holanda"],"sr":["Немачка","Аргентина","Бразил","Холандија"],"fr":["Allemagne","Argentine","Brésil","Pays-Bas"],"it":["Germania","Argentina","Brasile","Paesi Bassi"],"nl":["Duitsland","Argentinië","Brazilië","Nederland"],"tr":["Almanya","Arjantin","Brezilya","Hollanda"],"ar":["ألمانيا","الأرجنتين","البرازيل","هولندا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0007-4000-8000-000000000007'::uuid,
  'world_cup',
  '{"en":"Which country hosted the 2010 FIFA World Cup?","hr":"Koja je zemlja bila domaćin FIFA Svjetskog prvenstva 2010.?","de":"Welches Land war Gastgeber der FIFA-Weltmeisterschaft 2010?","bs":"Koja je zemlja bila domaćin FIFA Svjetskog prvenstva 2010.?","es":"¿Qué país fue sede de la Copa Mundial de la FIFA 2010?","pt":"Qual país sediou a Copa do Mundo da FIFA de 2010?","sr":"Која је земља била домаћин Светског првенства 2010.?","fr":"Quel pays a accueilli la Coupe du monde de la FIFA 2010 ?","it":"Quale paese ha ospitato la Coppa del Mondo FIFA 2010?","nl":"Welk land organiseerde het FIFA Wereldkampioenschap 2010?","tr":"2010 FIFA Dünya Kupası''na hangi ülke ev sahipliği yaptı?","ar":"أي دولة استضافت كأس العالم 2010؟"}'::jsonb,
  '{"en":["South Africa","Germany","Brazil","Japan"],"hr":["Južna Afrika","Njemačka","Brazil","Japan"],"de":["Südafrika","Deutschland","Brasilien","Japan"],"bs":["Južna Afrika","Njemačka","Brazil","Japan"],"es":["Sudáfrica","Alemania","Brasil","Japón"],"pt":["África do Sul","Alemanha","Brasil","Japão"],"sr":["Јужна Африка","Немачка","Бразил","Јапан"],"fr":["Afrique du Sud","Allemagne","Brésil","Japon"],"it":["Sudafrica","Germania","Brasile","Giappone"],"nl":["Zuid-Afrika","Duitsland","Brazilië","Japan"],"tr":["Güney Afrika","Almanya","Brezilya","Japonya"],"ar":["جنوب أفريقيا","ألمانيا","البرازيل","اليابان"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0008-4000-8000-000000000008'::uuid,
  'world_cup',
  '{"en":"Who scored the ''Hand of God'' goal at the 1986 World Cup?","hr":"Tko je postigao gol ''Ruka Božja'' na Svjetskom prvenstvu 1986.?","de":"Wer erzielte das ''Hand Gottes''-Tor bei der WM 1986?","bs":"Ko je postigao gol ''Ruka Božja'' na Svjetskom prvenstvu 1986.?","es":"¿Quién marcó el gol de la ''Mano de Dios'' en el Mundial de 1986?","pt":"Quem marcou o gol da ''Mão de Deus'' na Copa de 1986?","sr":"Ко је постигао гол ''Рука Божја'' на Светском првенству 1986.?","fr":"Qui a marqué le but de la ''Main de Dieu'' en 1986 ?","it":"Chi segnò il gol della ''Mano di Dio'' ai Mondiali 1986?","nl":"Wie scoorde het ''Hand Gods''-doelpunt op het WK 1986?","tr":"1986 Dünya Kupası''nda ''Tanrı''nın Eli'' golünü kim attı?","ar":"من سجل هدف ''يد الله'' في كأس العالم 1986؟"}'::jsonb,
  '{"en":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"hr":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"de":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"bs":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"es":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"pt":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"sr":["Дијего Марадона","Пеле","Гари Лајнкер","Мишел Платини"],"fr":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"it":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"nl":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"tr":["Diego Maradona","Pelé","Gary Lineker","Michel Platini"],"ar":["دييغو مارادونا","بيليه","غاري لاينكر","ميشيل بلاتيني"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0009-4000-8000-000000000009'::uuid,
  'world_cup',
  '{"en":"Which country won the 2006 FIFA World Cup?","hr":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 2006.?","de":"Welches Land gewann die FIFA-Weltmeisterschaft 2006?","bs":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 2006.?","es":"¿Qué país ganó la Copa Mundial de la FIFA 2006?","pt":"Qual país venceu a Copa do Mundo da FIFA de 2006?","sr":"Која је земља освојила Светско првенство 2006.?","fr":"Quel pays a remporté la Coupe du monde de la FIFA 2006 ?","it":"Quale paese ha vinto la Coppa del Mondo FIFA 2006?","nl":"Welk land won het FIFA Wereldkampioenschap 2006?","tr":"2006 FIFA Dünya Kupası''nı hangi ülke kazandı?","ar":"أي دولة فازت بكأس العالم 2006؟"}'::jsonb,
  '{"en":["Italy","France","Germany","Brazil"],"hr":["Italija","Francuska","Njemačka","Brazil"],"de":["Italien","Frankreich","Deutschland","Brasilien"],"bs":["Italija","Francuska","Njemačka","Brazil"],"es":["Italia","Francia","Alemania","Brasil"],"pt":["Itália","França","Alemanha","Brasil"],"sr":["Италија","Француска","Немачка","Бразил"],"fr":["Italie","France","Allemagne","Brésil"],"it":["Italia","Francia","Germania","Brasile"],"nl":["Italië","Frankrijk","Duitsland","Brazilië"],"tr":["İtalya","Fransa","Almanya","Brezilya"],"ar":["إيطاليا","فرنسا","ألمانيا","البرازيل"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0010-4000-8000-000000000010'::uuid,
  'world_cup',
  '{"en":"Which country hosted the first FIFA World Cup in 1930?","hr":"Koja je zemlja bila domaćin prvog FIFA Svjetskog prvenstva 1930.?","de":"Welches Land war Gastgeber der ersten FIFA-Weltmeisterschaft 1930?","bs":"Koja je zemlja bila domaćin prvog FIFA Svjetskog prvenstva 1930.?","es":"¿Qué país fue sede de la primera Copa Mundial de la FIFA en 1930?","pt":"Qual país sediou a primeira Copa do Mundo da FIFA em 1930?","sr":"Која је земља била домаћин првог Светског првенства 1930.?","fr":"Quel pays a accueilli la première Coupe du monde de la FIFA en 1930 ?","it":"Quale paese ha ospitato la prima Coppa del Mondo FIFA nel 1930?","nl":"Welk land organiseerde het eerste FIFA Wereldkampioenschap in 1930?","tr":"1930''da ilk FIFA Dünya Kupası''na hangi ülke ev sahipliği yaptı?","ar":"أي دولة استضافت أول كأس عالم في عام 1930؟"}'::jsonb,
  '{"en":["Uruguay","Brazil","Italy","Argentina"],"hr":["Urugvaj","Brazil","Italija","Argentina"],"de":["Uruguay","Brasilien","Italien","Argentinien"],"bs":["Urugvaj","Brazil","Italija","Argentina"],"es":["Uruguay","Brasil","Italia","Argentina"],"pt":["Uruguai","Brasil","Itália","Argentina"],"sr":["Уругвај","Бразил","Италија","Аргентина"],"fr":["Uruguay","Brésil","Italie","Argentine"],"it":["Uruguay","Brasile","Italia","Argentina"],"nl":["Uruguay","Brazilië","Italië","Argentinië"],"tr":["Uruguay","Brezilya","İtalya","Arjantin"],"ar":["الأوروغواي","البرازيل","إيطاليا","الأرجنتين"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0011-4000-8000-000000000011'::uuid,
  'world_cup',
  '{"en":"How many teams participated in the 2022 FIFA World Cup?","hr":"Koliko je reprezentacija sudjelovalo na FIFA Svjetskom prvenstvu 2022.?","de":"Wie viele Teams nahmen an der FIFA-Weltmeisterschaft 2022 teil?","bs":"Koliko je reprezentacija učestvovalo na FIFA Svjetskom prvenstvu 2022.?","es":"¿Cuántos equipos participaron en la Copa Mundial de la FIFA 2022?","pt":"Quantas seleções participaram da Copa do Mundo da FIFA de 2022?","sr":"Колико је репрезентација учествовало на Светском првенству 2022.?","fr":"Combien d''équipes ont participé à la Coupe du monde de la FIFA 2022 ?","it":"Quante squadre hanno partecipato alla Coppa del Mondo FIFA 2022?","nl":"Hoeveel teams namen deel aan het FIFA Wereldkampioenschap 2022?","tr":"2022 FIFA Dünya Kupası''na kaç takım katıldı?","ar":"كم عدد المنتخبات التي شاركت في كأس العالم 2022؟"}'::jsonb,
  '{"en":["32","24","48","16"],"hr":["32","24","48","16"],"de":["32","24","48","16"],"bs":["32","24","48","16"],"es":["32","24","48","16"],"pt":["32","24","48","16"],"sr":["32","24","48","16"],"fr":["32","24","48","16"],"it":["32","24","48","16"],"nl":["32","24","48","16"],"tr":["32","24","48","16"],"ar":["32","24","48","16"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0012-4000-8000-000000000012'::uuid,
  'world_cup',
  '{"en":"Which player won the Golden Boot at the 2018 World Cup?","hr":"Koji je igrač osvojio Zlatnu kopačku na Svjetskom prvenstvu 2018.?","de":"Welcher Spieler gewann den Goldenen Schuh bei der WM 2018?","bs":"Koji je igrač osvojio Zlatnu kopačku na Svjetskom prvenstvu 2018.?","es":"¿Qué jugador ganó la Bota de Oro en el Mundial de 2018?","pt":"Qual jogador venceu a Bola de Ouro na Copa de 2018?","sr":"Који је играч освојио Златну ципелу на Светском првенству 2018.?","fr":"Quel joueur a remporté le Soulier d''or en 2018 ?","it":"Quale giocatore ha vinto la Scarpa d''oro ai Mondiali 2018?","nl":"Welke speler won de Gouden Schoen op het WK 2018?","tr":"2018 Dünya Kupası''nda Altın Ayakkabı''yı hangi oyuncu kazandı?","ar":"من فاز بالحذاء الذهبي في كأس العالم 2018؟"}'::jsonb,
  '{"en":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"hr":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"de":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"bs":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"es":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"pt":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"sr":["Хари Кејн","Антуан Гризман","Ромелу Лукаку","Кристијано Роналдо"],"fr":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"it":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"nl":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"tr":["Harry Kane","Antoine Griezmann","Romelu Lukaku","Cristiano Ronaldo"],"ar":["هاري كين","أنطوان غريزمان","روميلو لوكاكو","كريستيانو رونالدو"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0013-4000-8000-000000000013'::uuid,
  'world_cup',
  '{"en":"Which country won the 1998 FIFA World Cup?","hr":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 1998.?","de":"Welches Land gewann die FIFA-Weltmeisterschaft 1998?","bs":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 1998.?","es":"¿Qué país ganó la Copa Mundial de la FIFA 1998?","pt":"Qual país venceu a Copa do Mundo da FIFA de 1998?","sr":"Која је земља освојила Светско првенство 1998.?","fr":"Quel pays a remporté la Coupe du monde de la FIFA 1998 ?","it":"Quale paese ha vinto la Coppa del Mondo FIFA 1998?","nl":"Welk land won het FIFA Wereldkampioenschap 1998?","tr":"1998 FIFA Dünya Kupası''nı hangi ülke kazandı?","ar":"أي دولة فازت بكأس العالم 1998؟"}'::jsonb,
  '{"en":["France","Brazil","Croatia","Netherlands"],"hr":["Francuska","Brazil","Hrvatska","Nizozemska"],"de":["Frankreich","Brasilien","Kroatien","Niederlande"],"bs":["Francuska","Brazil","Hrvatska","Holandija"],"es":["Francia","Brasil","Croacia","Países Bajos"],"pt":["França","Brasil","Croácia","Holanda"],"sr":["Француска","Бразил","Хрватска","Холандија"],"fr":["France","Brésil","Croatie","Pays-Bas"],"it":["Francia","Brasile","Croazia","Paesi Bassi"],"nl":["Frankrijk","Brazilië","Kroatië","Nederland"],"tr":["Fransa","Brezilya","Hırvatistan","Hollanda"],"ar":["فرنسا","البرازيل","كرواتيا","هولندا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0014-4000-8000-000000000014'::uuid,
  'world_cup',
  '{"en":"Which country hosted the 2002 FIFA World Cup (co-hosted)?","hr":"Koje su zemlje bile domaćini FIFA Svjetskog prvenstva 2002.?","de":"Welche Länder waren Gastgeber der FIFA-Weltmeisterschaft 2002?","bs":"Koje su zemlje bile domaćini FIFA Svjetskog prvenstva 2002.?","es":"¿Qué países fueron sede de la Copa Mundial de la FIFA 2002?","pt":"Quais países sediaram a Copa do Mundo da FIFA de 2002?","sr":"Које су земље биле домаћини Светског првенства 2002.?","fr":"Quels pays ont co-organisé la Coupe du monde de la FIFA 2002 ?","it":"Quali paesi hanno ospitato la Coppa del Mondo FIFA 2002?","nl":"Welke landen organiseerden het FIFA Wereldkampioenschap 2002?","tr":"2002 FIFA Dünya Kupası''na hangi ülkeler ev sahipliği yaptı?","ar":"أي دولتين استضافتا كأس العالم 2002؟"}'::jsonb,
  '{"en":["Japan and South Korea","China and Japan","Australia and New Zealand","Qatar and UAE"],"hr":["Japan i Južna Koreja","Kina i Japan","Australija i Novi Zeland","Katar i UAE"],"de":["Japan und Südkorea","China und Japan","Australien und Neuseeland","Katar und VAE"],"bs":["Japan i Južna Koreja","Kina i Japan","Australija i Novi Zeland","Katar i UAE"],"es":["Japón y Corea del Sur","China y Japón","Australia y Nueva Zelanda","Catar y EAU"],"pt":["Japão e Coreia do Sul","China e Japão","Austrália e Nova Zelândia","Catar e Emirados"],"sr":["Јапан и Јужна Кореја","Кина и Јапан","Аустралија и Нови Зеланд","Катар и УАЕ"],"fr":["Japon et Corée du Sud","Chine et Japon","Australie et Nouvelle-Zélande","Qatar et EAU"],"it":["Giappone e Corea del Sud","Cina e Giappone","Australia e Nuova Zelanda","Qatar e Emirati"],"nl":["Japan en Zuid-Korea","China en Japan","Australië en Nieuw-Zeeland","Qatar en VAE"],"tr":["Japonya ve Güney Kore","Çin ve Japonya","Avustralya ve Yeni Zelanda","Katar ve BAE"],"ar":["اليابان وكوريا الجنوبية","الصين واليابان","أستراليا ونيوزيلندا","قطر والإمارات"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0015-4000-8000-000000000015'::uuid,
  'world_cup',
  '{"en":"Which country won the 1958 FIFA World Cup?","hr":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 1958.?","de":"Welches Land gewann die FIFA-Weltmeisterschaft 1958?","bs":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 1958.?","es":"¿Qué país ganó la Copa Mundial de la FIFA 1958?","pt":"Qual país venceu a Copa do Mundo da FIFA de 1958?","sr":"Која је земља освојила Светско првенство 1958.?","fr":"Quel pays a remporté la Coupe du monde de la FIFA 1958 ?","it":"Quale paese ha vinto la Coppa del Mondo FIFA 1958?","nl":"Welk land won het FIFA Wereldkampioenschap 1958?","tr":"1958 FIFA Dünya Kupası''nı hangi ülke kazandı?","ar":"أي دولة فازت بكأس العالم 1958؟"}'::jsonb,
  '{"en":["Brazil","Sweden","France","West Germany"],"hr":["Brazil","Švedska","Francuska","Zapadna Njemačka"],"de":["Brasilien","Schweden","Frankreich","Westdeutschland"],"bs":["Brazil","Švedska","Francuska","Zapadna Njemačka"],"es":["Brasil","Suecia","Francia","Alemania Occidental"],"pt":["Brasil","Suécia","França","Alemanha Ocidental"],"sr":["Бразил","Шведска","Француска","Западна Немачка"],"fr":["Brésil","Suède","France","Allemagne de l''Ouest"],"it":["Brasile","Svezia","Francia","Germania Ovest"],"nl":["Brazilië","Zweden","Frankrijk","West-Duitsland"],"tr":["Brezilya","İsveç","Fransa","Batı Almanya"],"ar":["البرازيل","السويد","فرنسا","ألمانيا الغربية"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0016-4000-8000-000000000016'::uuid,
  'world_cup',
  '{"en":"Who scored a hat-trick in the 1966 World Cup final for England?","hr":"Tko je postigao tri gola u finalu Svjetskog prvenstva 1966. za Englesku?","de":"Wer erzielte einen Hattrick im WM-Finale 1966 für England?","bs":"Ko je postigao tri gola u finalu Svjetskog prvenstva 1966. za Englesku?","es":"¿Quién marcó un hat-trick en la final del Mundial de 1966 para Inglaterra?","pt":"Quem marcou um hat-trick na final da Copa de 1966 pela Inglaterra?","sr":"Ко је постигао три гола у финалу Светског првенства 1966. за Енглеску?","fr":"Qui a marqué un triplé en finale de la Coupe du monde 1966 pour l''Angleterre ?","it":"Chi segnò una tripletta nella finale dei Mondiali 1966 per l''Inghilterra?","nl":"Wie scoorde een hattrick in de WK-finale 1966 voor Engeland?","tr":"1966 Dünya Kupası finalinde İngiltere adına hat-trick yapan oyuncu kimdir?","ar":"من سجل ثلاثية في نهائي كأس العالم 1966 مع إنجلترا؟"}'::jsonb,
  '{"en":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"hr":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"de":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"bs":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"es":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"pt":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"sr":["Џеф Херст","Боби Чарлтон","Боби Мур","Џими Гривз"],"fr":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"it":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"nl":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"tr":["Geoff Hurst","Bobby Charlton","Bobby Moore","Jimmy Greaves"],"ar":["جيف هيرست","بوبي تشارلتون","بوبي مور","جيمي غريفز"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0017-4000-8000-000000000017'::uuid,
  'world_cup',
  '{"en":"Which country won the 2022 World Cup final on penalties?","hr":"Koja je zemlja osvojila finale Svjetskog prvenstva 2022. na jedanaestercima?","de":"Welches Land gewann das WM-Finale 2022 im Elfmeterschießen?","bs":"Koja je zemlja osvojila finale Svjetskog prvenstva 2022. na jedanaestercima?","es":"¿Qué país ganó la final del Mundial 2022 en los penaltis?","pt":"Qual país venceu a final da Copa de 2022 nos pênaltis?","sr":"Која је земља освојила финале Светског првенства 2022. на пеналима?","fr":"Quel pays a remporté la finale de la Coupe du monde 2022 aux tirs au but ?","it":"Quale paese ha vinto la finale dei Mondiali 2022 ai rigori?","nl":"Welk land won de WK-finale 2022 na strafschoppen?","tr":"2022 Dünya Kupası finalini penaltılarla hangi ülke kazandı?","ar":"أي دولة فازت بنهائي كأس العالم 2022 بركلات الترجيح؟"}'::jsonb,
  '{"en":["Argentina","France","Croatia","Morocco"],"hr":["Argentina","Francuska","Hrvatska","Maroko"],"de":["Argentinien","Frankreich","Kroatien","Marokko"],"bs":["Argentina","Francuska","Hrvatska","Maroko"],"es":["Argentina","Francia","Croacia","Marruecos"],"pt":["Argentina","França","Croácia","Marrocos"],"sr":["Аргентина","Француска","Хрватска","Мароко"],"fr":["Argentine","France","Croatie","Maroc"],"it":["Argentina","Francia","Croazia","Marocco"],"nl":["Argentinië","Frankrijk","Kroatië","Marokko"],"tr":["Arjantin","Fransa","Hırvatistan","Fas"],"ar":["الأرجنتين","فرنسا","كرواتيا","المغرب"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0018-4000-8000-000000000018'::uuid,
  'world_cup',
  '{"en":"Which country hosted the 1994 FIFA World Cup?","hr":"Koja je zemlja bila domaćin FIFA Svjetskog prvenstva 1994.?","de":"Welches Land war Gastgeber der FIFA-Weltmeisterschaft 1994?","bs":"Koja je zemlja bila domaćin FIFA Svjetskog prvenstva 1994.?","es":"¿Qué país fue sede de la Copa Mundial de la FIFA 1994?","pt":"Qual país sediou a Copa do Mundo da FIFA de 1994?","sr":"Која је земља била домаћин Светског првенства 1994.?","fr":"Quel pays a accueilli la Coupe du monde de la FIFA 1994 ?","it":"Quale paese ha ospitato la Coppa del Mondo FIFA 1994?","nl":"Welk land organiseerde het FIFA Wereldkampioenschap 1994?","tr":"1994 FIFA Dünya Kupası''na hangi ülke ev sahipliği yaptı?","ar":"أي دولة استضافت كأس العالم 1994؟"}'::jsonb,
  '{"en":["United States","Mexico","Brazil","Canada"],"hr":["Sjedinjene Američke Države","Meksiko","Brazil","Kanada"],"de":["Vereinigte Staaten","Mexiko","Brasilien","Kanada"],"bs":["Sjedinjene Američke Države","Meksiko","Brazil","Kanada"],"es":["Estados Unidos","México","Brasil","Canadá"],"pt":["Estados Unidos","México","Brasil","Canadá"],"sr":["Сједињене Америчке Државе","Мексико","Бразил","Канада"],"fr":["États-Unis","Mexique","Brésil","Canada"],"it":["Stati Uniti","Messico","Brasile","Canada"],"nl":["Verenigde Staten","Mexico","Brazilië","Canada"],"tr":["Amerika Birleşik Devletleri","Meksika","Brezilya","Kanada"],"ar":["الولايات المتحدة","المكسيك","البرازيل","كندا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0019-4000-8000-000000000019'::uuid,
  'world_cup',
  '{"en":"Which country won the 1970 FIFA World Cup?","hr":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 1970.?","de":"Welches Land gewann die FIFA-Weltmeisterschaft 1970?","bs":"Koja je zemlja osvojila FIFA Svjetsko prvenstvo 1970.?","es":"¿Qué país ganó la Copa Mundial de la FIFA 1970?","pt":"Qual país venceu a Copa do Mundo da FIFA de 1970?","sr":"Која је земља освојила Светско првенство 1970.?","fr":"Quel pays a remporté la Coupe du monde de la FIFA 1970 ?","it":"Quale paese ha vinto la Coppa del Mondo FIFA 1970?","nl":"Welk land won het FIFA Wereldkampioenschap 1970?","tr":"1970 FIFA Dünya Kupası''nı hangi ülke kazandı?","ar":"أي دولة فازت بكأس العالم 1970؟"}'::jsonb,
  '{"en":["Brazil","Italy","West Germany","Uruguay"],"hr":["Brazil","Italija","Zapadna Njemačka","Urugvaj"],"de":["Brasilien","Italien","Westdeutschland","Uruguay"],"bs":["Brazil","Italija","Zapadna Njemačka","Urugvaj"],"es":["Brasil","Italia","Alemania Occidental","Uruguay"],"pt":["Brasil","Itália","Alemanha Ocidental","Uruguai"],"sr":["Бразил","Италија","Западна Немачка","Уругвај"],"fr":["Brésil","Italie","Allemagne de l''Ouest","Uruguay"],"it":["Brasile","Italia","Germania Ovest","Uruguay"],"nl":["Brazilië","Italië","West-Duitsland","Uruguay"],"tr":["Brezilya","İtalya","Batı Almanya","Uruguay"],"ar":["البرازيل","إيطاليا","ألمانيا الغربية","الأوروغواي"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0020-4000-8000-000000000020'::uuid,
  'world_cup',
  '{"en":"Which country will host the 2026 FIFA World Cup (co-hosted)?","hr":"Koje će zemlje biti domaćini FIFA Svjetskog prvenstva 2026.?","de":"Welche Länder werden Gastgeber der FIFA-Weltmeisterschaft 2026 sein?","bs":"Koje će zemlje biti domaćini FIFA Svjetskog prvenstva 2026.?","es":"¿Qué países serán sede de la Copa Mundial de la FIFA 2026?","pt":"Quais países sediarão a Copa do Mundo da FIFA de 2026?","sr":"Које ће земље бити домаћини Светског првенства 2026.?","fr":"Quels pays accueilleront la Coupe du monde de la FIFA 2026 ?","it":"Quali paesi ospiteranno la Coppa del Mondo FIFA 2026?","nl":"Welke landen organiseren het FIFA Wereldkampioenschap 2026?","tr":"2026 FIFA Dünya Kupası''na hangi ülkeler ev sahipliği yapacak?","ar":"أي دول ستستضيف كأس العالم 2026؟"}'::jsonb,
  '{"en":["USA, Mexico and Canada","Qatar and Saudi Arabia","Brazil and Argentina","Spain and Portugal"],"hr":["SAD, Meksiko i Kanada","Katar i Saudijska Arabija","Brazil i Argentina","Španjolska i Portugal"],"de":["USA, Mexiko und Kanada","Katar und Saudi-Arabien","Brasilien und Argentinien","Spanien und Portugal"],"bs":["SAD, Meksiko i Kanada","Katar i Saudijska Arabija","Brazil i Argentina","Španija i Portugal"],"es":["EE.UU., México y Canadá","Catar y Arabia Saudita","Brasil y Argentina","España y Portugal"],"pt":["EUA, México e Canadá","Catar e Arábia Saudita","Brasil e Argentina","Espanha e Portugal"],"sr":["САД, Мексико и Канада","Катар и Саудијска Арабија","Бразил и Аргентина","Шпанија и Португалија"],"fr":["États-Unis, Mexique et Canada","Qatar et Arabie saoudite","Brésil et Argentine","Espagne et Portugal"],"it":["USA, Messico e Canada","Qatar e Arabia Saudita","Brasile e Argentina","Spagna e Portogallo"],"nl":["VS, Mexico en Canada","Qatar en Saoedi-Arabië","Brazilië en Argentinië","Spanje en Portugal"],"tr":["ABD, Meksika ve Kanada","Katar ve Suudi Arabistan","Brezilya ve Arjantin","İspanya ve Portekiz"],"ar":["الولايات المتحدة والمكسيك وكندا","قطر والسعودية","البرازيل والأرجنتين","إسبانيا والبرتغال"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0021-4000-8000-000000000021'::uuid,
  'champions_league',
  '{"en":"Which club has won the most UEFA Champions League titles?","hr":"Koji klub ima najviše naslova UEFA Lige prvaka?","de":"Welcher Verein hat die meisten UEFA-Champions-League-Titel gewonnen?","bs":"Koji klub ima najviše naslova UEFA Lige prvaka?","es":"¿Qué club ha ganado más títulos de la UEFA Champions League?","pt":"Qual clube venceu mais títulos da UEFA Champions League?","sr":"Који клуб има највише титула УЕФА Лиге шампиона?","fr":"Quel club a remporté le plus de titres de Ligue des champions de l''UEFA ?","it":"Quale club ha vinto più titoli di UEFA Champions League?","nl":"Welke club heeft de meeste UEFA Champions League-titels gewonnen?","tr":"Hangi kulüp en fazla UEFA Şampiyonlar Ligi şampiyonluğuna sahiptir?","ar":"أي نادٍ فاز بأكبر عدد من ألقاب دوري أبطال أوروبا؟"}'::jsonb,
  '{"en":["Real Madrid","AC Milan","Bayern Munich","Liverpool"],"hr":["Real Madrid","AC Milan","Bayern München","Liverpool"],"de":["Real Madrid","AC Mailand","Bayern München","Liverpool"],"bs":["Real Madrid","AC Milan","Bayern München","Liverpool"],"es":["Real Madrid","AC Milan","Bayern Múnich","Liverpool"],"pt":["Real Madrid","AC Milan","Bayern de Munique","Liverpool"],"sr":["Реал Мадрид","АЦ Милан","Бајерн Минхен","Ливерпул"],"fr":["Real Madrid","AC Milan","Bayern Munich","Liverpool"],"it":["Real Madrid","Milan","Bayern Monaco","Liverpool"],"nl":["Real Madrid","AC Milan","Bayern München","Liverpool"],"tr":["Real Madrid","AC Milan","Bayern Münih","Liverpool"],"ar":["ريال مدريد","ميلان","بايرن ميونخ","ليفربول"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0022-4000-8000-000000000022'::uuid,
  'champions_league',
  '{"en":"Who scored the winning goal in the 1999 Champions League final for Manchester United?","hr":"Tko je postigao pobjednički gol u finalu Lige prvaka 1999. za Manchester United?","de":"Wer erzielte das Siegtor im Champions-League-Finale 1999 für Manchester United?","bs":"Ko je postigao pobjednički gol u finalu Lige prvaka 1999. za Manchester United?","es":"¿Quién marcó el gol de la victoria en la final de 1999 de la Champions League para el Manchester United?","pt":"Quem marcou o gol da vitória na final de 1999 da Champions League pelo Manchester United?","sr":"Ко је постигао победоносни гол у финалу Лиге шампиона 1999. за Манчестер Јунајтед?","fr":"Qui a marqué le but victorieux en finale de la Ligue des champions 1999 pour Manchester United ?","it":"Chi segnò il gol della vittoria nella finale di Champions League 1999 per il Manchester United?","nl":"Wie scoorde het winnende doelpunt in de Champions League-finale van 1999 voor Manchester United?","tr":"1999 Şampiyonlar Ligi finalinde Manchester United adına galibiyet golünü kim attı?","ar":"من سجل هدف الفوز في نهائي دوري الأبطال 1999 مع مانشستر يونايتد؟"}'::jsonb,
  '{"en":["Teddy Sheringham & Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"hr":["Teddy Sheringham i Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"de":["Teddy Sheringham & Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"bs":["Teddy Sheringham i Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"es":["Teddy Sheringham y Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"pt":["Teddy Sheringham e Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"sr":["Теди Шерингем и Оле Гунар Солскјер","Дејвид Бекам","Рајан Гигс","Пол Сколс"],"fr":["Teddy Sheringham et Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"it":["Teddy Sheringham e Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"nl":["Teddy Sheringham & Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"tr":["Teddy Sheringham ve Ole Gunnar Solskjær","David Beckham","Ryan Giggs","Paul Scholes"],"ar":["تيدي شيرينغهام وأولي غونار سولسشاير","ديفيد بيكهام","رايان غيغز","بول سكولز"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0023-4000-8000-000000000023'::uuid,
  'champions_league',
  '{"en":"Which player has scored the most goals in Champions League history?","hr":"Koji je igrač postigao najviše golova u povijesti Lige prvaka?","de":"Welcher Spieler hat die meisten Tore in der Champions-League-Geschichte erzielt?","bs":"Koji je igrač postigao najviše golova u historiji Lige prvaka?","es":"¿Qué jugador ha marcado más goles en la historia de la Champions League?","pt":"Qual jogador marcou mais gols na história da Champions League?","sr":"Који играч је постигао највише голова у историји Лиге шампиона?","fr":"Quel joueur a marqué le plus de buts dans l''histoire de la Ligue des champions ?","it":"Quale giocatore ha segnato più gol nella storia della Champions League?","nl":"Welke speler heeft de meeste doelpunten gescoord in de Champions League-geschiedenis?","tr":"Şampiyonlar Ligi tarihinin en golcü oyuncusu kimdir?","ar":"من هو الهداف التاريخي لدوري أبطال أوروبا؟"}'::jsonb,
  '{"en":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"hr":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"de":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"bs":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"es":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"pt":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"sr":["Кристијано Роналдо","Лионел Меси","Роберт Левандовски","Карим Бензема"],"fr":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"it":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"nl":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"tr":["Cristiano Ronaldo","Lionel Messi","Robert Lewandowski","Karim Benzema"],"ar":["كريستيانو رونالدو","ليونيل ميسي","روبرت ليفاندوفسكي","كريم بنزيما"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0024-4000-8000-000000000024'::uuid,
  'champions_league',
  '{"en":"Which club won the 2024 UEFA Champions League?","hr":"Koji je klub osvojio UEFA Ligu prvaka 2024.?","de":"Welcher Verein gewann die UEFA Champions League 2024?","bs":"Koji je klub osvojio UEFA Ligu prvaka 2024.?","es":"¿Qué club ganó la UEFA Champions League 2024?","pt":"Qual clube venceu a UEFA Champions League de 2024?","sr":"Који је клуб освојио УЕФА Лигу шампиона 2024.?","fr":"Quel club a remporté la Ligue des champions de l''UEFA 2024 ?","it":"Quale club ha vinto la UEFA Champions League 2024?","nl":"Welke club won de UEFA Champions League 2024?","tr":"2024 UEFA Şampiyonlar Ligi''ni hangi kulüp kazandı?","ar":"أي نادٍ فاز بدوري أبطال أوروبا 2024؟"}'::jsonb,
  '{"en":["Real Madrid","Borussia Dortmund","Manchester City","Bayern Munich"],"hr":["Real Madrid","Borussia Dortmund","Manchester City","Bayern München"],"de":["Real Madrid","Borussia Dortmund","Manchester City","Bayern München"],"bs":["Real Madrid","Borussia Dortmund","Manchester City","Bayern München"],"es":["Real Madrid","Borussia Dortmund","Manchester City","Bayern Múnich"],"pt":["Real Madrid","Borussia Dortmund","Manchester City","Bayern de Munique"],"sr":["Реал Мадрид","Борусија Дортмунд","Манчестер Сити","Бајерн Минхен"],"fr":["Real Madrid","Borussia Dortmund","Manchester City","Bayern Munich"],"it":["Real Madrid","Borussia Dortmund","Manchester City","Bayern Monaco"],"nl":["Real Madrid","Borussia Dortmund","Manchester City","Bayern München"],"tr":["Real Madrid","Borussia Dortmund","Manchester City","Bayern Münih"],"ar":["ريال مدريد","بوروسيا دورتموند","مانشستر سيتي","بايرن ميونخ"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0025-4000-8000-000000000025'::uuid,
  'champions_league',
  '{"en":"What was the Champions League called before 1992?","hr":"Kako se Liga prvaka zvala prije 1992.?","de":"Wie hieß die Champions League vor 1992?","bs":"Kako se Liga prvaka zvala prije 1992.?","es":"¿Cómo se llamaba la Champions League antes de 1992?","pt":"Como se chamava a Champions League antes de 1992?","sr":"Како се Лига шампиона звала пре 1992.?","fr":"Comment s''appelait la Ligue des champions avant 1992 ?","it":"Come si chiamava la Champions League prima del 1992?","nl":"Hoe heette de Champions League vóór 1992?","tr":"1992''den önce Şampiyonlar Ligi''nin adı neydi?","ar":"ما اسم دوري الأبطال قبل عام 1992؟"}'::jsonb,
  '{"en":["European Cup","UEFA Cup","Cup Winners'' Cup","Intertoto Cup"],"hr":["Kup europskih prvaka","UEFA kup","Kup pobjednika kupova","Intertoto kup"],"de":["Europapokal der Landesmeister","UEFA-Pokal","Pokal der Pokalsieger","Intertoto-Pokal"],"bs":["Kup europskih prvaka","UEFA kup","Kup pobjednika kupova","Intertoto kup"],"es":["Copa de Europa","Copa UEFA","Recopa de Europa","Copa Intertoto"],"pt":["Taça dos Campeões Europeus","Taça UEFA","Taça das Copas","Taça Intertoto"],"sr":["Куп европских шампиона","УЕФА куп","Куп победника купова","Интертото куп"],"fr":["Coupe d''Europe","Coupe UEFA","Coupe des Coupes","Coupe Intertoto"],"it":["Coppa dei Campioni","Coppa UEFA","Coppa delle Coppe","Coppa Intertoto"],"nl":["Europacup I","UEFA Cup","Europese Beker","Intertoto Cup"],"tr":["Şampiyonlar Kupası","UEFA Kupası","Kupa Galipleri Kupası","Intertoto Kupası"],"ar":["كأس الأندية الأوروبية","كأس الاتحاد الأوروبي","كأس الكؤوس","كأس الإنترتوتو"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0026-4000-8000-000000000026'::uuid,
  'champions_league',
  '{"en":"Which stadium hosted the 2011 Champions League final?","hr":"Koji je stadion bio domaćin finala Lige prvaka 2011.?","de":"Welches Stadion war Austragungsort des Champions-League-Finals 2011?","bs":"Koji stadion je bio domaćin finala Lige prvaka 2011.?","es":"¿Qué estadio albergó la final de la Champions League 2011?","pt":"Qual estádio sediou a final da Champions League de 2011?","sr":"Који стадион је био домаћин финала Лиге шампиона 2011.?","fr":"Quel stade a accueilli la finale de la Ligue des champions 2011 ?","it":"Quale stadio ha ospitato la finale di Champions League 2011?","nl":"Welk stadion organiseerde de Champions League-finale van 2011?","tr":"2011 Şampiyonlar Ligi finaline hangi stadyum ev sahipliği yaptı?","ar":"أي ملعب استضاف نهائي دوري الأبطال 2011؟"}'::jsonb,
  '{"en":["Wembley Stadium","Camp Nou","Allianz Arena","San Siro"],"hr":["Wembley Stadium","Camp Nou","Allianz Arena","San Siro"],"de":["Wembley Stadium","Camp Nou","Allianz Arena","San Siro"],"bs":["Wembley Stadium","Camp Nou","Allianz Arena","San Siro"],"es":["Estadio de Wembley","Camp Nou","Allianz Arena","San Siro"],"pt":["Estádio de Wembley","Camp Nou","Allianz Arena","San Siro"],"sr":["Вембли","Камп Ноу","Алијанц Арена","Сан Сиро"],"fr":["Stade de Wembley","Camp Nou","Allianz Arena","San Siro"],"it":["Wembley Stadium","Camp Nou","Allianz Arena","San Siro"],"nl":["Wembley Stadium","Camp Nou","Allianz Arena","San Siro"],"tr":["Wembley Stadyumu","Camp Nou","Allianz Arena","San Siro"],"ar":["ملعب ويمبلي","كامب نو","أليانز أرينا","سان سيرو"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0027-4000-8000-000000000027'::uuid,
  'champions_league',
  '{"en":"Which club completed ''La Decimocuarta'' by winning the 2024 Champions League?","hr":"Koji je klub osvojio ''La Decimocuarta'' pobjedom u Ligi prvaka 2024.?","de":"Welcher Verein vollendete ''La Decimocuarta'' mit dem Sieg in der Champions League 2024?","bs":"Koji klub je osvojio ''La Decimocuarta'' pobjedom u Ligi prvaka 2024.?","es":"¿Qué club completó ''La Decimocuarta'' al ganar la Champions League 2024?","pt":"Qual clube completou a ''La Decimocuarta'' ao vencer a Champions League de 2024?","sr":"Који је клуб освојио ''La Decimocuarta'' победом у Лиги шампиона 2024.?","fr":"Quel club a accompli ''La Decimocuarta'' en remportant la Ligue des champions 2024 ?","it":"Quale club ha completato la ''La Decimocuarta'' vincendo la Champions League 2024?","nl":"Welke club voltooide ''La Decimocuarta'' door de Champions League 2024 te winnen?","tr":"2024 Şampiyonlar Ligi''ni kazanarak ''La Decimocuarta''yı hangi kulüp tamamladı?","ar":"أي نادٍ حقق ''لا ديسيموكواترا'' بفوزه بدوري الأبطال 2024؟"}'::jsonb,
  '{"en":["Real Madrid","Barcelona","Atlético Madrid","Sevilla"],"hr":["Real Madrid","Barcelona","Atlético Madrid","Sevilla"],"de":["Real Madrid","Barcelona","Atlético Madrid","Sevilla"],"bs":["Real Madrid","Barcelona","Atlético Madrid","Sevilla"],"es":["Real Madrid","Barcelona","Atlético Madrid","Sevilla"],"pt":["Real Madrid","Barcelona","Atlético Madrid","Sevilla"],"sr":["Реал Мадрид","Барселона","Атлетико Мадрид","Севиља"],"fr":["Real Madrid","Barcelone","Atlético Madrid","Séville"],"it":["Real Madrid","Barcellona","Atlético Madrid","Siviglia"],"nl":["Real Madrid","Barcelona","Atlético Madrid","Sevilla"],"tr":["Real Madrid","Barcelona","Atlético Madrid","Sevilla"],"ar":["ريال مدريد","برشلونة","أتلتيكو مدريد","إشبيلية"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0028-4000-8000-000000000028'::uuid,
  'champions_league',
  '{"en":"Who managed Liverpool to their 2019 Champions League triumph?","hr":"Tko je vodio Liverpool do trijumfa u Ligi prvaka 2019.?","de":"Wer trainierte Liverpool zum Champions-League-Triumph 2019?","bs":"Ko je vodio Liverpool do trijumfa u Ligi prvaka 2019.?","es":"¿Quién dirigió al Liverpool en su triunfo en la Champions League 2019?","pt":"Quem treinou o Liverpool no triunfo na Champions League de 2019?","sr":"Ко је водио Ливерпул до тријумфа у Лиги шампиона 2019.?","fr":"Qui a entraîné Liverpool lors de son triomphe en Ligue des champions 2019 ?","it":"Chi ha allenato il Liverpool al trionfo in Champions League 2019?","nl":"Wie traineerde Liverpool naar de Champions League-triomf in 2019?","tr":"2019 Şampiyonlar Ligi zaferinde Liverpool''u hangi teknik direktör yönetti?","ar":"من أدرب ليفربول في فوزه بدوري الأبطال 2019؟"}'::jsonb,
  '{"en":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"hr":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"de":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"bs":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"es":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"pt":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"sr":["Јирген Клоп","Брендан Роджерс","Рафаел Бенитез","Кени Далглиш"],"fr":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"it":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"nl":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"tr":["Jürgen Klopp","Brendan Rodgers","Rafael Benítez","Kenny Dalglish"],"ar":["يورغن كلوب","برندان رودجرز","رافائيل بينيتيز","كيني دالغليش"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0029-4000-8000-000000000029'::uuid,
  'champions_league',
  '{"en":"Which club won the first UEFA Champions League season in 1992-93?","hr":"Koji je klub osvojio prvu sezonu UEFA Lige prvaka 1992./93.?","de":"Welcher Verein gewann die erste UEFA-Champions-League-Saison 1992/93?","bs":"Koji klub je osvojio prvu sezonu UEFA Lige prvaka 1992./93.?","es":"¿Qué club ganó la primera temporada de la UEFA Champions League 1992-93?","pt":"Qual clube venceu a primeira temporada da UEFA Champions League em 1992-93?","sr":"Који је клуб освојио прву сезону УЕФА Лиге шампиона 1992/93.?","fr":"Quel club a remporté la première saison de la Ligue des champions de l''UEFA en 1992-93 ?","it":"Quale club ha vinto la prima stagione di UEFA Champions League nel 1992-93?","nl":"Welke club won het eerste UEFA Champions League-seizoen in 1992-93?","tr":"1992-93 sezonunun ilk UEFA Şampiyonlar Ligi''ni hangi kulüp kazandı?","ar":"أي نادٍ فاز بأول موسم لدوري أبطال أوروبا 1992-93؟"}'::jsonb,
  '{"en":["Olympique Marseille","AC Milan","Barcelona","Ajax"],"hr":["Olympique Marseille","AC Milan","Barcelona","Ajax"],"de":["Olympique Marseille","AC Mailand","Barcelona","Ajax"],"bs":["Olympique Marseille","AC Milan","Barcelona","Ajax"],"es":["Olympique de Marsella","AC Milan","Barcelona","Ajax"],"pt":["Olympique de Marselha","AC Milan","Barcelona","Ajax"],"sr":["Олимпик Марсељ","АЦ Милан","Барселона","Ајакс"],"fr":["Olympique de Marseille","AC Milan","Barcelone","Ajax"],"it":["Olympique Marsiglia","Milan","Barcellona","Ajax"],"nl":["Olympique Marseille","AC Milan","Barcelona","Ajax"],"tr":["Olympique Marseille","AC Milan","Barcelona","Ajax"],"ar":["أولمبيك مارسيليا","ميلان","برشلونة","أياكس"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0030-4000-8000-000000000030'::uuid,
  'champions_league',
  '{"en":"Who scored two goals for Real Madrid in the 2018 Champions League final?","hr":"Tko je postigao dva gola za Real Madrid u finalu Lige prvaka 2018.?","de":"Wer erzielte zwei Tore für Real Madrid im Champions-League-Finale 2018?","bs":"Ko je postigao dva gola za Real Madrid u finalu Lige prvaka 2018.?","es":"¿Quién marcó dos goles para el Real Madrid en la final de la Champions League 2018?","pt":"Quem marcou dois gols pelo Real Madrid na final da Champions League de 2018?","sr":"Ко је постигао два гола за Реал Мадрид у финалу Лиге шампиона 2018.?","fr":"Qui a marqué deux buts pour le Real Madrid en finale de la Ligue des champions 2018 ?","it":"Chi segnò due gol per il Real Madrid nella finale di Champions League 2018?","nl":"Wie scoorde twee doelpunten voor Real Madrid in de Champions League-finale van 2018?","tr":"2018 Şampiyonlar Ligi finalinde Real Madrid adına iki gol atan oyuncu kimdir?","ar":"من سجل هدفين لريال مدريد في نهائي دوري الأبطال 2018؟"}'::jsonb,
  '{"en":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"hr":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"de":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"bs":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"es":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"pt":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"sr":["Гарет Бејл","Кристијано Роналдо","Карим Бензема","Иско"],"fr":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"it":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"nl":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"tr":["Gareth Bale","Cristiano Ronaldo","Karim Benzema","Isco"],"ar":["غاريث بيل","كريستيانو رونالدو","كريم بنزيما","إيسكو"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0031-4000-8000-000000000031'::uuid,
  'champions_league',
  '{"en":"Which club is nicknamed ''The Old Lady'' and has won multiple Champions League titles?","hr":"Koji klub nosi nadimak ''Stara dama'' i ima više naslova Lige prvaka?","de":"Welcher Verein trägt den Spitznamen ''Die alte Dame'' und hat mehrere Champions-League-Titel gewonnen?","bs":"Koji klub nosi nadimak ''Stara dama'' i ima više naslova Lige prvaka?","es":"¿Qué club tiene el apodo ''La Vieja Señora'' y ha ganado varios títulos de Champions League?","pt":"Qual clube tem o apelido ''A Velha Senhora'' e venceu vários títulos da Champions League?","sr":"Који клуб носи надимак ''Стара дама'' и има више титула Лиге шампиона?","fr":"Quel club porte le surnom ''La Vieille Dame'' et a remporté plusieurs titres de Ligue des champions ?","it":"Quale club è soprannominato ''La Vecchia Signora'' e ha vinto più titoli di Champions League?","nl":"Welke club heeft de bijnaam ''De Oude Dame'' en won meerdere Champions League-titels?","tr":"Birden fazla Şampiyonlar Ligi şampiyonluğu olan ''Yaşlı Hanım'' lakaplı kulüp hangisidir?","ar":"أي نادٍ يلقب بـ''السيدة العجوز'' وفاز بعدة ألقاب في دوري الأبطال؟"}'::jsonb,
  '{"en":["Juventus","Inter Milan","AC Milan","AS Roma"],"hr":["Juventus","Inter Milano","AC Milan","AS Roma"],"de":["Juventus","Inter Mailand","AC Mailand","AS Rom"],"bs":["Juventus","Inter Milano","AC Milan","AS Roma"],"es":["Juventus","Inter de Milán","AC Milan","AS Roma"],"pt":["Juventus","Inter de Milão","AC Milan","AS Roma"],"sr":["Јувентус","Интер","АЦ Милан","АС Рома"],"fr":["Juventus","Inter Milan","AC Milan","AS Rome"],"it":["Juventus","Inter","Milan","Roma"],"nl":["Juventus","Inter Milan","AC Milan","AS Roma"],"tr":["Juventus","Inter Milan","AC Milan","AS Roma"],"ar":["يوفنتوس","إنتر ميلان","ميلان","روما"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0032-4000-8000-000000000032'::uuid,
  'champions_league',
  '{"en":"Which club won the 2023 UEFA Champions League?","hr":"Koji je klub osvojio UEFA Ligu prvaka 2023.?","de":"Welcher Verein gewann die UEFA Champions League 2023?","bs":"Koji klub je osvojio UEFA Ligu prvaka 2023.?","es":"¿Qué club ganó la UEFA Champions League 2023?","pt":"Qual clube venceu a UEFA Champions League de 2023?","sr":"Који је клуб освојио УЕФА Лигу шампиона 2023.?","fr":"Quel club a remporté la Ligue des champions de l''UEFA 2023 ?","it":"Quale club ha vinto la UEFA Champions League 2023?","nl":"Welke club won de UEFA Champions League 2023?","tr":"2023 UEFA Şampiyonlar Ligi''ni hangi kulüp kazandı?","ar":"أي نادٍ فاز بدوري أبطال أوروبا 2023؟"}'::jsonb,
  '{"en":["Manchester City","Inter Milan","Real Madrid","Bayern Munich"],"hr":["Manchester City","Inter Milano","Real Madrid","Bayern München"],"de":["Manchester City","Inter Mailand","Real Madrid","Bayern München"],"bs":["Manchester City","Inter Milano","Real Madrid","Bayern München"],"es":["Manchester City","Inter de Milán","Real Madrid","Bayern Múnich"],"pt":["Manchester City","Inter de Milão","Real Madrid","Bayern de Munique"],"sr":["Манчестер Сити","Интер","Реал Мадрид","Бајерн Минхен"],"fr":["Manchester City","Inter Milan","Real Madrid","Bayern Munich"],"it":["Manchester City","Inter","Real Madrid","Bayern Monaco"],"nl":["Manchester City","Inter Milan","Real Madrid","Bayern München"],"tr":["Manchester City","Inter Milan","Real Madrid","Bayern Münih"],"ar":["مانشستر سيتي","إنتر ميلان","ريال مدريد","بايرن ميونخ"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0033-4000-8000-000000000033'::uuid,
  'champions_league',
  '{"en":"Which player won the 2024 Champions League final Man of the Match award?","hr":"Koji je igrač osvojio nagradu za najboljeg igrača finala Lige prvaka 2024.?","de":"Welcher Spieler gewann die Auszeichnung als Spieler des Spiels im Champions-League-Finale 2024?","bs":"Koji igrač je osvojio nagradu za najboljeg igrača finala Lige prvaka 2024.?","es":"¿Qué jugador ganó el premio al mejor jugador de la final de la Champions League 2024?","pt":"Qual jogador venceu o prêmio de melhor em campo na final da Champions League de 2024?","sr":"Који играч је освојио награду за најбољег играча финала Лиге шампиона 2024.?","fr":"Quel joueur a remporté le prix de l''homme du match en finale de la Ligue des champions 2024 ?","it":"Quale giocatore ha vinto il premio uomo partita nella finale di Champions League 2024?","nl":"Welke speler won de man of the match in de Champions League-finale van 2024?","tr":"2024 Şampiyonlar Ligi finalinde maçın oyuncusu ödülünü kim kazandı?","ar":"من فاز بجائزة أفضل لاعب في نهائي دوري الأبطال 2024؟"}'::jsonb,
  '{"en":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"hr":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"de":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"bs":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"es":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"pt":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"sr":["Родриго","Винисијус Жуниор","Џуд Белингем","Дани Карвахал"],"fr":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"it":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"nl":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"tr":["Rodrygo","Vinícius Júnior","Jude Bellingham","Dani Carvajal"],"ar":["رودريغو","فينيسيوس جونيور","جود بيلينغهام","داني كارفاخال"]}'::jsonb,
  3
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0034-4000-8000-000000000034'::uuid,
  'champions_league',
  '{"en":"Which Italian club has won the most Champions League/European Cup titles?","hr":"Koji talijanski klub ima najviše naslova Lige prvaka/Kupa europskih prvaka?","de":"Welcher italienische Verein hat die meisten Champions-League-/Europapokal-Titel?","bs":"Koji italijanski klub ima najviše naslova Lige prvaka/Kupa europskih prvaka?","es":"¿Qué club italiano ha ganado más títulos de Champions League/Copa de Europa?","pt":"Qual clube italiano venceu mais títulos da Champions League/Taça dos Campeões?","sr":"Који италијански клуб има највише титула Лиге шампиона/Купа шампиона?","fr":"Quel club italien a remporté le plus de titres de Ligue des champions/Coupe d''Europe ?","it":"Quale club italiano ha vinto più titoli di Champions League/Coppa dei Campioni?","nl":"Welke Italiaanse club heeft de meeste Champions League/Europacup-titels?","tr":"En fazla Şampiyonlar Ligi/Avrupa Kupası şampiyonluğuna sahip İtalyan kulüp hangisidir?","ar":"أي نادٍ إيطالي فاز بأكبر عدد من ألقاب دوري الأبطال/كأس الأندية الأوروبية؟"}'::jsonb,
  '{"en":["AC Milan","Inter Milan","Juventus","AS Roma"],"hr":["AC Milan","Inter Milano","Juventus","AS Roma"],"de":["AC Mailand","Inter Mailand","Juventus","AS Rom"],"bs":["AC Milan","Inter Milano","Juventus","AS Roma"],"es":["AC Milan","Inter de Milán","Juventus","AS Roma"],"pt":["AC Milan","Inter de Milão","Juventus","AS Roma"],"sr":["АЦ Милан","Интер","Јувентус","АС Рома"],"fr":["AC Milan","Inter Milan","Juventus","AS Rome"],"it":["Milan","Inter","Juventus","Roma"],"nl":["AC Milan","Inter Milan","Juventus","AS Roma"],"tr":["AC Milan","Inter Milan","Juventus","AS Roma"],"ar":["ميلان","إنتر ميلان","يوفنتوس","روما"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0035-4000-8000-000000000035'::uuid,
  'champions_league',
  '{"en":"Which club did Bayern Munich beat 8-2 in the 2020 Champions League quarter-final?","hr":"Koga je Bayern München pobijedio sa 8-2 u četvrtfinalu Lige prvaka 2020.?","de":"Welchen Verein besiegte Bayern München mit 8:2 im Champions-League-Viertelfinale 2020?","bs":"Koga je Bayern München pobijedio sa 8-2 u četvrtfinalu Lige prvaka 2020.?","es":"¿A qué club venció el Bayern Múnich por 8-2 en los cuartos de final de la Champions League 2020?","pt":"Qual clube o Bayern de Munique venceu por 8 a 2 nas quartas de final da Champions League de 2020?","sr":"Кога је Бајерн Минхен победио са 8:2 у четвртфиналу Лиге шампиона 2020.?","fr":"Quel club le Bayern Munich a-t-il battu 8-2 en quarts de finale de la Ligue des champions 2020 ?","it":"Quale club il Bayern Monaco sconfisse 8-2 nei quarti di finale di Champions League 2020?","nl":"Welke club versloeg Bayern München met 8-2 in de Champions League-kwartfinale van 2020?","tr":"2020 Şampiyonlar Ligi çeyrek finalinde Bayern Münih hangi kulübü 8-2 yendi?","ar":"أي نادٍ هزمه بايرن ميونخ 8-2 في ربع نهائي دوري الأبطال 2020؟"}'::jsonb,
  '{"en":["Barcelona","Chelsea","Juventus","Lyon"],"hr":["Barcelona","Chelsea","Juventus","Lyon"],"de":["Barcelona","Chelsea","Juventus","Lyon"],"bs":["Barcelona","Chelsea","Juventus","Lyon"],"es":["Barcelona","Chelsea","Juventus","Lyon"],"pt":["Barcelona","Chelsea","Juventus","Lyon"],"sr":["Барселона","Челси","Јувентус","Лион"],"fr":["Barcelone","Chelsea","Juventus","Lyon"],"it":["Barcellona","Chelsea","Juventus","Lione"],"nl":["Barcelona","Chelsea","Juventus","Lyon"],"tr":["Barcelona","Chelsea","Juventus","Lyon"],"ar":["برشلونة","تشيلسي","يوفنتوس","ليون"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0036-4000-8000-000000000036'::uuid,
  'champions_league',
  '{"en":"Which club won the 2012 Champions League final at their own stadium?","hr":"Koji je klub osvojio finale Lige prvaka 2012. na vlastitom stadionu?","de":"Welcher Verein gewann das Champions-League-Finale 2012 im eigenen Stadion?","bs":"Koji klub je osvojio finale Lige prvaka 2012. na vlastitom stadionu?","es":"¿Qué club ganó la final de la Champions League 2012 en su propio estadio?","pt":"Qual clube venceu a final da Champions League de 2012 no próprio estádio?","sr":"Који је клуб освојио финале Лиге шампиона 2012. на сопственом стадиону?","fr":"Quel club a remporté la finale de la Ligue des champions 2012 dans son propre stade ?","it":"Quale club ha vinto la finale di Champions League 2012 nel proprio stadio?","nl":"Welke club won de Champions League-finale van 2012 in het eigen stadion?","tr":"2012 Şampiyonlar Ligi finalini kendi stadyumunda hangi kulüp kazandı?","ar":"أي نادٍ فاز بنهائي دوري الأبطال 2012 في ملعبه؟"}'::jsonb,
  '{"en":["Bayern Munich","Chelsea","Real Madrid","Barcelona"],"hr":["Bayern München","Chelsea","Real Madrid","Barcelona"],"de":["Bayern München","Chelsea","Real Madrid","Barcelona"],"bs":["Bayern München","Chelsea","Real Madrid","Barcelona"],"es":["Bayern Múnich","Chelsea","Real Madrid","Barcelona"],"pt":["Bayern de Munique","Chelsea","Real Madrid","Barcelona"],"sr":["Бајерн Минхен","Челси","Реал Мадрид","Барселона"],"fr":["Bayern Munich","Chelsea","Real Madrid","Barcelone"],"it":["Bayern Monaco","Chelsea","Real Madrid","Barcellona"],"nl":["Bayern München","Chelsea","Real Madrid","Barcelona"],"tr":["Bayern Münih","Chelsea","Real Madrid","Barcelona"],"ar":["بايرن ميونخ","تشيلسي","ريال مدريد","برشلونة"]}'::jsonb,
  1
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0037-4000-8000-000000000037'::uuid,
  'champions_league',
  '{"en":"Which club won three consecutive Champions League titles from 2016 to 2018?","hr":"Koji je klub osvojio tri uzastopna naslova Lige prvaka od 2016. do 2018.?","de":"Welcher Verein gewann von 2016 bis 2018 drei aufeinanderfolgende Champions-League-Titel?","bs":"Koji klub je osvojio tri uzastopna naslova Lige prvaka od 2016. do 2018.?","es":"¿Qué club ganó tres títulos consecutivos de Champions League de 2016 a 2018?","pt":"Qual clube venceu três títulos consecutivos da Champions League de 2016 a 2018?","sr":"Који је клуб освојио три узастопне титуле Лиге шампиона од 2016. до 2018.?","fr":"Quel club a remporté trois titres consécutifs de Ligue des champions de 2016 à 2018 ?","it":"Quale club ha vinto tre titoli consecutivi di Champions League dal 2016 al 2018?","nl":"Welke club won drie opeenvolgende Champions League-titels van 2016 tot 2018?","tr":"2016''dan 2018''e kadar üst üste üç Şampiyonlar Ligi şampiyonluğu kazanan kulüp hangisidir?","ar":"أي نادٍ فاز بثلاثة ألقاب متتالية في دوري الأبطال من 2016 إلى 2018؟"}'::jsonb,
  '{"en":["Real Madrid","Barcelona","Bayern Munich","Liverpool"],"hr":["Real Madrid","Barcelona","Bayern München","Liverpool"],"de":["Real Madrid","Barcelona","Bayern München","Liverpool"],"bs":["Real Madrid","Barcelona","Bayern München","Liverpool"],"es":["Real Madrid","Barcelona","Bayern Múnich","Liverpool"],"pt":["Real Madrid","Barcelona","Bayern de Munique","Liverpool"],"sr":["Реал Мадрид","Барселона","Бајерн Минхен","Ливерпул"],"fr":["Real Madrid","Barcelone","Bayern Munich","Liverpool"],"it":["Real Madrid","Barcellona","Bayern Monaco","Liverpool"],"nl":["Real Madrid","Barcelona","Bayern München","Liverpool"],"tr":["Real Madrid","Barcelona","Bayern Münih","Liverpool"],"ar":["ريال مدريد","برشلونة","بايرن ميونخ","ليفربول"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0038-4000-8000-000000000038'::uuid,
  'champions_league',
  '{"en":"Which Dutch club won the Champions League in 1995?","hr":"Koji je nizozemski klub osvojio Ligu prvaka 1995.?","de":"Welcher niederländische Verein gewann die Champions League 1995?","bs":"Koji holandski klub je osvojio Ligu prvaka 1995.?","es":"¿Qué club neerlandés ganó la Champions League en 1995?","pt":"Qual clube holandês venceu a Champions League em 1995?","sr":"Који холандски клуб је освојио Лигу шампиона 1995.?","fr":"Quel club néerlandais a remporté la Ligue des champions en 1995 ?","it":"Quale club olandese ha vinto la Champions League nel 1995?","nl":"Welke Nederlandse club won de Champions League in 1995?","tr":"1995''te Şampiyonlar Ligi''ni hangi Hollanda kulübü kazandı?","ar":"أي نادٍ هولندي فاز بدوري الأبطال عام 1995؟"}'::jsonb,
  '{"en":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"hr":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"de":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"bs":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"es":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"pt":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"sr":["Ајакс","ПСВ Ајндховен","Фејеноорд","АЗ Алкмаар"],"fr":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"it":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"nl":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"tr":["Ajax","PSV Eindhoven","Feyenoord","AZ Alkmaar"],"ar":["أياكس","بي إس في أيندهوفن","فاينورد","إيه زد ألكمار"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0039-4000-8000-000000000039'::uuid,
  'champions_league',
  '{"en":"Which club did Porto beat in the 2004 Champions League final?","hr":"Koga je Porto pobijedio u finalu Lige prvaka 2004.?","de":"Welchen Verein besiegte Porto im Champions-League-Finale 2004?","bs":"Koga je Porto pobijedio u finalu Lige prvaka 2004.?","es":"¿A qué club venció el Porto en la final de la Champions League 2004?","pt":"Qual clube o Porto venceu na final da Champions League de 2004?","sr":"Кога је Порто победио у финалу Лиге шампиона 2004.?","fr":"Quel club Porto a-t-il battu en finale de la Ligue des champions 2004 ?","it":"Quale club il Porto sconfisse nella finale di Champions League 2004?","nl":"Welke club versloeg Porto in de Champions League-finale van 2004?","tr":"2004 Şampiyonlar Ligi finalinde Porto hangi kulübü yendi?","ar":"أي نادٍ هزمه بورتو في نهائي دوري الأبطال 2004؟"}'::jsonb,
  '{"en":["AS Monaco","Chelsea","AC Milan","Deportivo La Coruña"],"hr":["AS Monaco","Chelsea","AC Milan","Deportivo La Coruña"],"de":["AS Monaco","Chelsea","AC Mailand","Deportivo La Coruña"],"bs":["AS Monaco","Chelsea","AC Milan","Deportivo La Coruña"],"es":["AS Mónaco","Chelsea","AC Milan","Deportivo La Coruña"],"pt":["AS Monaco","Chelsea","AC Milan","Deportivo La Coruña"],"sr":["АС Монако","Челси","АЦ Милан","Депортиво Ла Коруња"],"fr":["AS Monaco","Chelsea","AC Milan","Deportivo La Coruña"],"it":["Monaco","Chelsea","Milan","Deportivo La Coruña"],"nl":["AS Monaco","Chelsea","AC Milan","Deportivo La Coruña"],"tr":["AS Monaco","Chelsea","AC Milan","Deportivo La Coruña"],"ar":["موناكو","تشيلسي","ميلان","ديبورتيفو لاكورونيا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0040-4000-8000-000000000040'::uuid,
  'champions_league',
  '{"en":"Which English club has won the most Champions League titles?","hr":"Koji engleski klub ima najviše naslova Lige prvaka?","de":"Welcher englische Verein hat die meisten Champions-League-Titel?","bs":"Koji engleski klub ima najviše naslova Lige prvaka?","es":"¿Qué club inglés ha ganado más títulos de Champions League?","pt":"Qual clube inglês venceu mais títulos da Champions League?","sr":"Који енглески клуб има највише титула Лиге шампиона?","fr":"Quel club anglais a remporté le plus de titres de Ligue des champions ?","it":"Quale club inglese ha vinto più titoli di Champions League?","nl":"Welke Engelse club heeft de meeste Champions League-titels?","tr":"En fazla Şampiyonlar Ligi şampiyonluğuna sahip İngiliz kulüp hangisidir?","ar":"أي نادٍ إنجليزي فاز بأكبر عدد من ألقاب دوري الأبطال؟"}'::jsonb,
  '{"en":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"hr":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"de":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"bs":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"es":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"pt":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"sr":["Ливерпул","Манчестер Јунајтед","Челси","Нотингем Форест"],"fr":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"it":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"nl":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"tr":["Liverpool","Manchester United","Chelsea","Nottingham Forest"],"ar":["ليفربول","مانشستر يونايتد","تشيلسي","نوتينغهام فورست"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0041-4000-8000-000000000041'::uuid,
  'football_rules',
  '{"en":"How many players does each team field on the pitch at kick-off?","hr":"Koliko igrača svaka momčad ima na terenu pri početnom udaru?","de":"Wie viele Spieler hat jede Mannschaft beim Anpfiff auf dem Platz?","bs":"Koliko igrača svaka momčad ima na terenu pri početnom udaru?","es":"¿Cuántos jugadores tiene cada equipo en el campo al inicio?","pt":"Quantos jogadores cada equipe tem em campo no início?","sr":"Колико играча свака екипа има на терену при почетном удару?","fr":"Combien de joueurs chaque équipe aligne-t-elle sur le terrain au coup d''envoi ?","it":"Quanti giocatori ha ogni squadra in campo al calcio d''inizio?","nl":"Hoeveel spelers heeft elk team op het veld bij de aftrap?","tr":"Başlangıç vuruşunda her takım sahada kaç oyuncu bulundurur?","ar":"كم عدد اللاعبين لكل فريق على أرض الملعب عند بداية المباراة؟"}'::jsonb,
  '{"en":["11","10","9","12"],"hr":["11","10","9","12"],"de":["11","10","9","12"],"bs":["11","10","9","12"],"es":["11","10","9","12"],"pt":["11","10","9","12"],"sr":["11","10","9","12"],"fr":["11","10","9","12"],"it":["11","10","9","12"],"nl":["11","10","9","12"],"tr":["11","10","9","12"],"ar":["11","10","9","12"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0042-4000-8000-000000000042'::uuid,
  'football_rules',
  '{"en":"What is the standard duration of a football match (excluding stoppage time)?","hr":"Koliko standardno traje nogometna utakmica (bez nadoknade)?","de":"Wie lange dauert ein Fußballspiel standardmäßig (ohne Nachspielzeit)?","bs":"Koliko standardno traje nogometna utakmica (bez nadoknade)?","es":"¿Cuál es la duración estándar de un partido de fútbol (sin tiempo añadido)?","pt":"Qual é a duração padrão de uma partida de futebol (sem acréscimos)?","sr":"Колико стандардно траје фудбалска утакмица (без надокнаде)?","fr":"Quelle est la durée standard d''un match de football (hors temps additionnel) ?","it":"Qual è la durata standard di una partita di calcio (esclusi i recuperi)?","nl":"Wat is de standaardduur van een voetbalwedstrijd (zonder blessuretijd)?","tr":"Bir futbol maçının standart süresi nedir (uzatma dakikaları hariç)?","ar":"ما المدة القياسية لمباراة كرة القدم (دون وقت إضافي)؟"}'::jsonb,
  '{"en":["90 minutes","80 minutes","100 minutes","70 minutes"],"hr":["90 minuta","80 minuta","100 minuta","70 minuta"],"de":["90 Minuten","80 Minuten","100 Minuten","70 Minuten"],"bs":["90 minuta","80 minuta","100 minuta","70 minuta"],"es":["90 minutos","80 minutos","100 minutos","70 minutos"],"pt":["90 minutos","80 minutos","100 minutos","70 minutos"],"sr":["90 минута","80 минута","100 минута","70 минута"],"fr":["90 minutes","80 minutes","100 minutes","70 minutes"],"it":["90 minuti","80 minuti","100 minuti","70 minuti"],"nl":["90 minuten","80 minuten","100 minuten","70 minuten"],"tr":["90 dakika","80 dakika","100 dakika","70 dakika"],"ar":["90 دقيقة","80 دقيقة","100 دقيقة","70 دقيقة"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0043-4000-8000-000000000043'::uuid,
  'football_rules',
  '{"en":"How many substitutions is a team allowed in a standard FIFA match (as of 2024)?","hr":"Koliko izmjena smije imati momčad u standardnoj FIFA utakmici (od 2024.)?","de":"Wie viele Auswechslungen darf eine Mannschaft in einem Standard-FIFA-Spiel durchführen (ab 2024)?","bs":"Koliko izmjena smije imati momčad u standardnoj FIFA utakmici (od 2024.)?","es":"¿Cuántos cambios puede hacer un equipo en un partido estándar de la FIFA (desde 2024)?","pt":"Quantas substituições uma equipe pode fazer em uma partida padrão da FIFA (a partir de 2024)?","sr":"Колико измена смее имати екипа у стандардној ФИФА утакмици (од 2024.)?","fr":"Combien de remplacements une équipe peut-elle effectuer dans un match FIFA standard (depuis 2024) ?","it":"Quante sostituzioni può effettuare una squadra in una partita FIFA standard (dal 2024)?","nl":"Hoeveel wissels mag een team maken in een standaard FIFA-wedstrijd (vanaf 2024)?","tr":"Bir takım standart bir FIFA maçında kaç oyuncu değişikliği yapabilir (2024 itibarıyla)?","ar":"كم تبديلاً يُسمح لكل فريق في مباراة فيفا القياسية (اعتباراً من 2024)؟"}'::jsonb,
  '{"en":["5","3","4","6"],"hr":["5","3","4","6"],"de":["5","3","4","6"],"bs":["5","3","4","6"],"es":["5","3","4","6"],"pt":["5","3","4","6"],"sr":["5","3","4","6"],"fr":["5","3","4","6"],"it":["5","3","4","6"],"nl":["5","3","4","6"],"tr":["5","3","4","6"],"ar":["5","3","4","6"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0044-4000-8000-000000000044'::uuid,
  'football_rules',
  '{"en":"What card does a referee show for a serious foul or unsporting behavior?","hr":"Koju karton sudac pokazuje za ozbiljan prekršaj ili nesportsko ponašanje?","de":"Welche Karte zeigt der Schiedsrichter bei einem schweren Foul oder unsportlichem Verhalten?","bs":"Koju karton sudac pokazuje za ozbiljan prekršaj ili nesportsko ponašanje?","es":"¿Qué tarjeta muestra el árbitro por una falta grave o conducta antideportiva?","pt":"Qual cartão o árbitro mostra por falta grave ou conduta antidesportiva?","sr":"Коју картицу судија показује за озбиљан прекршај или неспортско понашање?","fr":"Quel carton l''arbitre montre-t-il pour une faute grave ou un comportement antisportif ?","it":"Quale cartellino mostra l''arbitro per un fallo grave o comportamento antisportivo?","nl":"Welke kaart toont de scheidsrechter bij een ernstig fou of onsportief gedrag?","tr":"Hakem ciddi bir faul veya sportmenlik dışı davranış için hangi kartı gösterir?","ar":"أي بطاقة يُظهرها الحكم للخطأ الخطير أو السلوك غير الرياضي؟"}'::jsonb,
  '{"en":["Yellow card","Green card","Blue card","White card"],"hr":["Žuti karton","Zeleni karton","Plavi karton","Bijeli karton"],"de":["Gelbe Karte","Grüne Karte","Blaue Karte","Weiße Karte"],"bs":["Žuti karton","Zeleni karton","Plavi karton","Bijeli karton"],"es":["Tarjeta amarilla","Tarjeta verde","Tarjeta azul","Tarjeta blanca"],"pt":["Cartão amarelo","Cartão verde","Cartão azul","Cartão branco"],"sr":["Жути картон","Зелени картон","Плави картон","Бели картон"],"fr":["Carton jaune","Carton vert","Carton bleu","Carton blanc"],"it":["Cartellino giallo","Cartellino verde","Cartellino blu","Cartellino bianco"],"nl":["Gele kaart","Groene kaart","Blauwe kaart","Witte kaart"],"tr":["Sarı kart","Yeşil kart","Mavi kart","Beyaz kart"],"ar":["بطاقة صفراء","بطاقة خضراء","بطاقة زرقاء","بطاقة بيضاء"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0045-4000-8000-000000000045'::uuid,
  'football_rules',
  '{"en":"How many yellow cards result in a player being sent off?","hr":"Koliko žutih kartona rezultira isključenjem igrača?","de":"Wie viele gelbe Karten führen zum Platzverweis eines Spielers?","bs":"Koliko žutih kartona rezultira isključenjem igrača?","es":"¿Cuántas tarjetas amarillas provocan la expulsión de un jugador?","pt":"Quantos cartões amarelos resultam na expulsão de um jogador?","sr":"Колико жутих картона доводи до искључења играча?","fr":"Combien de cartons jaunes entraînent l''expulsion d''un joueur ?","it":"Quanti cartellini gialli comportano l''espulsione di un giocatore?","nl":"Hoeveel gele kaarten leiden tot een rode kaart voor een speler?","tr":"Bir oyuncunun oyundan atılmasına kaç sarı kart yol açar?","ar":"كم بطاقة صفراء تؤدي إلى طرد اللاعب؟"}'::jsonb,
  '{"en":["2","1","3","4"],"hr":["2","1","3","4"],"de":["2","1","3","4"],"bs":["2","1","3","4"],"es":["2","1","3","4"],"pt":["2","1","3","4"],"sr":["2","1","3","4"],"fr":["2","1","3","4"],"it":["2","1","3","4"],"nl":["2","1","3","4"],"tr":["2","1","3","4"],"ar":["2","1","3","4"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0046-4000-8000-000000000046'::uuid,
  'football_rules',
  '{"en":"What is awarded when a defender commits a foul inside their own penalty area?","hr":"Što se dodjeljuje kada branič počini prekršaj u vlastitom šesnaestercu?","de":"Was wird vergeben, wenn ein Verteidiger in seinem eigenen Strafraum ein Foul begeht?","bs":"Šta se dodjeljuje kada branič počini prekršaj u vlastitom šesnaestercu?","es":"¿Qué se concede cuando un defensor comete una falta dentro de su área?","pt":"O que é concedido quando um defensor comete falta dentro da própria área?","sr":"Шта се додељује када бранилац учини прекршај у сопственом шеснаестерцу?","fr":"Que se siffle-t-il quand un défenseur commet une faute dans sa surface de réparation ?","it":"Cosa viene assegnato quando un difensore commette un fallo nella propria area di rigore?","nl":"Wat wordt toegekend wanneer een verdediger een overtreding begaat in het eigen strafschopgebied?","tr":"Bir defans oyuncusu kendi ceza sahasında faul yaptığında ne verilir?","ar":"ماذا يُحتسب عندما يرتكب مدافع خطأً داخل منطقة الجزاء الخاصة به؟"}'::jsonb,
  '{"en":["Penalty kick","Indirect free kick","Corner kick","Drop ball"],"hr":["Jedanaesterac","Indirektni slobodan udarac","Korner","Spuštena lopta"],"de":["Elfmeter","Indirekter Freistoß","Eckstoß","Absetzen"],"bs":["Jedanaesterac","Indirektni slobodan udarac","Korner","Spuštena lopta"],"es":["Penalti","Tiro libre indirecto","Córner","Balón al suelo"],"pt":["Pênalti","Tiro livre indireto","Escanteio","Bola ao chão"],"sr":["Пенал","Индиректни слободан удар","Корнер","Спуштена лопта"],"fr":["Penalty","Coup franc indirect","Corner","Coup de pied arrêté"],"it":["Rigore","Calcio di punizione indiretto","Calcio d''angolo","Rimessa a terra"],"nl":["Strafschop","Indirecte vrije trap","Hoekschop","Dropbal"],"tr":["Penaltı","Dolaylı serbest vuruş","Korner","Yere bırakma"],"ar":["ركلة جزاء","ركلة حرة غير مباشرة","ركنية","إسقاط الكرة"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0047-4000-8000-000000000047'::uuid,
  'football_rules',
  '{"en":"Which player is the only one allowed to use their hands during open play?","hr":"Koji je igrač jedini smije koristiti ruke tijekom igre?","de":"Welcher Spieler darf als einziger während des Spiels die Hände benutzen?","bs":"Koji igrač je jedini smije koristiti ruke tokom igre?","es":"¿Qué jugador es el único que puede usar las manos durante el juego?","pt":"Qual jogador é o único autorizado a usar as mãos durante o jogo?","sr":"Који играч је једини који сме користити руке током игре?","fr":"Quel joueur est le seul autorisé à utiliser ses mains pendant le jeu ?","it":"Quale giocatore è l''unico autorizzato a usare le mani durante il gioco?","nl":"Welke speler mag als enige de handen gebruiken tijdens het spel?","tr":"Oyun sırasında ellerini kullanmasına izin verilen tek oyuncu kimdir?","ar":"أي لاعب هو الوحيد المسموح له باستخدام يديه أثناء اللعب؟"}'::jsonb,
  '{"en":["Goalkeeper","Centre-back","Striker","Captain"],"hr":["Vratar","Stoper","Napadač","Kapetan"],"de":["Torwart","Innenverteidiger","Stürmer","Kapitän"],"bs":["Golman","Štoper","Napadač","Kapetan"],"es":["Portero","Defensa central","Delantero","Capitán"],"pt":["Goleiro","Zagueiro","Atacante","Capitão"],"sr":["Голман","Штопер","Нападач","Капитен"],"fr":["Gardien","Défenseur central","Attaquant","Capitaine"],"it":["Portiere","Difensore centrale","Attaccante","Capitano"],"nl":["Doelman","Centrale verdediger","Spits","Aanvoerder"],"tr":["Kaleci","Stoper","Forvet","Kaptan"],"ar":["حارس المرمى","مدافع مركزي","مهاجم","القائد"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0048-4000-8000-000000000048'::uuid,
  'football_rules',
  '{"en":"What is the offside rule triggered by?","hr":"Čime se aktivira zaleđe?","de":"Wodurch wird die Abseitsregel ausgelöst?","bs":"Čime se aktivira ofsajd?","es":"¿Qué activa la regla del fuera de juego?","pt":"O que ativa a regra do impedimento?","sr":"Чиме се активира офсајд?","fr":"Par quoi la règle du hors-jeu est-elle déclenchée ?","it":"Da cosa viene attivata la regola del fuorigioco?","nl":"Waardoor wordt de buitenspelregel geactiveerd?","tr":"Ofsayt kuralı neyle tetiklenir?","ar":"ما الذي يُفعّل قاعدة التسلل؟"}'::jsonb,
  '{"en":["Being nearer to the opponent''s goal than the second-last defender when the ball is played","Standing in the opponent''s half at any time","Running faster than the defender","Touching the ball with the hand"],"hr":["Biti bliže protivničkom golu od pretposljednjeg braniča kada je lopta dodana","Stajati u protivničkoj polovici u bilo kojem trenutku","Trčati brže od braniča","Dodirnuti loptu rukom"],"de":["Näher am gegnerischen Tor als der vorletzte Verteidiger sein, wenn der Ball gespielt wird","Jederzeit in der gegnerischen Hälfte stehen","Schneller laufen als der Verteidiger","Den Ball mit der Hand berühren"],"bs":["Biti bliže protivničkom golu od pretposljednjeg braniča kada je lopta dodana","Stajati u protivničkoj polovici u bilo kojem trenutku","Trčati brže od braniča","Dodirnuti loptu rukom"],"es":["Estar más cerca de la portería rival que el penúltimo defensor cuando se juega el balón","Estar en el campo rival en cualquier momento","Correr más rápido que el defensor","Tocar el balón con la mano"],"pt":["Estar mais perto do gol adversário que o penúltimo defensor quando a bola é jogada","Estar no campo adversário a qualquer momento","Correr mais rápido que o defensor","Tocar a bola com a mão"],"sr":["Бити ближе противничком голу од претпоследњег браниоца када је лопта додата","Стајати у противничкој половини у било ком тренутку","Трчати брже од браниоца","Додирнути лопту руком"],"fr":["Être plus près du but adverse que l''avant-dernier défenseur au moment de la passe","Se tenir dans la moitié adverse à tout moment","Courir plus vite que le défenseur","Toucher le ballon avec la main"],"it":["Essere più vicino alla porta avversaria del penultimo difensore quando viene giocata la palla","Stare nella metà campo avversaria in qualsiasi momento","Correre più veloce del difensore","Toccare la palla con la mano"],"nl":["Dichter bij het doel van de tegenstander staan dan de een-na-laatste verdediger wanneer de bal wordt gespeeld","Op enig moment in de helft van de tegenstander staan","Sneller rennen dan de verdediger","De bal met de hand aanraken"],"tr":["Top oynandığında son ikinci savunmacıdan daha yakın olmak","Herhangi bir anda rakip yarı sahada durmak","Savunmacıdan daha hızlı koşmak","Topa elle dokunmak"],"ar":["أن يكون أقرب إلى مرمى الخصم من المدافع قبل الأخير عند تمرير الكرة","الوقوف في نصف ملعب الخصم في أي وقت","الركض أسرع من المدافع","لمس الكرة باليد"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0049-4000-8000-000000000049'::uuid,
  'football_rules',
  '{"en":"How long is each half in a standard football match?","hr":"Koliko traje svako poluvrijeme u standardnoj nogometnoj utakmici?","de":"Wie lange dauert jede Halbzeit in einem Standard-Fußballspiel?","bs":"Koliko traje svako poluvrijeme u standardnoj nogometnoj utakmici?","es":"¿Cuánto dura cada tiempo en un partido de fútbol estándar?","pt":"Quanto dura cada tempo em uma partida de futebol padrão?","sr":"Колико траје свако полувреме у стандардној фудбалској утакмици?","fr":"Combien de temps dure chaque mi-temps dans un match de football standard ?","it":"Quanto dura ogni tempo in una partita di calcio standard?","nl":"Hoe lang duurt elke helft in een standaard voetbalwedstrijd?","tr":"Standart bir futbol maçında her yarı kaç dakika sürer?","ar":"كم تستغرق كل شوط في مباراة كرة القدم القياسية؟"}'::jsonb,
  '{"en":["45 minutes","40 minutes","50 minutes","30 minutes"],"hr":["45 minuta","40 minuta","50 minuta","30 minuta"],"de":["45 Minuten","40 Minuten","50 Minuten","30 Minuten"],"bs":["45 minuta","40 minuta","50 minuta","30 minuta"],"es":["45 minutos","40 minutos","50 minutos","30 minutos"],"pt":["45 minutos","40 minutos","50 minutos","30 minutos"],"sr":["45 минута","40 минута","50 минута","30 минута"],"fr":["45 minutes","40 minutes","50 minutes","30 minutes"],"it":["45 minuti","40 minuti","50 minuti","30 minuti"],"nl":["45 minuten","40 minuten","50 minuten","30 minuten"],"tr":["45 dakika","40 dakika","50 dakika","30 dakika"],"ar":["45 دقيقة","40 دقيقة","50 دقيقة","30 دقيقة"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0050-4000-8000-000000000050'::uuid,
  'football_rules',
  '{"en":"What restart is given when the ball wholly crosses the goal line last touched by an attacker, without a goal?","hr":"Koji se ponovni udarac dodjeljuje kada lopta u potpunosti prijeđe gol-liniju nakon zadnjeg dodira napadača, bez gola?","de":"Welcher Neustart wird gegeben, wenn der Ball die Torlinie vollständig überquert, zuletzt von einem Angreifer berührt, ohne Tor?","bs":"Koji ponovni udarac se dodjeljuje kada lopta u potpunosti pređe gol-liniju nakon zadnjeg dodira napadača, bez gola?","es":"¿Qué reinicio se concede cuando el balón cruza completamente la línea de gol tras el último toque de un atacante, sin gol?","pt":"Qual reinício é concedido quando a bola cruza totalmente a linha de gol após o último toque de um atacante, sem gol?","sr":"Који поновни ударац се додељује када лопта у потпуности пређе гол-линију након последњег додира нападача, без гола?","fr":"Quelle remise en jeu est accordée quand le ballon franchit entièrement la ligne de but après le dernier toucher d''un attaquant, sans but ?","it":"Quale ripresa viene concessa quando la palla attraversa completamente la linea di porta dopo l''ultimo tocco di un attaccante, senza gol?","nl":"Welke herstart wordt gegeven wanneer de bal de doellijn volledig passeert na het laatste contact van een aanvaller, zonder doelpunt?","tr":"Top, bir forvetin son dokunuşundan sonra gol olmadan tamamen kale çizgisini geçtiğinde hangi vuruş verilir?","ar":"ما إعادة التشغيل عندما يعبر الكرة خط المرمى بالكامل بعد آخر لمسة من مهاجم دون هدف؟"}'::jsonb,
  '{"en":["Goal kick","Corner kick","Throw-in","Free kick"],"hr":["Aut","Korner","Aut iz outa","Slobodan udarac"],"de":["Abstoß","Eckstoß","Einwurf","Freistoß"],"bs":["Aut","Korner","Aut iz auta","Slobodan udarac"],"es":["Saque de meta","Córner","Saque de banda","Tiro libre"],"pt":["Tiro de meta","Escanteio","Arremesso lateral","Tiro livre"],"sr":["Аут из голе","Корнер","Аут","Слободан удар"],"fr":["Coup de pied de but","Corner","Touche","Coup franc"],"it":["Rimessa dal fondo","Calcio d''angolo","Rimessa laterale","Calcio di punizione"],"nl":["Doeltrap","Hoekschop","Inworp","Vrije trap"],"tr":["Kale vuruşu","Korner","Taç","Serbest vuruş"],"ar":["ركلة مرمى","ركنية","رمية تماس","ركلة حرة"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0051-4000-8000-000000000051'::uuid,
  'football_rules',
  '{"en":"In a penalty shootout, from what mark is the kick taken?","hr":"S koje se oznake izvodi udarac u raspucavanju jedanaesteraca?","de":"Von welchem Punkt wird im Elfmeterschießen geschossen?","bs":"S koje se oznake izvodi udarac u raspucavanju jedanaesteraca?","es":"¿Desde qué marca se lanza el penalti en una tanda de penaltis?","pt":"De qual marca o chute é cobrado na disputa de pênaltis?","sr":"С које ознаке се изводи ударац у пенал серији?","fr":"À partir de quel point le tir au but est-il effectué lors d''une séance de tirs au but ?","it":"Da quale segno viene battuto il rigore nei calci di rigore?","nl":"Vanaf welke stip wordt geschoten bij een strafschoppenserie?","tr":"Penaltı atışlarında vuruş hangi noktadan yapılır?","ar":"من أي نقطة تُنفَّذ ركلة الجزاء في ركلات الترجيح؟"}'::jsonb,
  '{"en":["The penalty mark (11 metres)","The centre circle","The edge of the penalty area","The goal line"],"hr":["Oznaka za jedanaesterac (11 metara)","Središnji krug","Rub šesnaesterca","Gol-linija"],"de":["Elfmeterpunkt (11 Meter)","Mittelkreis","Rand des Strafraums","Torlinie"],"bs":["Oznaka za jedanaesterac (11 metara)","Središnji krug","Rub šesnaesterca","Gol-linija"],"es":["Punto de penalti (11 metros)","Círculo central","Borde del área","Línea de gol"],"pt":["Marca do pênalti (11 metros)","Círculo central","Borda da área","Linha de gol"],"sr":["Ознака за пенал (11 метара)","Централни круг","Ивица шеснаестерца","Гол-линија"],"fr":["Point de penalty (11 mètres)","Cercle central","Bord de la surface","Ligne de but"],"it":["Dischetto del rigore (11 metri)","Cerchio di centrocampo","Bordo dell''area","Linea di porta"],"nl":["Strafschopstip (11 meter)","Middencirkel","Rand van het strafschopgebied","Doellijn"],"tr":["Penaltı noktası (11 metre)","Orta daire","Ceza sahası çizgisi","Kale çizgisi"],"ar":["نقطة الجزاء (11 متراً)","دائرة المنتصف","حافة منطقة الجزاء","خط المرمى"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0052-4000-8000-000000000052'::uuid,
  'football_rules',
  '{"en":"What card results in a player being sent off immediately?","hr":"Koji karton rezultira trenutnim isključenjem igrača?","de":"Welche Karte führt zum sofortigen Platzverweis eines Spielers?","bs":"Koji karton rezultira trenutnim isključenjem igrača?","es":"¿Qué tarjeta provoca la expulsión inmediata de un jugador?","pt":"Qual cartão resulta na expulsão imediata de um jogador?","sr":"Који картон доводи до тренутног искључења играча?","fr":"Quel carton entraîne l''expulsion immédiate d''un joueur ?","it":"Quale cartellino comporta l''espulsione immediata di un giocatore?","nl":"Welke kaart leidt tot directe uitsluiting van een speler?","tr":"Hangi kart bir oyuncunun anında oyundan atılmasına yol açar?","ar":"أي بطاقة تؤدي إلى طرد اللاعب فوراً؟"}'::jsonb,
  '{"en":["Red card","Yellow card","Green card","Blue card"],"hr":["Crveni karton","Žuti karton","Zeleni karton","Plavi karton"],"de":["Rote Karte","Gelbe Karte","Grüne Karte","Blaue Karte"],"bs":["Crveni karton","Žuti karton","Zeleni karton","Plavi karton"],"es":["Tarjeta roja","Tarjeta amarilla","Tarjeta verde","Tarjeta azul"],"pt":["Cartão vermelho","Cartão amarelo","Cartão verde","Cartão azul"],"sr":["Црвени картон","Жути картон","Зелени картон","Плави картон"],"fr":["Carton rouge","Carton jaune","Carton vert","Carton bleu"],"it":["Cartellino rosso","Cartellino giallo","Cartellino verde","Cartellino blu"],"nl":["Rode kaart","Gele kaart","Groene kaart","Blauwe kaart"],"tr":["Kırmızı kart","Sarı kart","Yeşil kart","Mavi kart"],"ar":["بطاقة حمراء","بطاقة صفراء","بطاقة خضراء","بطاقة زرقاء"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0053-4000-8000-000000000053'::uuid,
  'football_rules',
  '{"en":"How many officials typically referee a professional football match?","hr":"Koliko sudaca obično sudi profesionalnu nogometnu utakmicu?","de":"Wie viele Schiedsrichter leiten typischerweise ein professionelles Fußballspiel?","bs":"Koliko sudija obično sudi profesionalnu nogometnu utakmicu?","es":"¿Cuántos árbitros suelen dirigir un partido de fútbol profesional?","pt":"Quantos árbitros costumam arbitrar uma partida de futebol profissional?","sr":"Колико судија обично суди професионалну фудбалску утакмицу?","fr":"Combien d''arbitres dirigent généralement un match de football professionnel ?","it":"Quanti arbitri dirigono tipicamente una partita di calcio professionistica?","nl":"Hoeveel scheidsrechters fluiten doorgaans een professionele voetbalwedstrijd?","tr":"Profesyonel bir futbol maçını genellikle kaç hakem yönetir?","ar":"كم حكماً يديرون عادة مباراة كرة قدم احترافية؟"}'::jsonb,
  '{"en":["4 (1 referee and 3 assistant referees/VAR team)","1","2","6"],"hr":["4 (1 sudac i 3 pomoćna suca/VAR tim)","1","2","6"],"de":["4 (1 Schiedsrichter und 3 Assistenten/VAR-Team)","1","2","6"],"bs":["4 (1 sudija i 3 pomoćna suca/VAR tim)","1","2","6"],"es":["4 (1 árbitro y 3 asistentes/equipo VAR)","1","2","6"],"pt":["4 (1 árbitro e 3 assistentes/equipe VAR)","1","2","6"],"sr":["4 (1 судија и 3 помоћна/ВАР тим)","1","2","6"],"fr":["4 (1 arbitre et 3 assistants/équipe VAR)","1","2","6"],"it":["4 (1 arbitro e 3 assistenti/squadra VAR)","1","2","6"],"nl":["4 (1 scheidsrechter en 3 assistenten/VAR-team)","1","2","6"],"tr":["4 (1 hakem ve 3 yardımcı/VAR ekibi)","1","2","6"],"ar":["4 (حكم واحد و3 مساعدين/فريق VAR)","1","2","6"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0054-4000-8000-000000000054'::uuid,
  'football_rules',
  '{"en":"What is the minimum number of players a team must have on the field to continue a match?","hr":"Koliki je minimalan broj igrača koje momčad mora imati na terenu da bi nastavila utakmicu?","de":"Wie viele Spieler muss eine Mannschaft mindestens auf dem Feld haben, um das Spiel fortzusetzen?","bs":"Koliki je minimalan broj igrača koje momčad mora imati na terenu da nastavi utakmicu?","es":"¿Cuál es el número mínimo de jugadores que un equipo debe tener en el campo para continuar el partido?","pt":"Qual é o número mínimo de jogadores que uma equipe deve ter em campo para continuar a partida?","sr":"Колики је минималан број играча које екипа мора имати на терену да настави утакмицу?","fr":"Quel est le nombre minimum de joueurs qu''une équipe doit avoir sur le terrain pour poursuivre le match ?","it":"Qual è il numero minimo di giocatori che una squadra deve avere in campo per continuare la partita?","nl":"Wat is het minimumaantal spelers dat een team op het veld moet hebben om door te gaan?","tr":"Bir takımın maça devam edebilmesi için sahada bulunması gereken minimum oyuncu sayısı kaçtır?","ar":"ما الحد الأدنى لعدد اللاعبين الذين يجب أن يكونوا على أرض الملعب لمواصلة المباراة؟"}'::jsonb,
  '{"en":["7","5","9","10"],"hr":["7","5","9","10"],"de":["7","5","9","10"],"bs":["7","5","9","10"],"es":["7","5","9","10"],"pt":["7","5","9","10"],"sr":["7","5","9","10"],"fr":["7","5","9","10"],"it":["7","5","9","10"],"nl":["7","5","9","10"],"tr":["7","5","9","10"],"ar":["7","5","9","10"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0055-4000-8000-000000000055'::uuid,
  'football_rules',
  '{"en":"When is a direct free kick awarded?","hr":"Kada se dodjeljuje direktni slobodan udarac?","de":"Wann wird ein direkter Freistoß vergeben?","bs":"Kada se dodjeljuje direktni slobodan udarac?","es":"¿Cuándo se concede un tiro libre directo?","pt":"Quando é concedido um tiro livre direto?","sr":"Када се додељује директни слободан удар?","fr":"Quand un coup franc direct est-il accordé ?","it":"Quando viene assegnato un calcio di punizione diretto?","nl":"Wanneer wordt een directe vrije trap toegekend?","tr":"Ne zaman direkt serbest vuruş verilir?","ar":"متى تُمنح ركلة حرة مباشرة؟"}'::jsonb,
  '{"en":["For most fouls and handball offenses","Only for offside","Only for throw-in violations","Only for goal kicks"],"hr":["Za većinu prekršaja i rukom","Samo za zaleđe","Samo za aut iz outa","Samo za aut"],"de":["Bei den meisten Fouls und Handspielen","Nur bei Abseits","Nur bei Einwurffehlern","Nur bei Abstößen"],"bs":["Za većinu prekršaja i rukom","Samo za ofsajd","Samo za aut iz auta","Samo za aut"],"es":["Por la mayoría de faltas y mano","Solo por fuera de juego","Solo por saque de banda incorrecto","Solo por saque de meta"],"pt":["Para a maioria das faltas e mão na bola","Apenas por impedimento","Apenas por arremesso lateral incorreto","Apenas por tiro de meta"],"sr":["За већину прекршаја и руком","Само за офсајд","Само за аут","Само за аут из голе"],"fr":["Pour la plupart des fautes et des mains","Seulement pour hors-jeu","Seulement pour touche incorrecte","Seulement pour coup de pied de but"],"it":["Per la maggior parte dei falli e del calcio di mano","Solo per fuorigioco","Solo per rimessa laterale errata","Solo per rimessa dal fondo"],"nl":["Voor de meeste overtredingen en hands","Alleen voor buitenspel","Alleen voor inworp overtredingen","Alleen voor doeltrappen"],"tr":["Çoğu faul ve elle oynama için","Sadece ofsayt için","Sadece taç ihlali için","Sadece kale vuruşu için"],"ar":["لمعظم الأخطاء ولمس الكرة باليد","فقط للتسلل","فقط لرمية التماس الخاطئة","فقط لركلة المرمى"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0056-4000-8000-000000000056'::uuid,
  'football_rules',
  '{"en":"What happens at half-time in a standard football match?","hr":"Što se događa na poluvremenu u standardnoj nogometnoj utakmici?","de":"Was passiert zur Halbzeit in einem Standard-Fußballspiel?","bs":"Šta se dešava na poluvremenu u standardnoj nogometnoj utakmici?","es":"¿Qué ocurre en el descanso de un partido de fútbol estándar?","pt":"O que acontece no intervalo de uma partida de futebol padrão?","sr":"Шта се дешава на полувремену у стандардној фудбалској утакмици?","fr":"Que se passe-t-il à la mi-temps dans un match de football standard ?","it":"Cosa succede all''intervallo in una partita di calcio standard?","nl":"Wat gebeurt er tijdens de rust in een standaard voetbalwedstrijd?","tr":"Standart bir futbol maçında devre arasında ne olur?","ar":"ماذا يحدث في استراحة الشوط في مباراة كرة القدم القياسية؟"}'::jsonb,
  '{"en":["Teams switch ends and have a break (usually 15 minutes)","The match ends","Extra time begins","A penalty shootout starts"],"hr":["Momčadi mijenjaju strane i imaju pauzu (obično 15 minuta)","Utakmica završava","Počinje produžetak","Počinje raspucavanje jedanaesteraca"],"de":["Mannschaften wechseln die Seiten und haben eine Pause (meist 15 Minuten)","Das Spiel endet","Verlängerung beginnt","Elfmeterschießen beginnt"],"bs":["Momčadi mijenjaju strane i imaju pauzu (obično 15 minuta)","Utakmica se završava","Počinje produžetak","Počinje raspucavanje jedanaesteraca"],"es":["Los equipos cambian de lado y descansan (normalmente 15 minutos)","El partido termina","Comienza la prórroga","Comienza la tanda de penaltis"],"pt":["As equipes trocam de lado e fazem uma pausa (geralmente 15 minutos)","A partida termina","Começa a prorrogação","Começa a disputa de pênaltis"],"sr":["Екипе мењају стране и праве паузу (обично 15 минута)","Утакмица се завршава","Почиње продужетак","Почиње пенал серија"],"fr":["Les équipes changent de côté et font une pause (généralement 15 minutes)","Le match se termine","Les prolongations commencent","La séance de tirs au but commence"],"it":["Le squadre cambiano campo e fanno una pausa (di solito 15 minuti)","La partita finisce","Iniziano i tempi supplementari","Iniziano i calci di rigore"],"nl":["Teams wisselen van kant en hebben een pauze (meestal 15 minuten)","De wedstrijd eindigt","Verlenging begint","Strafschoppenserie begint"],"tr":["Takımlar yön değiştirir ve ara verir (genellikle 15 dakika)","Maç biter","Uzatmalar başlar","Penaltı atışları başlar"],"ar":["تبدل الفرق الجانبين وتستريح (عادة 15 دقيقة)","تنتهي المباراة","يبدأ الوقت الإضافي","تبدأ ركلات الترجيح"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0057-4000-8000-000000000057'::uuid,
  'football_rules',
  '{"en":"What technology assists referees in determining offside decisions in top competitions?","hr":"Koja tehnologija pomaže sucima u odlukama o zaleđu u top natjecanjima?","de":"Welche Technologie unterstützt Schiedsrichter bei Abseitsentscheidungen in Top-Wettbewerben?","bs":"Koja tehnologija pomaže sucima u odlukama o ofsajdu u top takmičenjima?","es":"¿Qué tecnología ayuda a los árbitros en las decisiones de fuera de juego en las grandes competiciones?","pt":"Qual tecnologia auxilia os árbitros nas decisões de impedimento nas grandes competições?","sr":"Која технологија помаже судијама у одлукама о офсајду у топ такмичењима?","fr":"Quelle technologie aide les arbitres pour les décisions de hors-jeu dans les grandes compétitions ?","it":"Quale tecnologia assiste gli arbitri nelle decisioni di fuorigioco nelle competizioni top?","nl":"Welke technologie helpt scheidsrechters bij buitenspelbeslissingen in toernooien?","tr":"Üst düzey yarışmalarda ofsayt kararlarında hakemlere hangi teknoloji yardımcı olur?","ar":"ما التقنية التي تساعد الحكام في قرارات التسلل في المسابقات الكبرى؟"}'::jsonb,
  '{"en":["Semi-automated offside technology (SAOT)","Goal-line technology only","Hawk-Eye for corners only","No technology is used"],"hr":["Poluautomatska tehnologija za zaleđe (SAOT)","Samo gol-tehnologija","Hawk-Eye samo za kornere","Ne koristi se tehnologija"],"de":["Halbautomatische Abseitstechnologie (SAOT)","Nur Torlinientechnologie","Hawk-Eye nur für Ecken","Keine Technologie wird verwendet"],"bs":["Poluautomatska tehnologija za ofsajd (SAOT)","Samo gol-tehnologija","Hawk-Eye samo za kornere","Ne koristi se tehnologija"],"es":["Tecnología semiautomática de fuera de juego (SAOT)","Solo tecnología de línea de gol","Hawk-Eye solo para córners","No se usa tecnología"],"pt":["Tecnologia semiautomática de impedimento (SAOT)","Apenas tecnologia da linha de gol","Hawk-Eye apenas para escanteios","Nenhuma tecnologia é usada"],"sr":["Полуаутоматска технологија за офсајд (SAOT)","Само гол-технологија","Hawk-Eye само за корнере","Не користи се технологија"],"fr":["Technologie semi-automatisée de hors-jeu (SAOT)","Seulement la technologie de ligne de but","Hawk-Eye uniquement pour les corners","Aucune technologie n''est utilisée"],"it":["Tecnologia semi-automatica del fuorigioco (SAOT)","Solo tecnologia della linea di porta","Hawk-Eye solo per i calci d''angolo","Nessuna tecnologia viene usata"],"nl":["Semi-geautomatiseerde buitenspeltechnologie (SAOT)","Alleen doellijntechnologie","Hawk-Eye alleen voor hoekschoppen","Er wordt geen technologie gebruikt"],"tr":["Yarı otomatik ofsayt teknolojisi (SAOT)","Sadece gol çizgisi teknolojisi","Sadece kornerler için Hawk-Eye","Teknoloji kullanılmaz"],"ar":["تقنية التسلل شبه الآلية (SAOT)","تقنية خط المرمى فقط","Hawk-Eye للركنيات فقط","لا تُستخدم تقنية"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0058-4000-8000-000000000058'::uuid,
  'football_rules',
  '{"en":"What is added time at the end of each half called?","hr":"Kako se zove dodatno vrijeme na kraju svakog poluvremena?","de":"Wie heißt die zusätzliche Zeit am Ende jeder Halbzeit?","bs":"Kako se zove dodatno vrijeme na kraju svakog poluvremena?","es":"¿Cómo se llama el tiempo añadido al final de cada tiempo?","pt":"Como se chama o tempo adicional no final de cada tempo?","sr":"Како се зове додатно време на крају сваког полувремена?","fr":"Comment appelle-t-on le temps ajouté à la fin de chaque mi-temps ?","it":"Come si chiama il tempo aggiunto alla fine di ogni tempo?","nl":"Hoe heet de extra tijd aan het einde van elke helft?","tr":"Her yarının sonunda eklenen süreye ne denir?","ar":"ماذا يُسمى الوقت المضاف في نهاية كل شوط؟"}'::jsonb,
  '{"en":["Stoppage time / injury time","Extra time","Golden goal period","Penalty time"],"hr":["Nadoknada / dodatno vrijeme","Produžetak","Zlatni gol period","Kazneno vrijeme"],"de":["Nachspielzeit","Verlängerung","Golden-Goal-Periode","Strafzeit"],"bs":["Nadoknada / dodatno vrijeme","Produžetak","Zlatni gol period","Kazneno vrijeme"],"es":["Tiempo añadido / de descuento","Prórroga","Período de gol de oro","Tiempo de penalización"],"pt":["Acréscimos / tempo de desconto","Prorrogação","Período de gol de ouro","Tempo de penalidade"],"sr":["Надокнада / додатно време","Продужетак","Златни гол период","Казнено време"],"fr":["Temps additionnel / arrêt de jeu","Prolongations","Période du but en or","Temps de pénalité"],"it":["Recupero / tempo di recupero","Tempi supplementari","Periodo del gol d''oro","Tempo di penalità"],"nl":["Blessuretijd / extra tijd","Verlenging","Golden goal-periode","Straf tijd"],"tr":["Uzatma dakikaları / kayıp zaman","Uzatma","Altın gol dönemi","Ceza süresi"],"ar":["وقت بدل الضائع","الوقت الإضافي","فترة الهدف الذهبي","وقت العقوبة"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0059-4000-8000-000000000059'::uuid,
  'football_rules',
  '{"en":"What restart is used when the ball crosses the touchline?","hr":"Koji se ponovni udarac koristi kada lopta prijeđe aut-liniju?","de":"Welcher Neustart wird verwendet, wenn der Ball die Seitenlinie überquert?","bs":"Koji ponovni udarac se koristi kada lopta pređe aut-liniju?","es":"¿Qué reinicio se usa cuando el balón cruza la línea de banda?","pt":"Qual reinício é usado quando a bola cruza a linha lateral?","sr":"Који поновни ударац се користи када лопта пређе аут-линију?","fr":"Quelle remise en jeu est utilisée quand le ballon franchit la ligne de touche ?","it":"Quale ripresa viene usata quando la palla attraversa la linea laterale?","nl":"Welke herstart wordt gebruikt wanneer de bal de zijlijn passeert?","tr":"Top taç çizgisini geçtiğinde hangi vuruş kullanılır?","ar":"ما إعادة التشغيل عندما تعبر الكرة خط التماس؟"}'::jsonb,
  '{"en":["Throw-in","Corner kick","Goal kick","Drop ball"],"hr":["Aut iz outa","Korner","Aut","Spuštena lopta"],"de":["Einwurf","Eckstoß","Abstoß","Absetzen"],"bs":["Aut iz auta","Korner","Aut","Spuštena lopta"],"es":["Saque de banda","Córner","Saque de meta","Balón al suelo"],"pt":["Arremesso lateral","Escanteio","Tiro de meta","Bola ao chão"],"sr":["Аут","Корнер","Аут из голе","Спуштена лопта"],"fr":["Touche","Corner","Coup de pied de but","Coup de pied arrêté"],"it":["Rimessa laterale","Calcio d''angolo","Rimessa dal fondo","Rimessa a terra"],"nl":["Inworp","Hoekschop","Doeltrap","Dropbal"],"tr":["Taç","Korner","Kale vuruşu","Yere bırakma"],"ar":["رمية تماس","ركنية","ركلة مرمى","إسقاط الكرة"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0060-4000-8000-000000000060'::uuid,
  'football_rules',
  '{"en":"In extra time, how many additional halves are typically played before a penalty shootout?","hr":"Koliko se dodatnih poluvremena obično igra u produžetku prije raspucavanja jedanaesteraca?","de":"Wie viele zusätzliche Halbzeiten werden in der Verlängerung typischerweise gespielt, bevor ein Elfmeterschießen stattfindet?","bs":"Koliko dodatnih poluvremena se obično igra u produžetku prije raspucavanja jedanaesteraca?","es":"¿Cuántos tiempos adicionales se juegan normalmente en la prórroga antes de los penaltis?","pt":"Quantos tempos adicionais são normalmente jogados na prorrogação antes dos pênaltis?","sr":"Колико додатних полувремена се обично игра у продужетку пре пенала?","fr":"Combien de mi-temps supplémentaires sont généralement jouées en prolongation avant les tirs au but ?","it":"Quanti tempi supplementari si giocano tipicamente prima dei calci di rigore?","nl":"Hoeveel extra helften worden er doorgaans gespeeld in verlenging vóór strafschoppen?","tr":"Penaltılardan önce uzatmada genellikle kaç ek yarı oynanır?","ar":"كم شوطاً إضافياً يُلعب عادة في الوقت الإضافي قبل ركلات الترجيح؟"}'::jsonb,
  '{"en":["2 halves of 15 minutes each","1 half of 30 minutes","3 halves of 10 minutes","No extra time is played"],"hr":["2 poluvremena po 15 minuta","1 poluvrijeme od 30 minuta","3 poluvremena po 10 minuta","Ne igra se produžetak"],"de":["2 Halbzeiten à 15 Minuten","1 Halbzeit à 30 Minuten","3 Halbzeiten à 10 Minuten","Es wird keine Verlängerung gespielt"],"bs":["2 poluvremena po 15 minuta","1 poluvrijeme od 30 minuta","3 poluvremena po 10 minuta","Ne igra se produžetak"],"es":["2 tiempos de 15 minutos cada uno","1 tiempo de 30 minutos","3 tiempos de 10 minutos","No se juega prórroga"],"pt":["2 tempos de 15 minutos cada","1 tempo de 30 minutos","3 tempos de 10 minutos","Não há prorrogação"],"sr":["2 полувремена по 15 минута","1 полувреме од 30 минута","3 полувремена по 10 минута","Не игра се продужетак"],"fr":["2 mi-temps de 15 minutes chacune","1 mi-temps de 30 minutes","3 mi-temps de 10 minutes","Pas de prolongation"],"it":["2 tempi da 15 minuti ciascuno","1 tempo da 30 minuti","3 tempi da 10 minuti","Non si giocano supplementari"],"nl":["2 helften van 15 minuten elk","1 helft van 30 minuten","3 helften van 10 minuten","Geen verlenging"],"tr":["15''er dakikalık 2 yarı","30 dakikalık 1 yarı","10''ar dakikalık 3 yarı","Uzatma oynanmaz"],"ar":["شوطان إضافيان 15 دقيقة لكل منهما","شوط واحد 30 دقيقة","3 أشواط 10 دقائق لكل منها","لا يُلعب وقت إضافي"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0061-4000-8000-000000000061'::uuid,
  'legends',
  '{"en":"Which player is known as ''The King of Football'' and won three World Cups?","hr":"Koji igrač je poznat kao ''Kralj nogometa'' i osvojio tri Svjetska prvenstva?","de":"Welcher Spieler ist als ''König des Fußballs'' bekannt und gewann drei Weltmeisterschaften?","bs":"Koji igrač je poznat kao ''Kralj nogometa'' i osvojio tri Svjetska prvenstva?","es":"¿Qué jugador es conocido como ''El Rey del Fútbol'' y ganó tres Mundiales?","pt":"Qual jogador é conhecido como ''O Rei do Futebol'' e venceu três Copas do Mundo?","sr":"Који играч је познат као ''Краљ фудбала'' и освојио три Светска првенства?","fr":"Quel joueur est connu comme ''Le Roi du football'' et a remporté trois Coupes du monde ?","it":"Quale giocatore è noto come ''Il Re del calcio'' e ha vinto tre Mondiali?","nl":"Welke speler staat bekend als ''De Koning van het voetbal'' en won drie wereldkampioenschappen?","tr":"Üç Dünya Kupası kazanan ''Futbolun Kralı'' olarak bilinen oyuncu kimdir?","ar":"أي لاعب يُعرف بـ''ملك كرة القدم'' وفاز بثلاثة كؤوس عالم؟"}'::jsonb,
  '{"en":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"hr":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"de":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"bs":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"es":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"pt":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"sr":["Пеле","Дијего Марадона","Јохан Кројф","Франц Бекенбауер"],"fr":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"it":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"nl":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"tr":["Pelé","Diego Maradona","Johan Cruyff","Franz Beckenbauer"],"ar":["بيليه","دييغو مارادونا","يوهان كرويف","فرانز بيكنباور"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0062-4000-8000-000000000062'::uuid,
  'legends',
  '{"en":"Which Argentine legend led his country to World Cup glory in 1986?","hr":"Koja argentinska legenda je vodila zemlju do svjetskog naslova 1986.?","de":"Welche argentinische Legende führte ihr Land 1986 zum Weltmeistertitel?","bs":"Koja argentinska legenda je vodila zemlju do svjetskog naslova 1986.?","es":"¿Qué leyenda argentina llevó a su país a la gloria mundial en 1986?","pt":"Qual lenda argentina levou seu país à glória mundial em 1986?","sr":"Која аргентинска легенда је водила земљу до светског титула 1986.?","fr":"Quelle légende argentine a mené son pays à la gloire mondiale en 1986 ?","it":"Quale leggenda argentina portò il suo paese alla gloria mondiale nel 1986?","nl":"Welke Argentijnse legende leidde zijn land naar wereldglorie in 1986?","tr":"1986''da ülkesini dünya şampiyonluğuna taşıyan Arjantin efsanesi kimdir?","ar":"أي أسطورة أرجنتينية قادت بلادها للمجد العالمي عام 1986؟"}'::jsonb,
  '{"en":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"hr":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"de":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"bs":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"es":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"pt":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"sr":["Дијего Марадона","Лионел Меси","Габријел Батистута","Марио Кемпес"],"fr":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"it":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"nl":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"tr":["Diego Maradona","Lionel Messi","Gabriel Batistuta","Mario Kempes"],"ar":["دييغو مارادونا","ليونيل ميسي","غابرييل باتيستوتا","ماريو كمبيس"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0063-4000-8000-000000000063'::uuid,
  'legends',
  '{"en":"Which Dutch legend pioneered ''Total Football'' in the 1970s?","hr":"Koja nizozemska legenda je pionir ''Totalnog nogometa'' u 1970-ima?","de":"Welche niederländische Legende begründete in den 1970ern den ''Total Football''?","bs":"Koja holandska legenda je pionir ''Totalnog nogometa'' u 1970-im?","es":"¿Qué leyenda neerlandesa fue pionera del ''Fútbol Total'' en los años 70?","pt":"Qual lenda holandesa foi pioneira do ''Futebol Total'' nos anos 1970?","sr":"Која холандска легенда је пионир ''Тоталног фудбала'' у 1970-им?","fr":"Quelle légende néerlandaise a lancé le ''Football total'' dans les années 1970 ?","it":"Quale leggenda olandese fu pioniera del ''Calcio totale'' negli anni ''70?","nl":"Welke Nederlandse legende was pionier van ''Totaalvoetbal'' in de jaren 70?","tr":"1970''lerde ''Total Futbol''un öncüsü Hollanda efsanesi kimdir?","ar":"أي أسطورة هولندية رائدة ''كرة القدم الشاملة'' في السبعينيات؟"}'::jsonb,
  '{"en":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"hr":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"de":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"bs":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"es":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"pt":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"sr":["Јохан Кројф","Марко ван Бастен","Руд Гулит","Денис Бергкамп"],"fr":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"it":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"nl":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"tr":["Johan Cruyff","Marco van Basten","Ruud Gullit","Dennis Bergkamp"],"ar":["يوهان كرويف","ماركو فان باستن","رود خوليت","دينيس بيركامب"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0064-4000-8000-000000000064'::uuid,
  'legends',
  '{"en":"Which German legend is nicknamed ''Der Kaiser''?","hr":"Koja njemačka legenda nosi nadimak ''Der Kaiser''?","de":"Welche deutsche Legende trägt den Spitznamen ''Der Kaiser''?","bs":"Koja njemačka legenda nosi nadimak ''Der Kaiser''?","es":"¿Qué leyenda alemana tiene el apodo ''Der Kaiser''?","pt":"Qual lenda alemã tem o apelido ''Der Kaiser''?","sr":"Која немачка легенда носи надимак ''Der Kaiser''?","fr":"Quelle légende allemande porte le surnom ''Der Kaiser'' ?","it":"Quale leggenda tedesca è soprannominata ''Der Kaiser''?","nl":"Welke Duitse legende heeft de bijnaam ''Der Kaiser''?","tr":"''Der Kaiser'' lakaplı Alman efsanesi kimdir?","ar":"أي أسطورة ألمانية يلقب بـ''القيصر''؟"}'::jsonb,
  '{"en":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"hr":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"de":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"bs":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"es":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"pt":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"sr":["Франц Бекенбауер","Герд Милер","Лотар Матеус","Јирген Клинсман"],"fr":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"it":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"nl":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"tr":["Franz Beckenbauer","Gerd Müller","Lothar Matthäus","Jürgen Klinsmann"],"ar":["فرانز بيكنباور","غيرد مولر","لوثار ماتيوس","يورغن كلينسمان"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0065-4000-8000-000000000065'::uuid,
  'legends',
  '{"en":"Which Brazilian striker is nicknamed ''O Fenômeno''?","hr":"Koji brazilski napadač nosi nadimak ''O Fenômeno''?","de":"Welcher brasilianische Stürmer trägt den Spitznamen ''O Fenômeno''?","bs":"Koji brazilski napadač nosi nadimak ''O Fenômeno''?","es":"¿Qué delantero brasileño tiene el apodo ''O Fenômeno''?","pt":"Qual atacante brasileiro tem o apelido ''O Fenômeno''?","sr":"Који бразилски нападач носи надимак ''O Fenômeno''?","fr":"Quel attaquant brésilien porte le surnom ''O Fenômeno'' ?","it":"Quale attaccante brasiliano è soprannominato ''O Fenômeno''?","nl":"Welke Braziliaanse spits heeft de bijnaam ''O Fenômeno''?","tr":"''O Fenômeno'' lakaplı Brezilyalı forvet kimdir?","ar":"أي مهاجم برازيلي يلقب بـ''الظاهرة''؟"}'::jsonb,
  '{"en":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"hr":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"de":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"bs":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"es":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"pt":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"sr":["Роналдо Назарио","Роналдињо","Ривалдо","Ромарио"],"fr":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"it":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"nl":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"tr":["Ronaldo Nazário","Ronaldinho","Rivaldo","Romário"],"ar":["رونالدو نازاريو","رونالدينيو","ريفالدو","روماريو"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0066-4000-8000-000000000066'::uuid,
  'legends',
  '{"en":"Which French legend won the Ballon d''Or three times in the 1980s?","hr":"Koja francuska legenda je tri puta osvojila Zlatnu loptu u 1980-ima?","de":"Welche französische Legende gewann in den 1980ern dreimal den Ballon d''Or?","bs":"Koja francuska legenda je tri puta osvojila Zlatnu loptu u 1980-im?","es":"¿Qué leyenda francesa ganó el Balón de Oro tres veces en los años 80?","pt":"Qual lenda francesa venceu a Bola de Ouro três vezes nos anos 1980?","sr":"Која француска легенда је три пута освојила Златну лопту у 1980-им?","fr":"Quelle légende française a remporté le Ballon d''Or trois fois dans les années 1980 ?","it":"Quale leggenda francese vinse il Pallone d''Oro tre volte negli anni ''80?","nl":"Welke Franse legende won drie keer de Ballon d''Or in de jaren 80?","tr":"1980''lerde üç kez Ballon d''Or kazanan Fransız efsanesi kimdir?","ar":"أي أسطورة فرنسية فازت بالكرة الذهبية ثلاث مرات في الثمانينيات؟"}'::jsonb,
  '{"en":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"hr":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"de":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"bs":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"es":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"pt":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"sr":["Мишел Платини","Зинедин Зидан","Тијери Анри","Жан-Пјер Папен"],"fr":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"it":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"nl":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"tr":["Michel Platini","Zinedine Zidane","Thierry Henry","Jean-Pierre Papin"],"ar":["ميشيل بلاتيني","زين الدين زيدان","تييري هنري","جان بيير بابان"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0067-4000-8000-000000000067'::uuid,
  'legends',
  '{"en":"Which Italian goalkeeper is considered one of the greatest ever?","hr":"Koji talijanski vratar se smatra jednim od najvećih svih vremena?","de":"Welcher italienische Torwart gilt als einer der größten aller Zeiten?","bs":"Koji italijanski golman se smatra jednim od najvećih svih vremena?","es":"¿Qué portero italiano se considera uno de los mejores de la historia?","pt":"Qual goleiro italiano é considerado um dos maiores de todos os tempos?","sr":"Који италијански голман се сматра једним од највећих икада?","fr":"Quel gardien italien est considéré comme l''un des plus grands de l''histoire ?","it":"Quale portiere italiano è considerato uno dei più grandi di sempre?","nl":"Welke Italiaanse keeper wordt beschouwd als een van de beste ooit?","tr":"Tüm zamanların en büyüklerinden biri sayılan İtalyan kaleci kimdir?","ar":"أي حارس مرمى إيطالي يُعد من أعظم الحراس على الإطلاق؟"}'::jsonb,
  '{"en":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"hr":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"de":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"bs":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"es":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"pt":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"sr":["Ђанлуиђи Буфон","Дино Зоф","Валтер Зенга","Ђанлука Паљука"],"fr":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"it":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"nl":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"tr":["Gianluigi Buffon","Dino Zoff","Walter Zenga","Gianluca Pagliuca"],"ar":["جيانلويجي بوفون","دينو زوف","والتر زينغا","جيانلوكا باجليوتشا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0068-4000-8000-000000000068'::uuid,
  'legends',
  '{"en":"Which English legend is Manchester United''s all-time top scorer?","hr":"Koja engleska legenda je najbolji strijelac Manchester Uniteda svih vremena?","de":"Welche englische Legende ist Rekordtorschütze von Manchester United?","bs":"Koja engleska legenda je najbolji strijelac Manchester Uniteda svih vremena?","es":"¿Qué leyenda inglesa es el máximo goleador histórico del Manchester United?","pt":"Qual lenda inglesa é o maior artilheiro da história do Manchester United?","sr":"Која енглеска легенда је најбољи стрелац Манчестер Јунајтеда?","fr":"Quelle légende anglaise est le meilleur buteur de l''histoire de Manchester United ?","it":"Quale leggenda inglese è il miglior marcatore di sempre del Manchester United?","nl":"Welke Engelse legende is de topscorer aller tijden van Manchester United?","tr":"Manchester United tarihinin en golcü İngiliz efsanesi kimdir?","ar":"أي أسطورة إنجليزية هو الهداف التاريخي لمانشستر يونايتد؟"}'::jsonb,
  '{"en":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"hr":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"de":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"bs":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"es":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"pt":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"sr":["Вејн Руни","Боби Чарлтон","Денис Ло","Џорџ Бест"],"fr":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"it":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"nl":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"tr":["Wayne Rooney","Bobby Charlton","Denis Law","George Best"],"ar":["واين روني","بوبي تشارلتون","دينيس لو","جورج بست"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0069-4000-8000-000000000069'::uuid,
  'legends',
  '{"en":"Which Liberian legend is the only African Ballon d''Or winner?","hr":"Koja liberijska legenda je jedini Afričanin koji je osvojio Zlatnu loptu?","de":"Welche liberianische Legende ist der einzige afrikanische Ballon-d''Or-Gewinner?","bs":"Koja liberijska legenda je jedini Afričanin koji je osvojio Zlatnu loptu?","es":"¿Qué leyenda liberiana es el único africano en ganar el Balón de Oro?","pt":"Qual lenda liberiana é o único africano a vencer a Bola de Ouro?","sr":"Која либеријска легенда је једини Африканац који је освојио Златну лопту?","fr":"Quelle légende libérienne est le seul Africain à avoir remporté le Ballon d''Or ?","it":"Quale leggenda liberiana è l''unico africano ad aver vinto il Pallone d''Oro?","nl":"Welke Liberiaanse legende is de enige Afrikaanse Ballon d''Or-winnaar?","tr":"Ballon d''Or kazanan tek Afrikalı efsane kimdir?","ar":"أي أسطورة ليبيرية هو الوحيد الأفريقي الفائز بالكرة الذهبية؟"}'::jsonb,
  '{"en":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"hr":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"de":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"bs":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"es":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"pt":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"sr":["Џорџ Веа","Самуел Ето","Дидје Дрогба","Рожер Мила"],"fr":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"it":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"nl":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"tr":["George Weah","Samuel Eto''o","Didier Drogba","Roger Milla"],"ar":["جورج ويا","صامويل إيتو","ديدييه دروغبا","روجيه ميلا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0070-4000-8000-000000000070'::uuid,
  'legends',
  '{"en":"Which Spanish legend is known as ''La Roja''s'' creative midfield maestro?","hr":"Koja španjolska legenda je poznata kao kreativni vezni majstor ''La Roja''?","de":"Welche spanische Legende ist als kreativer Mittelfeldspieler von ''La Roja'' bekannt?","bs":"Koja španska legenda je poznata kao kreativni vezni majstor ''La Roja''?","es":"¿Qué leyenda española es conocida como el maestro creativo del mediocampo de ''La Roja''?","pt":"Qual lenda espanhola é conhecida como o maestro criativo do meio-campo da ''La Roja''?","sr":"Која шпанска легенда је позната као креативни везни мајстор ''La Roja''?","fr":"Quelle légende espagnole est connue comme le maestro créatif du milieu de ''La Roja'' ?","it":"Quale leggenda spagnola è nota come il maestro creativo del centrocampo de ''La Roja''?","nl":"Welke Spaanse legende staat bekend als de creatieve middenveldmeester van ''La Roja''?","tr":"''La Roja''nın yaratıcı orta saha ustası olarak bilinen İspanyol efsanesi kimdir?","ar":"أي أسطورة إسبانية يُعرف بأنه سيد خط الوسط الإبداعي لـ''لا روخا''؟"}'::jsonb,
  '{"en":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"hr":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"de":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"bs":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"es":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"pt":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"sr":["Ксави Ернандез","Андрес Инијеста","Раул Гонзалес","Фернандо Ијеро"],"fr":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"it":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"nl":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"tr":["Xavi Hernández","Andrés Iniesta","Raúl González","Fernando Hierro"],"ar":["تشافي هيرنانديز","أندريس إنييستا","راؤول غونزاليس","فرناندو هييرو"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0071-4000-8000-000000000071'::uuid,
  'legends',
  '{"en":"Which Hungarian legend is considered football''s first international superstar?","hr":"Koja mađarska legenda se smatra prvim međunarodnim nogometnim superzvijezdom?","de":"Welche ungarische Legende gilt als erster internationaler Fußball-Superstar?","bs":"Koja mađarska legenda se smatra prvim međunarodnim nogometnim superzvijezdom?","es":"¿Qué leyenda húngara se considera la primera superestrella internacional del fútbol?","pt":"Qual lenda húngara é considerada a primeira superestrela internacional do futebol?","sr":"Која мађарска легенда се сматра првом међународном фудбалском суперзвездом?","fr":"Quelle légende hongroise est considérée comme la première superstar internationale du football ?","it":"Quale leggenda ungherese è considerata la prima superstar internazionale del calcio?","nl":"Welke Hongaarse legende wordt beschouwd als de eerste internationale voetbalsuperster?","tr":"Futbolun ilk uluslararası süperstarı sayılan Macar efsanesi kimdir?","ar":"أي أسطورة مجارية تُعد أول نجم عالمي في كرة القدم؟"}'::jsonb,
  '{"en":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"hr":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"de":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"bs":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"es":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"pt":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"sr":["Ференц Пушкаш","Шандор Кочиш","Нандор Хидегкути","Јожеф Божик"],"fr":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"it":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"nl":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"tr":["Ferenc Puskás","Sándor Kocsis","Nándor Hidegkuti","József Bozsik"],"ar":["فيرينك بوشكاش","شاندور كوتشيش","ناندور هيدغكوتي","يوزيف بوزسيك"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0072-4000-8000-000000000072'::uuid,
  'legends',
  '{"en":"Which French playmaker scored the winning goal in the 1998 World Cup final?","hr":"Koji francuski vezni je postigao pobjednički gol u finalu Svjetskog prvenstva 1998.?","de":"Welcher französische Spielmacher erzielte das Siegtor im WM-Finale 1998?","bs":"Koji francuski vezni je postigao pobjednički gol u finalu Svjetskog prvenstva 1998.?","es":"¿Qué mediocampista francés marcó el gol de la victoria en la final del Mundial 1998?","pt":"Qual meia francês marcou o gol da vitória na final da Copa de 1998?","sr":"Који француски везни је постигао победоносни гол у финалу Светског првенства 1998.?","fr":"Quel meneur de jeu français a marqué le but victorieux en finale de la Coupe du monde 1998 ?","it":"Quale regista francese segnò il gol della vittoria nella finale dei Mondiali 1998?","nl":"Welke Franse spelverdeler scoorde het winnende doelpunt in de WK-finale van 1998?","tr":"1998 Dünya Kupası finalinde galibiyet golünü atan Fransız oyun kurucu kimdir?","ar":"من سجل هدف الفوز في نهائي كأس العالم 1998؟"}'::jsonb,
  '{"en":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"hr":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"de":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"bs":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"es":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"pt":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"sr":["Зинедин Зидан","Тијери Анри","Патрик Виера","Лоран Блан"],"fr":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"it":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"nl":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"tr":["Zinedine Zidane","Thierry Henry","Patrick Vieira","Laurent Blanc"],"ar":["زين الدين زيدان","تييري هنري","باتريك فييرا","لوران بلان"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0073-4000-8000-000000000073'::uuid,
  'legends',
  '{"en":"Which Cameroonian legend scored a famous goal at the 1990 World Cup at age 38?","hr":"Koja kamerunska legenda je postigla poznati gol na Svjetskom prvenstvu 1990. u dobi od 38 godina?","de":"Welche kamerunische Legende erzielte bei der WM 1990 im Alter von 38 Jahren ein berühmtes Tor?","bs":"Koja kamerunska legenda je postigla poznati gol na Svjetskom prvenstvu 1990. sa 38 godina?","es":"¿Qué leyenda camerunesa marcó un famoso gol en el Mundial de 1990 a los 38 años?","pt":"Qual lenda camaronense marcou um famoso gol na Copa de 1990 aos 38 anos?","sr":"Која камерунска легенда је постигла познати гол на Светском првенству 1990. са 38 година?","fr":"Quelle légende camerounaise a marqué un but célèbre à la Coupe du monde 1990 à 38 ans ?","it":"Quale leggenda camerunense segnò un famoso gol ai Mondiali 1990 a 38 anni?","nl":"Welke Kameroense legende scoorde op het WK 1990 op 38-jarige leeftijd een beroemd doelpunt?","tr":"1990 Dünya Kupası''nda 38 yaşında ünlü bir gol atan Kamerun efsanesi kimdir?","ar":"أي أسطورة كاميرونية سجل هدفاً شهيراً في كأس العالم 1990 وهو في الثامنة والثلاثين؟"}'::jsonb,
  '{"en":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"hr":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"de":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"bs":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"es":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"pt":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"sr":["Рожер Мила","Самуел Ето","Патрик Мбома","Томас Н''Коно"],"fr":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"it":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"nl":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"tr":["Roger Milla","Samuel Eto''o","Patrick Mboma","Thomas N''Kono"],"ar":["روجيه ميلا","صامويل إيتو","باتريك مبوما","توماس نكونو"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0074-4000-8000-000000000074'::uuid,
  'legends',
  '{"en":"Which player won the Ballon d''Or in 1996?","hr":"Tko je osvojio Zlatnu loptu 1996.?","de":"Wer gewann 1996 den Ballon d''Or?","bs":"Ko je osvojio Zlatnu loptu 1996.?","es":"¿Quién ganó el Balón de Oro en 1996?","pt":"Quem venceu a Bola de Ouro em 1996?","sr":"Ко је освојио Златну лопту 1996.?","fr":"Qui a remporté le Ballon d''Or en 1996 ?","it":"Chi ha vinto il Pallone d''Oro nel 1996?","nl":"Wie won de Ballon d''Or in 1996?","tr":"1996''da Ballon d''Or''u kim kazandı?","ar":"من فاز بالكرة الذهبية عام 1996؟"}'::jsonb,
  '{"en":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"hr":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"de":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"bs":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"es":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"pt":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"sr":["Роналдо Назарио","Џорџ Веа","Матијас Замер","Алан Ширер"],"fr":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"it":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"nl":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"tr":["Ronaldo Nazário","George Weah","Matthias Sammer","Alan Shearer"],"ar":["رونالدو نازاريو","جورج ويا","ماتياس زامر","آلان شيرر"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0075-4000-8000-000000000075'::uuid,
  'legends',
  '{"en":"Which Croatian legend captained his nation to a 2018 World Cup final?","hr":"Koja hrvatska legenda je bila kapetan reprezentacije u finalu Svjetskog prvenstva 2018.?","de":"Welche kroatische Legende führte ihr Land als Kapitän ins WM-Finale 2018?","bs":"Koja hrvatska legenda je bila kapetan reprezentacije u finalu Svjetskog prvenstva 2018.?","es":"¿Qué leyenda croata capitaneó a su país en la final del Mundial 2018?","pt":"Qual lenda croata capitaneou sua seleção na final da Copa de 2018?","sr":"Која хрватска легенда је била капитен у финалу Светског првенства 2018.?","fr":"Quelle légende croate a mené son pays en finale de la Coupe du monde 2018 ?","it":"Quale leggenda croata ha guidato la nazionale in finale ai Mondiali 2018?","nl":"Welke Kroatische legende was aanvoerder in de WK-finale van 2018?","tr":"2018 Dünya Kupası finalinde ülkesinin kaptanı olan Hırvat efsanesi kimdir?","ar":"أي أسطورة كرواتية قاد منتخب بلاده في نهائي كأس العالم 2018؟"}'::jsonb,
  '{"en":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"hr":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"de":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"bs":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"es":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"pt":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"sr":["Лука Модрић","Давор Шукер","Роберт Просинечки","Дарио Срна"],"fr":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"it":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"nl":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"tr":["Luka Modrić","Davor Šuker","Robert Prosinečki","Darijo Srna"],"ar":["لوكا مودريتش","دافور سوكر","روبرت بروسينيتشكي","داريو سرنا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0076-4000-8000-000000000076'::uuid,
  'legends',
  '{"en":"Which Brazilian playmaker won the 2002 World Cup and is known for his no-look passes?","hr":"Koji brazilski vezni je osvojio Svjetsko prvenstvo 2002. i poznat je po pasovima bez gledanja?","de":"Welcher brasilianische Spielmacher gewann die WM 2002 und ist für seine No-Look-Pässe bekannt?","bs":"Koji brazilski vezni je osvojio Svjetsko prvenstvo 2002. i poznat je po pasovima bez gledanja?","es":"¿Qué mediocampista brasileño ganó el Mundial 2002 y es famoso por sus pases sin mirar?","pt":"Qual meia brasileiro venceu a Copa de 2002 e é famoso por passes sem olhar?","sr":"Који бразилски везни је освојио Светско првенство 2002. и познат је по додавима без гледања?","fr":"Quel meneur de jeu brésilien a remporté la Coupe du monde 2002 et est célèbre pour ses passes sans regarder ?","it":"Quale regista brasiliano vinse i Mondiali 2002 ed è famoso per i passaggi senza guardare?","nl":"Welke Braziliaanse spelverdeler won het WK 2002 en staat bekend om zijn no-look passes?","tr":"2002 Dünya Kupası''nı kazanan ve bakmadan paslarıyla ünlü Brezilyalı oyun kurucu kimdir?","ar":"أي صانع ألعاب برازيلي فاز بكأس العالم 2002 ويُعرف بتمريراته دون النظر؟"}'::jsonb,
  '{"en":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"hr":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"de":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"bs":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"es":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"pt":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"sr":["Роналдињо","Ривалдо","Кака","Жунињо Пернамбукано"],"fr":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"it":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"nl":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"tr":["Ronaldinho","Rivaldo","Kaká","Juninho Pernambucano"],"ar":["رونالدينيو","ريفالدو","كاكا","جونينيو بيرنامبوكانو"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0077-4000-8000-000000000077'::uuid,
  'legends',
  '{"en":"Which Northern Irish legend was nicknamed ''El Beatle'' at Manchester United?","hr":"Koja sjevernoirska legenda je nosila nadimak ''El Beatle'' u Manchester Unitedu?","de":"Welche nordirische Legende trug bei Manchester United den Spitznamen ''El Beatle''?","bs":"Koja sjevernoirska legenda je nosila nadimak ''El Beatle'' u Manchester Unitedu?","es":"¿Qué leyenda norirlandesa tenía el apodo ''El Beatle'' en el Manchester United?","pt":"Qual lenda norte-irlandesa tinha o apelido ''El Beatle'' no Manchester United?","sr":"Која северноирска легенда је носила надимак ''El Beatle'' у Манчестер Јунајтеду?","fr":"Quelle légende nord-irlandaise portait le surnom ''El Beatle'' à Manchester United ?","it":"Quale leggenda nordirlandese era soprannominata ''El Beatle'' al Manchester United?","nl":"Welke Noord-Ierse legende had de bijnaam ''El Beatle'' bij Manchester United?","tr":"Manchester United''ta ''El Beatle'' lakaplı Kuzey İrlandalı efsane kimdir?","ar":"أي أسطورة إيرلندية شمالية لُقبت بـ''الخنفساء'' في مانشستر يونايتد؟"}'::jsonb,
  '{"en":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"hr":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"de":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"bs":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"es":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"pt":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"sr":["Џорџ Бест","Боби Чарлтон","Денис Ло","Пат Џенингс"],"fr":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"it":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"nl":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"tr":["George Best","Bobby Charlton","Denis Law","Pat Jennings"],"ar":["جورج بست","بوبي تشارلتون","دينيس لو","بات جينينغز"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0078-4000-8000-000000000078'::uuid,
  'legends',
  '{"en":"Which German striker is the all-time top scorer in World Cup history with 16 goals?","hr":"Koji njemački napadač je najbolji strijelac u povijesti Svjetskog prvenstva sa 16 golova?","de":"Welcher deutsche Stürmer ist mit 16 Toren Rekordtorschütze der Weltmeisterschaftsgeschichte?","bs":"Koji njemački napadač je najbolji strijelac u historiji Svjetskog prvenstva sa 16 golova?","es":"¿Qué delantero alemán es el máximo goleador histórico del Mundial con 16 goles?","pt":"Qual atacante alemão é o maior artilheiro da história da Copa do Mundo com 16 gols?","sr":"Који немачки нападач је најбољи стрелац у историји Светског првенства са 16 голова?","fr":"Quel attaquant allemand est le meilleur buteur de l''histoire de la Coupe du monde avec 16 buts ?","it":"Quale attaccante tedesco è il miglior marcatore della storia dei Mondiali con 16 gol?","nl":"Welke Duitse spits is met 16 doelpunten de topscorer aller tijden op het WK?","tr":"Dünya Kupası tarihinin 16 golle en golcü Alman forveti kimdir?","ar":"أي مهاجم ألماني هو الهداف التاريخي لكأس العالم بـ16 هدفاً؟"}'::jsonb,
  '{"en":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"hr":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"de":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"bs":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"es":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"pt":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"sr":["Мирослав Клозе","Герд Милер","Јирген Клинсман","Руди Фелер"],"fr":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"it":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"nl":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"tr":["Miroslav Klose","Gerd Müller","Jürgen Klinsmann","Rudi Völler"],"ar":["ميروسلاف كلوزه","غيرد مولر","يورغن كلينسمان","رودي فولر"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0079-4000-8000-000000000079'::uuid,
  'legends',
  '{"en":"Which Italian defender is famous for his sweeper role and captained Italy to World Cup glory in 1982?","hr":"Koji talijanski branič je poznat po ulozi libera i kapitenstvom doveo Italiju do naslova 1982.?","de":"Welcher italienische Verteidiger war als Libero berühmt und führte Italien 1982 zum Weltmeistertitel?","bs":"Koji italijanski branič je poznat po ulozi libera i kapitenstvom doveo Italiju do naslova 1982.?","es":"¿Qué defensor italiano fue famoso como líbero y capitaneó a Italia al título mundial en 1982?","pt":"Qual defensor italiano foi famoso como líbero e capitaneou a Itália ao título mundial em 1982?","sr":"Који италијански бранилац је познат као либеро и капитенством довео Италију до титула 1982.?","fr":"Quel défenseur italien était célèbre comme libéro et a mené l''Italie au titre mondial en 1982 ?","it":"Quale difensore italiano fu famoso come libero e guidò l''Italia al titolo mondiale nel 1982?","nl":"Welke Italiaanse verdediger was beroemd als libero en leidde Italië in 1982 naar wereldtitel?","tr":"Libero rolüyle ünlü ve 1982''de İtalya''yı dünya şampiyonluğuna taşıyan İtalyan defans oyuncusu kimdir?","ar":"أي مدافع إيطالي اشتهر بدور السويبر وقاد إيطاليا للمجد العالمي عام 1982؟"}'::jsonb,
  '{"en":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"hr":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"de":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"bs":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"es":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"pt":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"sr":["Гаетано Сциреа","Франко Барези","Паоло Малдини","Клаудио Џентиле"],"fr":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"it":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"nl":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"tr":["Gaetano Scirea","Franco Baresi","Paolo Maldini","Claudio Gentile"],"ar":["غايتانو شيريا","فرانكو باريزي","باولو مالديني","كلاوديو جنتيلي"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0080-4000-8000-000000000080'::uuid,
  'legends',
  '{"en":"Which Portuguese legend is the all-time top scorer for the national team?","hr":"Koja portugalska legenda je najbolji strijelac portugalske reprezentacije svih vremena?","de":"Welche portugiesische Legende ist Rekordtorschütze der Nationalmannschaft?","bs":"Koja portugalska legenda je najbolji strijelac portugalske reprezentacije svih vremena?","es":"¿Qué leyenda portuguesa es el máximo goleador histórico de la selección?","pt":"Qual lenda portuguesa é o maior artilheiro da história da seleção?","sr":"Која португалска легенда је најбољи стрелац репрезентације?","fr":"Quelle légende portugaise est le meilleur buteur de l''équipe nationale ?","it":"Quale leggenda portoghese è il miglior marcatore della nazionale?","nl":"Welke Portugese legende is de topscorer aller tijden van het nationale team?","tr":"Portekiz milli takımının tüm zamanların en golcü efsanesi kimdir?","ar":"أي أسطورة برتغالية هو الهداف التاريخي للمنتخب؟"}'::jsonb,
  '{"en":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"hr":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"de":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"bs":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"es":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"pt":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"sr":["Кристијано Роналдо","Еузебио","Луиш Фиго","Паулета"],"fr":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"it":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"nl":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"tr":["Cristiano Ronaldo","Eusébio","Luís Figo","Pauleta"],"ar":["كريستيانو رونالدو","أوزيبيو","لويس فيغو","باوليتا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0081-4000-8000-000000000081'::uuid,
  'current_football',
  '{"en":"Who won the 2024 Ballon d''Or?","hr":"Tko je osvojio Zlatnu loptu 2024.?","de":"Wer gewann den Ballon d''Or 2024?","bs":"Ko je osvojio Zlatnu loptu 2024.?","es":"¿Quién ganó el Balón de Oro 2024?","pt":"Quem venceu a Bola de Ouro de 2024?","sr":"Ко је освојио Златну лопту 2024.?","fr":"Qui a remporté le Ballon d''Or 2024 ?","it":"Chi ha vinto il Pallone d''Oro 2024?","nl":"Wie won de Ballon d''Or 2024?","tr":"2024 Ballon d''Or''u kim kazandı?","ar":"من فاز بالكرة الذهبية 2024؟"}'::jsonb,
  '{"en":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"hr":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"de":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"bs":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"es":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"pt":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"sr":["Родри","Винисијус Жуниор","Џуд Белингем","Килиан Мбапе"],"fr":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"it":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"nl":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"tr":["Rodri","Vinícius Júnior","Jude Bellingham","Kylian Mbappé"],"ar":["رودري","فينيسيوس جونيور","جود بيلينغهام","كيليان مبابي"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0082-4000-8000-000000000082'::uuid,
  'current_football',
  '{"en":"Which club won the 2023-24 Premier League title?","hr":"Koji je klub osvojio naslov Premier lige 2023./24.?","de":"Welcher Verein gewann die Premier League 2023/24?","bs":"Koji klub je osvojio naslov Premier lige 2023./24.?","es":"¿Qué club ganó la Premier League 2023-24?","pt":"Qual clube venceu a Premier League de 2023-24?","sr":"Који је клуб освојио Премијер лигу 2023/24.?","fr":"Quel club a remporté la Premier League 2023-24 ?","it":"Quale club ha vinto la Premier League 2023-24?","nl":"Welke club won de Premier League 2023-24?","tr":"2023-24 Premier League şampiyonluğunu hangi kulüp kazandı?","ar":"أي نادٍ فاز بالدوري الإنجليزي الممتاز 2023-24؟"}'::jsonb,
  '{"en":["Manchester City","Arsenal","Liverpool","Aston Villa"],"hr":["Manchester City","Arsenal","Liverpool","Aston Villa"],"de":["Manchester City","Arsenal","Liverpool","Aston Villa"],"bs":["Manchester City","Arsenal","Liverpool","Aston Villa"],"es":["Manchester City","Arsenal","Liverpool","Aston Villa"],"pt":["Manchester City","Arsenal","Liverpool","Aston Villa"],"sr":["Манчестер Сити","Арсенал","Ливерпул","Астон Вила"],"fr":["Manchester City","Arsenal","Liverpool","Aston Villa"],"it":["Manchester City","Arsenal","Liverpool","Aston Villa"],"nl":["Manchester City","Arsenal","Liverpool","Aston Villa"],"tr":["Manchester City","Arsenal","Liverpool","Aston Villa"],"ar":["مانشستر سيتي","آرسنال","ليفربول","أستون فيلا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0083-4000-8000-000000000083'::uuid,
  'current_football',
  '{"en":"Which nation won UEFA Euro 2024?","hr":"Koja je nacija osvojila UEFA Euro 2024.?","de":"Welche Nation gewann die UEFA Euro 2024?","bs":"Koja nacija je osvojila UEFA Euro 2024.?","es":"¿Qué nación ganó la Eurocopa 2024?","pt":"Qual nação venceu a Eurocopa 2024?","sr":"Која је нација освојила УЕФА Еуро 2024.?","fr":"Quelle nation a remporté l''UEFA Euro 2024 ?","it":"Quale nazione ha vinto l''UEFA Euro 2024?","nl":"Welk land won het EK 2024?","tr":"2024 Avrupa Şampiyonası''nı hangi ülke kazandı?","ar":"أي دولة فازت ببطولة أمم أوروبا 2024؟"}'::jsonb,
  '{"en":["Spain","England","France","Netherlands"],"hr":["Španjolska","Engleska","Francuska","Nizozemska"],"de":["Spanien","England","Frankreich","Niederlande"],"bs":["Španija","Engleska","Francuska","Holandija"],"es":["España","Inglaterra","Francia","Países Bajos"],"pt":["Espanha","Inglaterra","França","Holanda"],"sr":["Шпанија","Енглеска","Француска","Холандија"],"fr":["Espagne","Angleterre","France","Pays-Bas"],"it":["Spagna","Inghilterra","Francia","Paesi Bassi"],"nl":["Spanje","Engeland","Frankrijk","Nederland"],"tr":["İspanya","İngiltere","Fransa","Hollanda"],"ar":["إسبانيا","إنجلترا","فرنسا","هولندا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0084-4000-8000-000000000084'::uuid,
  'current_football',
  '{"en":"Who is the manager of Manchester City as of 2024?","hr":"Tko je trener Manchester Cityja od 2024.?","de":"Wer ist Trainer von Manchester City ab 2024?","bs":"Ko je trener Manchester Cityja od 2024.?","es":"¿Quién es el entrenador del Manchester City en 2024?","pt":"Quem é o treinador do Manchester City em 2024?","sr":"Ко је тренер Манчестер Ситија од 2024.?","fr":"Qui est l''entraîneur de Manchester City en 2024 ?","it":"Chi è l''allenatore del Manchester City nel 2024?","nl":"Wie is de trainer van Manchester City in 2024?","tr":"2024 itibarıyla Manchester City''nin teknik direktörü kimdir?","ar":"من مدرب مانشستر سيتي اعتباراً من 2024؟"}'::jsonb,
  '{"en":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"hr":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"de":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"bs":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"es":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"pt":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"sr":["Пеп Гвардиола","Јирген Клоп","Микел Артета","Ерик тен Хаг"],"fr":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"it":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"nl":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"tr":["Pep Guardiola","Jürgen Klopp","Mikel Arteta","Erik ten Hag"],"ar":["بيب غوارديولا","يورغن كلوب","ميكيل أرتيتا","إريك تن هاغ"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0085-4000-8000-000000000085'::uuid,
  'current_football',
  '{"en":"Which striker joined Real Madrid from Paris Saint-Germain in 2024?","hr":"Koji je napadač prešao u Real Madrid iz Paris Saint-Germaina 2024.?","de":"Welcher Stürmer wechselte 2024 von Paris Saint-Germain zu Real Madrid?","bs":"Koji napadač je prešao u Real Madrid iz Paris Saint-Germaina 2024.?","es":"¿Qué delantero se unió al Real Madrid desde el PSG en 2024?","pt":"Qual atacante juntou-se ao Real Madrid vindo do PSG em 2024?","sr":"Који нападач је прешао у Реал Мадрид из ПСЖ-а 2024.?","fr":"Quel attaquant a rejoint le Real Madrid depuis le PSG en 2024 ?","it":"Quale attaccante è passato al Real Madrid dal PSG nel 2024?","nl":"Welke spits trok in 2024 van PSG naar Real Madrid?","tr":"2024''te PSG''den Real Madrid''e katılan forvet kimdir?","ar":"أي مهاجم انضم لريال مدريد من باريس سان جيرمان عام 2024؟"}'::jsonb,
  '{"en":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"hr":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"de":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"bs":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"es":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"pt":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"sr":["Килиан Мбапе","Ерлинг Холанд","Хари Кејн","Виктор Осимен"],"fr":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"it":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"nl":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"tr":["Kylian Mbappé","Erling Haaland","Harry Kane","Victor Osimhen"],"ar":["كيليان مبابي","إيرلينغ هالاند","هاري كين","فيكتور أوسيمين"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0086-4000-8000-000000000086'::uuid,
  'current_football',
  '{"en":"Which club did Lionel Messi join in MLS in 2023?","hr":"Kojem je klubu Lionel Messi pristupio u MLS-u 2023.?","de":"Welchem Verein schloss sich Lionel Messi 2023 in der MLS an?","bs":"Kojem klubu je Lionel Messi pristupio u MLS-u 2023.?","es":"¿A qué club se unió Lionel Messi en la MLS en 2023?","pt":"A qual clube Lionel Messi se juntou na MLS em 2023?","sr":"Којем је клубу Лионел Меси приступио у МЛС-у 2023.?","fr":"À quel club Lionel Messi a-t-il rejoint la MLS en 2023 ?","it":"A quale club si è unito Lionel Messi nella MLS nel 2023?","nl":"Bij welke club sloot Lionel Messi zich in 2023 aan in de MLS?","tr":"Lionel Messi 2023''te MLS''te hangi kulübe katıldı?","ar":"أي نادٍ انضم إليه ليونيل ميسي في الدوري الأمريكي عام 2023؟"}'::jsonb,
  '{"en":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"hr":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"de":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"bs":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"es":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"pt":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"sr":["Интер Мајами","ЛА Галакси","Њујорк Сити","Атланта Јунајтед"],"fr":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"it":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"nl":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"tr":["Inter Miami","LA Galaxy","New York City FC","Atlanta United"],"ar":["إنتر ميامي","إل إيه غالاكسي","نيويورك سيتي","أتلانتا يونايتد"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0087-4000-8000-000000000087'::uuid,
  'current_football',
  '{"en":"Which nation won the 2023 FIFA Women''s World Cup?","hr":"Koja je nacija osvojila FIFA Svjetsko prvenstvo za žene 2023.?","de":"Welche Nation gewann die FIFA Frauen-Weltmeisterschaft 2023?","bs":"Koja nacija je osvojila FIFA Svjetsko prvenstvo za žene 2023.?","es":"¿Qué nación ganó la Copa Mundial Femenina de la FIFA 2023?","pt":"Qual nação venceu a Copa do Mundo Feminina da FIFA de 2023?","sr":"Која је нација освојила ФИФА Светско првенство за жене 2023.?","fr":"Quelle nation a remporté la Coupe du monde féminine de la FIFA 2023 ?","it":"Quale nazione ha vinto la Coppa del Mondo femminile FIFA 2023?","nl":"Welk land won het FIFA Wereldkampioenschap vrouwenvoetbal 2023?","tr":"2023 FIFA Kadınlar Dünya Kupası''nı hangi ülke kazandı?","ar":"أي دولة فازت بكأس العالم للسيدات 2023؟"}'::jsonb,
  '{"en":["Spain","England","Sweden","Australia"],"hr":["Španjolska","Engleska","Švedska","Australija"],"de":["Spanien","England","Schweden","Australien"],"bs":["Španija","Engleska","Švedska","Australija"],"es":["España","Inglaterra","Suecia","Australia"],"pt":["Espanha","Inglaterra","Suécia","Austrália"],"sr":["Шпанија","Енглеска","Шведска","Аустралија"],"fr":["Espagne","Angleterre","Suède","Australie"],"it":["Spagna","Inghilterra","Svezia","Australia"],"nl":["Spanje","Engeland","Zweden","Australië"],"tr":["İspanya","İngiltere","İsveç","Avustralya"],"ar":["إسبانيا","إنجلترا","السويد","أستراليا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0088-4000-8000-000000000088'::uuid,
  'current_football',
  '{"en":"Who is Arsenal''s manager who led them to second place in 2023-24?","hr":"Tko je trener Arsenala koji ih je doveo do drugog mjesta 2023./24.?","de":"Wer ist der Arsenal-Trainer, der sie 2023/24 auf den zweiten Platz führte?","bs":"Ko je trener Arsenala koji ih je doveo do drugog mjesta 2023./24.?","es":"¿Quién es el entrenador del Arsenal que los llevó al segundo puesto en 2023-24?","pt":"Quem é o treinador do Arsenal que os levou ao segundo lugar em 2023-24?","sr":"Ко је тренер Арсенала који их је довео до другог места 2023/24.?","fr":"Qui est l''entraîneur d''Arsenal qui les a menés à la deuxième place en 2023-24 ?","it":"Chi è l''allenatore dell''Arsenal che li ha portati al secondo posto nel 2023-24?","nl":"Wie is de Arsenal-trainer die hen in 2023-24 naar de tweede plaats leidde?","tr":"2023-24''te Arsenal''ı ikinci sıraya taşıyan teknik direktör kimdir?","ar":"من مدرب آرسنال الذي قادهم للمركز الثاني 2023-24؟"}'::jsonb,
  '{"en":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"hr":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"de":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"bs":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"es":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"pt":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"sr":["Микел Артета","Унаи Емери","Арсен Венгер","Фреди Љунгберг"],"fr":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"it":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"nl":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"tr":["Mikel Arteta","Unai Emery","Arsène Wenger","Freddie Ljungberg"],"ar":["ميكيل أرتيتا","أوناي إيمري","آرسين فينغر","فريدي ليونغبرغ"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0089-4000-8000-000000000089'::uuid,
  'current_football',
  '{"en":"Which club won the 2023-24 La Liga title?","hr":"Koji je klub osvojio La Ligu 2023./24.?","de":"Welcher Verein gewann La Liga 2023/24?","bs":"Koji klub je osvojio La Ligu 2023./24.?","es":"¿Qué club ganó La Liga 2023-24?","pt":"Qual clube venceu a La Liga de 2023-24?","sr":"Који је клуб освојио Ла Лигу 2023/24.?","fr":"Quel club a remporté la Liga 2023-24 ?","it":"Quale club ha vinto la Liga 2023-24?","nl":"Welke club won La Liga 2023-24?","tr":"2023-24 La Liga şampiyonluğunu hangi kulüp kazandı?","ar":"أي نادٍ فاز بالدوري الإسباني 2023-24؟"}'::jsonb,
  '{"en":["Real Madrid","Barcelona","Girona","Atlético Madrid"],"hr":["Real Madrid","Barcelona","Girona","Atlético Madrid"],"de":["Real Madrid","Barcelona","Girona","Atlético Madrid"],"bs":["Real Madrid","Barcelona","Girona","Atlético Madrid"],"es":["Real Madrid","Barcelona","Girona","Atlético Madrid"],"pt":["Real Madrid","Barcelona","Girona","Atlético Madrid"],"sr":["Реал Мадрид","Барселона","Жирона","Атлетико Мадрид"],"fr":["Real Madrid","Barcelone","Girona","Atlético Madrid"],"it":["Real Madrid","Barcellona","Girona","Atlético Madrid"],"nl":["Real Madrid","Barcelona","Girona","Atlético Madrid"],"tr":["Real Madrid","Barcelona","Girona","Atlético Madrid"],"ar":["ريال مدريد","برشلونة","جيرونا","أتلتيكو مدريد"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0090-4000-8000-000000000090'::uuid,
  'current_football',
  '{"en":"Which Norwegian striker plays for Manchester City?","hr":"Koji norveški napadač igra za Manchester City?","de":"Welcher norwegische Stürmer spielt für Manchester City?","bs":"Koji norveški napadač igra za Manchester City?","es":"¿Qué delantero noruego juega para el Manchester City?","pt":"Qual atacante norueguês joga pelo Manchester City?","sr":"Који норвешки нападач игра за Манчестер Сити?","fr":"Quel attaquant norvégien joue pour Manchester City ?","it":"Quale attaccante norvegese gioca per il Manchester City?","nl":"Welke Noorse spits speelt voor Manchester City?","tr":"Manchester City''de oynayan Norveçli forvet kimdir?","ar":"أي مهاجم نرويجي يلعب لمانشستر سيتي؟"}'::jsonb,
  '{"en":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"hr":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"de":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"bs":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"es":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"pt":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"sr":["Ерлинг Холанд","Александер Сёрлот","Џошуа Кинг","Мартин Едегор"],"fr":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"it":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"nl":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"tr":["Erling Haaland","Alexander Sørloth","Joshua King","Martin Ødegaard"],"ar":["إيرلينغ هالاند","ألكسندر سورلوث","جوشوا كينغ","مارتن أوديغارد"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0091-4000-8000-000000000091'::uuid,
  'current_football',
  '{"en":"Which club won the 2023-24 Bundesliga title?","hr":"Koji je klub osvojio Bundesligu 2023./24.?","de":"Welcher Verein gewann die Bundesliga 2023/24?","bs":"Koji klub je osvojio Bundesligu 2023./24.?","es":"¿Qué club ganó la Bundesliga 2023-24?","pt":"Qual clube venceu a Bundesliga de 2023-24?","sr":"Који је клуб освојио Бундеслигу 2023/24.?","fr":"Quel club a remporté la Bundesliga 2023-24 ?","it":"Quale club ha vinto la Bundesliga 2023-24?","nl":"Welke club won de Bundesliga 2023-24?","tr":"2023-24 Bundesliga şampiyonluğunu hangi kulüp kazandı?","ar":"أي نادٍ فاز بالدوري الألماني 2023-24؟"}'::jsonb,
  '{"en":["Bayer Leverkusen","Bayern Munich","VfB Stuttgart","Borussia Dortmund"],"hr":["Bayer Leverkusen","Bayern München","VfB Stuttgart","Borussia Dortmund"],"de":["Bayer Leverkusen","Bayern München","VfB Stuttgart","Borussia Dortmund"],"bs":["Bayer Leverkusen","Bayern München","VfB Stuttgart","Borussia Dortmund"],"es":["Bayer Leverkusen","Bayern Múnich","VfB Stuttgart","Borussia Dortmund"],"pt":["Bayer Leverkusen","Bayern de Munique","VfB Stuttgart","Borussia Dortmund"],"sr":["Бајер Леверкузен","Бајерн Минхен","Штутгарт","Борусија Дортмунд"],"fr":["Bayer Leverkusen","Bayern Munich","VfB Stuttgart","Borussia Dortmund"],"it":["Bayer Leverkusen","Bayern Monaco","VfB Stoccarda","Borussia Dortmund"],"nl":["Bayer Leverkusen","Bayern München","VfB Stuttgart","Borussia Dortmund"],"tr":["Bayer Leverkusen","Bayern Münih","VfB Stuttgart","Borussia Dortmund"],"ar":["باير ليفركوزن","بايرن ميونخ","شتوتغارت","بوروسيا دورتموند"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0092-4000-8000-000000000092'::uuid,
  'current_football',
  '{"en":"Who managed Bayer Leverkusen to their unbeaten 2023-24 Bundesliga title?","hr":"Tko je vodio Bayer Leverkusen do neporaženog naslova Bundeslige 2023./24.?","de":"Wer trainierte Bayer Leverkusen zum ungeschlagenen Bundesliga-Titel 2023/24?","bs":"Ko je vodio Bayer Leverkusen do neporaženog naslova Bundeslige 2023./24.?","es":"¿Quién dirigió al Bayer Leverkusen a su título invicto de Bundesliga 2023-24?","pt":"Quem treinou o Bayer Leverkusen no título invicto da Bundesliga 2023-24?","sr":"Ко је водио Бајер Леверкузен до непораженог наслова Бундеслиге 2023/24.?","fr":"Qui a entraîné le Bayer Leverkusen vers son titre invaincu de Bundesliga 2023-24 ?","it":"Chi ha allenato il Bayer Leverkusen al titolo imbattuto di Bundesliga 2023-24?","nl":"Wie traineerde Bayer Leverkusen naar de ongeslagen Bundesliga-titel 2023-24?","tr":"2023-24''te Bayer Leverkusen''i yenilgisiz Bundesliga şampiyonluğuna taşıyan teknik direktör kimdir?","ar":"من أدرب باير ليفركوزن للقب الدوري الألماني دون هزيمة 2023-24؟"}'::jsonb,
  '{"en":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"hr":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"de":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"bs":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"es":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"pt":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"sr":["Ксаби Алонсо","Јулиан Нагелсман","Томас Тухел","Марко Розе"],"fr":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"it":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"nl":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"tr":["Xabi Alonso","Julian Nagelsmann","Thomas Tuchel","Marco Rose"],"ar":["تشابي ألونسو","يوليان ناغيلسمان","توماس توخيل","ماركو روز"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0093-4000-8000-000000000093'::uuid,
  'current_football',
  '{"en":"Which Egyptian forward plays for Liverpool?","hr":"Koji egipatski napadač igra za Liverpool?","de":"Welcher ägyptische Stürmer spielt für Liverpool?","bs":"Koji egipatski napadač igra za Liverpool?","es":"¿Qué delantero egipcio juega para el Liverpool?","pt":"Qual atacante egípcio joga pelo Liverpool?","sr":"Који египатски нападач игра за Ливерпул?","fr":"Quel attaquant égyptien joue pour Liverpool ?","it":"Quale attaccante egiziano gioca per il Liverpool?","nl":"Welke Egyptische spits speelt voor Liverpool?","tr":"Liverpool''da oynayan Mısırlı forvet kimdir?","ar":"أي مهاجم مصري يلعب لليفربول؟"}'::jsonb,
  '{"en":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"hr":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"de":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"bs":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"es":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"pt":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"sr":["Мохамед Салах","Махмуд Трезеге","Омар Мармуш","Мостафа Мохамед"],"fr":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"it":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"nl":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"tr":["Mohamed Salah","Mahmoud Trezeguet","Omar Marmoush","Mostafa Mohamed"],"ar":["محمد صلاح","محمود تريزيجيه","عمر مرموش","مصطفى محمد"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0094-4000-8000-000000000094'::uuid,
  'current_football',
  '{"en":"Which club won the 2023-24 Serie A title?","hr":"Koji je klub osvojio Serie A 2023./24.?","de":"Welcher Verein gewann die Serie A 2023/24?","bs":"Koji klub je osvojio Serie A 2023./24.?","es":"¿Qué club ganó la Serie A 2023-24?","pt":"Qual clube venceu a Serie A de 2023-24?","sr":"Који је клуб освојио Серију А 2023/24.?","fr":"Quel club a remporté la Serie A 2023-24 ?","it":"Quale club ha vinto la Serie A 2023-24?","nl":"Welke club won de Serie A 2023-24?","tr":"2023-24 Serie A şampiyonluğunu hangi kulüp kazandı?","ar":"أي نادٍ فاز بالدوري الإيطالي 2023-24؟"}'::jsonb,
  '{"en":["Inter Milan","AC Milan","Juventus","Napoli"],"hr":["Inter Milano","AC Milan","Juventus","Napoli"],"de":["Inter Mailand","AC Mailand","Juventus","Neapel"],"bs":["Inter Milano","AC Milan","Juventus","Napoli"],"es":["Inter de Milán","AC Milan","Juventus","Nápoles"],"pt":["Inter de Milão","AC Milan","Juventus","Napoli"],"sr":["Интер","АЦ Милан","Јувентус","Наполи"],"fr":["Inter Milan","AC Milan","Juventus","Naples"],"it":["Inter","Milan","Juventus","Napoli"],"nl":["Inter Milan","AC Milan","Juventus","Napoli"],"tr":["Inter Milan","AC Milan","Juventus","Napoli"],"ar":["إنتر ميلان","ميلان","يوفنتوس","نابولي"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0095-4000-8000-000000000095'::uuid,
  'current_football',
  '{"en":"Who replaced Jürgen Klopp as Liverpool manager in 2024?","hr":"Tko je zamijenio Jürgena Kloppa kao trener Liverpoola 2024.?","de":"Wer ersetzte Jürgen Klopp 2024 als Liverpool-Trainer?","bs":"Ko je zamijenio Jürgena Kloppa kao trener Liverpoola 2024.?","es":"¿Quién reemplazó a Jürgen Klopp como entrenador del Liverpool en 2024?","pt":"Quem substituiu Jürgen Klopp como treinador do Liverpool em 2024?","sr":"Ко је заменио Јиргена Клопа као тренера Ливерпула 2024.?","fr":"Qui a remplacé Jürgen Klopp comme entraîneur de Liverpool en 2024 ?","it":"Chi ha sostituito Jürgen Klopp come allenatore del Liverpool nel 2024?","nl":"Wie verving Jürgen Klopp in 2024 als Liverpool-trainer?","tr":"2024''te Jürgen Klopp''un yerine Liverpool''un teknik direktörü kim oldu?","ar":"من حل محل يورغن كلوب كمدرب لليفربول عام 2024؟"}'::jsonb,
  '{"en":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"hr":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"de":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"bs":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"es":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"pt":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"sr":["Арне Слот","Ксаби Алонсо","Рубен Аморим","Ензо Мареска"],"fr":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"it":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"nl":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"tr":["Arne Slot","Xabi Alonso","Ruben Amorim","Enzo Maresca"],"ar":["أرني سلوت","تشابي ألونسو","روبن أموريم","إنزو ماريسكا"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0096-4000-8000-000000000096'::uuid,
  'current_football',
  '{"en":"Which young England midfielder starred for Real Madrid after joining in 2023?","hr":"Koji mladi engleski vezni je zabljesnuo u Real Madridu nakon dolaska 2023.?","de":"Welcher junge englische Mittelfeldspieler glänzte bei Real Madrid nach seinem Wechsel 2023?","bs":"Koji mladi engleski vezni je zabljesnuo u Real Madridu nakon dolaska 2023.?","es":"¿Qué joven centrocampista inglés brilló en el Real Madrid tras llegar en 2023?","pt":"Qual jovem meio-campista inglês brilhou no Real Madrid após chegar em 2023?","sr":"Који млади енглески везни је засијао у Реал Мадриду након доласка 2023.?","fr":"Quel jeune milieu de terrain anglais a brillé au Real Madrid après son arrivée en 2023 ?","it":"Quale giovane centrocampista inglese ha brillato al Real Madrid dopo l''arrivo nel 2023?","nl":"Welke jonge Engelse middenvelder schitterde bij Real Madrid na zijn komst in 2023?","tr":"2023''te Real Madrid''e katıldıktan sonra parlayan genç İngiliz orta saha oyuncusu kimdir?","ar":"أي لاعب وسط إنجليزي شاب تألق مع ريال مدريد بعد انضمامه عام 2023؟"}'::jsonb,
  '{"en":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"hr":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"de":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"bs":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"es":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"pt":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"sr":["Џуд Белингем","Фил Фоден","Деклан Рајс","Мејсон Маунт"],"fr":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"it":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"nl":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"tr":["Jude Bellingham","Phil Foden","Declan Rice","Mason Mount"],"ar":["جود بيلينغهام","فيل فودن","ديكلان رايس","ماسون ماونت"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0097-4000-8000-000000000097'::uuid,
  'current_football',
  '{"en":"Which nation hosted the 2024 Copa América?","hr":"Koja je nacija bila domaćin Copa Américe 2024.?","de":"Welche Nation war Gastgeber der Copa América 2024?","bs":"Koja nacija je bila domaćin Copa Américe 2024.?","es":"¿Qué nación fue sede de la Copa América 2024?","pt":"Qual nação sediou a Copa América de 2024?","sr":"Која је нација била домаћин Копа Америке 2024.?","fr":"Quelle nation a accueilli la Copa América 2024 ?","it":"Quale nazione ha ospitato la Copa América 2024?","nl":"Welk land organiseerde de Copa América 2024?","tr":"2024 Copa América''ya hangi ülke ev sahipliği yaptı?","ar":"أي دولة استضافت كوبا أمريكا 2024؟"}'::jsonb,
  '{"en":["United States","Brazil","Argentina","Mexico"],"hr":["Sjedinjene Američke Države","Brazil","Argentina","Meksiko"],"de":["Vereinigte Staaten","Brasilien","Argentinien","Mexiko"],"bs":["Sjedinjene Američke Države","Brazil","Argentina","Meksiko"],"es":["Estados Unidos","Brasil","Argentina","México"],"pt":["Estados Unidos","Brasil","Argentina","México"],"sr":["Сједињене Америчке Државе","Бразил","Аргентина","Мексико"],"fr":["États-Unis","Brésil","Argentine","Mexique"],"it":["Stati Uniti","Brasile","Argentina","Messico"],"nl":["Verenigde Staten","Brazilië","Argentinië","Mexico"],"tr":["Amerika Birleşik Devletleri","Brezilya","Arjantin","Meksika"],"ar":["الولايات المتحدة","البرازيل","الأرجنتين","المكسيك"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0098-4000-8000-000000000098'::uuid,
  'current_football',
  '{"en":"Which club won the 2024 Copa América?","hr":"Koji je klub/reprezentacija osvojila Copa Américu 2024.?","de":"Welche Nation gewann die Copa América 2024?","bs":"Koja reprezentacija je osvojila Copa Américu 2024.?","es":"¿Qué selección ganó la Copa América 2024?","pt":"Qual seleção venceu a Copa América de 2024?","sr":"Која је репрезентација освојила Копа Америку 2024.?","fr":"Quelle sélection a remporté la Copa América 2024 ?","it":"Quale nazionale ha vinto la Copa América 2024?","nl":"Welk land won de Copa América 2024?","tr":"2024 Copa América''yı hangi ülke kazandı?","ar":"أي منتخب فاز بكوبا أمريكا 2024؟"}'::jsonb,
  '{"en":["Argentina","Brazil","Colombia","Uruguay"],"hr":["Argentina","Brazil","Kolumbija","Urugvaj"],"de":["Argentinien","Brasilien","Kolumbien","Uruguay"],"bs":["Argentina","Brazil","Kolumbija","Urugvaj"],"es":["Argentina","Brasil","Colombia","Uruguay"],"pt":["Argentina","Brasil","Colômbia","Uruguai"],"sr":["Аргентина","Бразил","Колумбија","Уругвај"],"fr":["Argentine","Brésil","Colombie","Uruguay"],"it":["Argentina","Brasile","Colombia","Uruguay"],"nl":["Argentinië","Brazilië","Colombia","Uruguay"],"tr":["Arjantin","Brezilya","Kolombiya","Uruguay"],"ar":["الأرجنتين","البرازيل","كولومبيا","الأوروغواي"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0099-4000-8000-000000000099'::uuid,
  'current_football',
  '{"en":"Which Saudi Pro League club signed Cristiano Ronaldo in 2023?","hr":"Koji klub saudijske lige potpisao je Cristiana Ronalda 2023.?","de":"Welcher Verein der Saudi Pro League verpflichtete Cristiano Ronaldo 2023?","bs":"Koji klub saudijske lige je potpisao Cristiana Ronalda 2023.?","es":"¿Qué club de la liga saudí fichó a Cristiano Ronaldo en 2023?","pt":"Qual clube da liga saudita contratou Cristiano Ronaldo em 2023?","sr":"Који клуб саудијске лиге је потписао Кристијана Роналда 2023.?","fr":"Quel club de la Saudi Pro League a signé Cristiano Ronaldo en 2023 ?","it":"Quale club della Saudi Pro League ha ingaggiato Cristiano Ronaldo nel 2023?","nl":"Welke club uit de Saudi Pro League tekende Cristiano Ronaldo in 2023?","tr":"2023''te Cristiano Ronaldo''yu hangi Suudi Arabistan kulübü transfer etti?","ar":"أي نادٍ في الدوري السعودي ضم كريستيانو رونالدو عام 2023؟"}'::jsonb,
  '{"en":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"hr":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"de":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"bs":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"es":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"pt":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"sr":["Ал Наср","Ал Хилал","Ал Итихад","Ал Ахли"],"fr":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"it":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"nl":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"tr":["Al Nassr","Al Hilal","Al Ittihad","Al Ahli"],"ar":["النصر","الهلال","الاتحاد","الأهلي"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;

insert into public.quiz_questions (id, category, question_text, options, correct_option_index)
values (
  'aaaaaaaa-0100-4000-8000-000000000100'::uuid,
  'current_football',
  '{"en":"Which club won the 2023-24 Turkish Süper Lig title?","hr":"Koji je klub osvojio tursku Süper ligu 2023./24.?","de":"Welcher Verein gewann die türkische Süper Lig 2023/24?","bs":"Koji klub je osvojio tursku Süper ligu 2023./24.?","es":"¿Qué club ganó la Süper Lig turca 2023-24?","pt":"Qual clube venceu a Süper Lig turca de 2023-24?","sr":"Који је клуб освојио турску Супер лигу 2023/24.?","fr":"Quel club a remporté la Süper Lig turque 2023-24 ?","it":"Quale club ha vinto la Süper Lig turca 2023-24?","nl":"Welke club won de Turkse Süper Lig 2023-24?","tr":"2023-24 Türkiye Süper Lig şampiyonluğunu hangi kulüp kazandı?","ar":"أي نادٍ فاز بالدوري التركي 2023-24؟"}'::jsonb,
  '{"en":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"hr":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"de":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"bs":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"es":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"pt":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"sr":["Галатасарај","Фенербахче","Бешикташ","Трабзонспор"],"fr":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"it":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"nl":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"tr":["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor"],"ar":["غلطة سراي","فنربخشة","بشيكتاش","طرابزون سبور"]}'::jsonb,
  0
)
on conflict (id) do update set
  category = excluded.category,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_option_index = excluded.correct_option_index;
