"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
(function loadEnv() {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (!fs.existsSync(envPath))
            return;
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const rawLine of content.split('\n')) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#'))
                continue;
            const eq = line.indexOf('=');
            if (eq === -1)
                continue;
            const key = line.slice(0, eq).trim();
            let value = line.slice(eq + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            if (process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    }
    catch {
    }
})();
//# sourceMappingURL=load-env.js.map