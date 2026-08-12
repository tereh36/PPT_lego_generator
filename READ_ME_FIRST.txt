ВЕРСИЯ 1.6.19 — ЧТО ДЕЛАТЬ
==============================

ШАГ 1 — СКОПИРОВАТЬ ФАЙЛЫ
Распакуй этот архив прямо в E:\Cloude\StarTeam\
(заменить файлы — да)

ШАГ 2 — УДАЛИТЬ СТАРОЕ (ОБЯЗАТЕЛЬНО)
В папке E:\Cloude\StarTeam\ удали:
  - папку node_modules (целиком)
  - файл package-lock.json

ШАГ 3 — ТЕРМИНАЛ: npm install
cd E:\Cloude\StarTeam
npm install
(скачивает новые зависимости, pdf-lib вместо pdfkit)

ШАГ 4 — ТЕРМИНАЛ: npm run build
npm run build
(собирает новый .exe в папку dist\)

ШАГ 5 — ПРОВЕРИТЬ У СЕБЯ
Установи Star Team Setup 1.6.19.exe из dist\
Создай тестовую презентацию, проверь:
  - Story props есть в PDF и слайдах
  - PDF создаётся без ошибок про "cannot find module"
  - Цена загружается (не "Loading price...")
  - Слова учителя в Game 1/3 короткие

ШАГ 6 — GITHUB РЕЛИЗ (только если всё ок)
Тег: v1.6.19
Файлы из dist\: Star-Team-Setup-1.6.19.exe + latest.yml + .blockmap
Все три из ОДНОЙ сборки, залить разом.

ШАГ 7 — ГАЙД (отдельно, не требует пересборки)
Замени engine\CONTENT_GENERATION_GUIDE.md и запусти Push_Update.bat
(работает сразу, без rebuild)

ШАГ 8 — CODE.GS (если ещё не задеплоен)
Открой Google Таблица → Extensions → Apps Script
Вставь новый Code.gs → Deploy → New version
