# content.json — формат данных для одного урока

Это единственный файл, который меняется от темы к теме. Всё остальное (стили,
координаты, шаблонные слайды, буквы, free play, алфавит-слайд) сборщик берёт сам.
Claude заполняет этот JSON целиком по одному слову-теме, следуя
Preschool_Rulebook.md, DESIGN_SYSTEM.md и CONTENT_GENERATION_GUIDE.md.

## КРИТИЧНО (правила, нарушенные в первой версии — больше не повторять)
1. **Обложка (слайд 1) — БЕЗ фото.** Только название темы на цветном фоне
   с декором STYLE_A. Никаких `cover_model_note` полей — их больше нет в схеме.
2. **История ведёт к постройке модели ТЕМЫ, а не производного объекта.**
   Если тема "Fish" — история должна вести к постройке рыбки, а не домика/аквариума
   для рыбки. Производный объект (аквариум, домик, гнездо) — это материал для
   `challenge`, а не для основной модели.
3. **Каждый ребёнок строит СВОЮ модель с нуля.** История не должна вести к
   "починке"/"достройке" модели персонажа — только к тому, что каждый ребёнок
   строит свой собственный полный экземпляр.
4. **Presentation — минимум 4 вопроса**, не 3.
5. **Игры (game1/game2/game3) используют единый формат `script`** — массив реплик,
   а не сплошной текст. Прямая речь выделяется ТОЛЬКО цветом (синий для детей,
   красный для учителя), БЕЗ bold/underline.
6. **Story Props — максимум 3-4**, только напрямую связанные с темой.
7. **Game 3 — две явные команды медленно/быстро с понятной причиной**, не просто "беги к X".
8. **Challenge — ротировать архетип**, не повторять "домик/гнездо" каждый раз
   (см. CONTENT_GENERATION_GUIDE.md, раздел "Архетипы Challenge").
9. **Youtube id — только через web_search**, никогда по памяти.
10. **Preschool = только простые кубики 2×4/2×2, без движущихся частей.**
    Архетип Challenge "функция/механизм" запрещён для Preschool (это Brickmoto).
11. **Не изобретать лишних персонажей.** Человеческая роль в истории — всегда
    минифигурка учителя, не новый именной персонаж.
12. **Конфликт истории — конкретный, разыгрываемый 2-3 бумажными пропсами**,
    не абстрактный/эмоциональный.
13. **Challenge не может быть "просто побольше"** — нужен измеримый/сравнительный элемент.
14. **Challenge — ВСЕГДА постройка, НИКОГДА физический тест готовой модели**
    (бросок/толчок/гонка запрещены — модели хрупкие). Измерение — только
    на конструкции по мере постройки (кирпичики/высота/ширина/длина).
15. **Фото реального объекта (слайд 6/"What is this?") теперь AI-генерируется**
    через `real_object_image_prompt` — фотореалистичный промпт, не LEGO,
    не присылается пользователем вручную (в отличие от фото шагов сборки и
    Our Goal, которые остаются реальными фото от пользователя).

```jsonc
{
  "topic": "Fish",
  "letter": "F",
  "teacher_name": "[TEACHER NAME]",

  "intro_video_youtube_id": "XXXXXXXXXXX",
  "intro_video_caption": "Swimming Dance Song",

  "alphabet_caption": "",              // необязательно; по умолчанию сборщик сам
                                        // подставит "Point to each letter until
                                        // students guess: F is for Fish!"

  "story": {
    // ВАЖНО: история должна логически вести к постройке МОДЕЛИ ТЕМЫ (рыбки),
    // а не производного объекта (домика/аквариума — это для challenge).
    "short_summary": "2-3 предложения. Должны упоминать слово темы явно.",
    "characters": [
      "[TEACHER NAME] (LEGO minifigure representing the teacher)",
      "Bubbles the Fish (main character)"
    ],
    "key_phrase": "Swim, swim, little fish!",
    "call_and_response_note": "Children repeat the key phrase chorally when Bubbles appears.",
    "full_story_speaker_notes": "Полный текст истории с ремарками, 6+ предложений.",
    "archetype": "hungry_offering", // один из 6: antagonist_steal, hide_and_seek,
                                     // hungry_offering, sad_lonely, pure_joy_surprise,
                                     // gift_with_property (см. "Story format pool" в гайде).
                                     // Движок использует это поле для отслеживания
                                     // разнообразия между уроками (cooldown 3 урока).
    "observation_questions": [
      "What color is the fish?",
      "How many fins does the fish have?"
    ],
    "background_image_prompt": "промпт, ГОРИЗОНТАЛЬНАЯ иллюстрация, без текста"
  },

  "story_props": [
    { "name": "Fish", "image_prompt": "..." },
    { "name": "Bubbles", "image_prompt": "..." }
  ],

  "real_object_image_prompt": "A real photograph of an actual fish, photorealistic, natural lighting, simple clean background, no text",

  "our_goal": {
    "split": true,
    "easy_note": "ЗАМЕНИТЬ: фото простой версии модели рыбки",
    "hard_note": "ЗАМЕНИТЬ: фото сложной версии модели рыбки"
  },

  "step_by_step_placeholder": true,

  "presentation_qa": [
    { "q": "What is your name?", "a": "My name is ___." },
    { "q": "What color is your fish?", "a": "It is blue." },
    { "q": "How many fins does your fish have?", "a": "It has two fins." },
    { "q": "What shape is your fish's tail?", "a": "It is a triangle." }
  ],

  "game1": {
    "title": "Game 1: Swim Away!",
    "structure_tag": "where_do_we_go", // один из: what_do_we_do, where_do_we_go,
                                        // what_now, whats_the_plan, up_or_down,
                                        // cue_word_cross, other. Cooldown 3 урока.
    "script": [
      { "speaker": "children", "text": "Teacher, teacher, where do fish live?" },
      { "speaker": "teacher",  "text": "In the water, swim swim swim!" },
      { "speaker": "action",   "text": "Children wiggle and swim in place." },
      { "speaker": "children", "text": "Teacher, teacher, where do fish live?" },
      { "speaker": "teacher",  "text": "A hungry shark is coming, swim to the reef!" },
      { "speaker": "action",   "text": "Teacher plays the shark and chases children to a marked safe spot." }
    ]
  },

  "game2": {
    "title": "Game 2: Sort the Sea Creatures",
    "type": "sorting", // sensory | search | matching | sorting | compare
                        // (sensory всегда в приоритете при наличии реального объекта,
                        // остальные — мягкий cooldown 2 урока, см. гайд)
    "script": [
      { "speaker": "instruction", "text": "Look at each card together." },
      { "speaker": "instruction", "text": "Sort animals that live in water from animals that live on land." },
      { "speaker": "action", "text": "Children place each card into the matching pile." }
    ],
    "colors": ["RED","BLUE","GREEN","PURPLE","YELLOW","TEAL","ORANGE"],
    "base_prop_image": "prop_fish",
    "shape_reference_prompt": "...",
    "shape_pieces_prompt": "...",
    "printout_prompt": "..."
  },

  "game3": {
    "title": "Game 3: Fish Race",
    "script": [
      { "speaker": "children", "text": "Swim, swim, swim to the reef!" },
      { "speaker": "action", "text": "Children hold their built fish models and swim (walk quickly) to a marked reef area when the music plays." }
    ]
  },

  "challenge": {
    "text": "Build your fish a home! Make an aquarium with the tallest plant you can.",
    "challenge_image_prompt": "..."
  },

  "letter_slide_script_notes": [
    "Show the letter card F", "Say the sound /f/", "Connect to topic: F is for Fish",
    "Children repeat chorally", "Children repeat individually",
    "Hand out pattern worksheet", "Build the letter with bricks"
  ]
}
```

## Что сборщик достаёт сам (не входит в content.json)
- Буква: `assets/letters/{LETTER}_pattern.png` — уже извлечены из PDF.
- Алфавит-слайд (слайд 13): рисуется целиком движком, меняется только `alphabet_caption`.
- Free play картинка: `assets/free_play.png`.
- Alphabet song / Closing видео — константы.
- Letter-specific видео — по букве из `scripts/letter-videos.json`.
- Все цвета/координаты/шрифты — из DESIGN_SYSTEM.md.
