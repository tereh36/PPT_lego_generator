#!/usr/bin/env node
/**
 * run.js — единая точка входа для всего пайплайна. Логика двух режимов:
 *
 *  - Если в .env задан настоящий OPENAI_API_KEY:
 *      генерирует картинки -> собирает презентацию -> QA -> полный печатный PDF
 *  - Если ключа нет (или не заполнен):
 *      собирает презентацию (текст промптов вместо картинок, можно скопировать
 *      и сгенерировать самому) -> QA -> печатный PDF в укороченном виде
 *      (только страница с полной историей - остальные страницы без картинок бесполезны)
 *
 * Использование:
 *   node scripts/run.js umbrella
 * или без аргумента - спросит и покажет список доступных тем:
 *   node scripts/run.js
 *
 * Через .bat/.sh-обёртку это же самое запускается двойным кликом.
 */
require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = path.resolve(__dirname, "..");

function hasApiKey() {
  const key = process.env.OPENAI_API_KEY;
  return !!key && key.trim() !== "" && !key.includes("sk-...") && key.trim() !== "sk-";
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

function run(cmd, label) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: ROOT });
    return true;
  } catch (e) {
    console.log(`\n⚠ Шаг "${label}" завершился с ошибкой (см. вывод выше). Продолжаю дальше.`);
    return false;
  }
}

async function main() {
  let topic = process.argv[2];

  if (!topic) {
    const contentDir = path.join(ROOT, "content");
    const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
    console.log("Доступные темы (файлы в папке content/):");
    files.forEach((f) => console.log("  -", f.replace(".json", "")));
    topic = await ask("\nВведите название темы (например umbrella) и нажмите Enter: ");
  }

  const contentPath = path.join(ROOT, "content", `${topic}.json`);
  if (!fs.existsSync(contentPath)) {
    console.error(`\nФайл content/${topic}.json не найден. Проверьте название темы.`);
    process.exit(1);
  }

  const withImages = hasApiKey();
  console.log(
    withImages
      ? "\n=========== РЕЖИМ: с картинками (найден API-ключ в .env) ===========\n"
      : "\n=========== РЕЖИМ: без картинок (API-ключ не задан в .env) ===========\n" +
        "Соберётся презентация с полным текстом истории/игр/challenge, но с\n" +
        "текстом промптов вместо картинок (можно скопировать промпт прямо со\n" +
        "слайда, сгенерировать картинку самому и вставить на её место). Печатный\n" +
        "PDF в этом режиме соберётся в укороченном виде - только страница с\n" +
        "полной историей. Впишите ключ в .env через 'notepad .env', если хотите\n" +
        "картинки и полный печатный PDF.\n"
  );

  if (withImages) {
    run(`node scripts/generate-images.js "content/${topic}.json"`, "генерация картинок");
  }

  const built = run(`node scripts/build-pptx.js "content/${topic}.json"`, "сборка презентации");
  if (!built) {
    console.log("\nСборка презентации не удалась - дальше идти нет смысла. Проверьте ошибку выше.");
    process.exit(1);
  }

  run(`node scripts/qa-validate.js "output/${topic}.pptx" "content/${topic}.json"`, "QA-проверка");

  run(`node scripts/build-print-pdf.js "content/${topic}.json"`, "печатный PDF");

  console.log("\n=========== ГОТОВО ===========");
  console.log(`Презентация: output/${topic}.pptx`);
  console.log(`Печатный PDF: output/${topic}_printables.pdf` + (withImages ? "" : " (только страница с историей - нет картинок)"));
}

main();
