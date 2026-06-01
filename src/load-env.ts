import * as fs from 'fs';
import * as path from 'path';

// Минимальный загрузчик .env без внешних зависимостей.
// Подхватывает переменные из .env в process.env, если они ещё не заданы окружением.
// Импортируется ПЕРВЫМ в main.ts, чтобы секреты были доступны до инициализации модулей.
(function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, 'utf-8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const eq = line.indexOf('=');
      if (eq === -1) continue;

      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // В проде переменные могут приходить напрямую из окружения — тихо игнорируем.
  }
})();
