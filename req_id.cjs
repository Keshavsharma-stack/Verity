const fs = require('fs');

function addReqId(path) {
    let content = fs.readFileSync(path, 'utf8');

    // Make sure we have crypto
    if (!content.includes("import { randomUUID } from 'crypto';")) {
        content = "import { randomUUID } from 'crypto';\n" + content;
    }

    content = content.replace(/export async function ([a-zA-Z]+)\(req: any, res: any\) \{/g, "export async function $1(req: any, res: any) {\n  const reqId = randomUUID();\n  console.log(`[$1] Started reqId=${reqId}`);");
    
    // Add reqId to catches
    content = content.replace(/console\.error\('Document processing error:', error\);/g, "console.error(`[handleProcessExtraction] Error reqId=${reqId}:`, error);");
    content = content.replace(/\} catch \(err: any\) \{/g, "} catch (err: any) {\n    console.error(`Error reqId=${reqId}:`, err);");

    fs.writeFileSync(path, content);
    console.log("Added reqId to " + path);
}

addReqId('src/server/extractionLogic.ts');
addReqId('src/server/reminderLogic.ts');
