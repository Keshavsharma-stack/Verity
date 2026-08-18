const fs = require('fs');

function sanitizeFile(path) {
    let content = fs.readFileSync(path, 'utf8');

    // Remove direct error message exposure in 500 responses
    content = content.replace(/res\.status\(500\)\.json\(\{\s*error:\s*err\?\.message\s*\|\|\s*'([^']+)'\s*\}\)/g, "res.status(500).json({ error: '$1' })");
    content = content.replace(/res\.status\(500\)\.json\(\{\s*error:\s*error\?\.message\s*\|\|\s*'([^']+)',/g, "res.status(500).json({\n      error: '$1',");

    fs.writeFileSync(path, content);
    console.log("Sanitized 500 errors in " + path);
}

sanitizeFile('src/server/extractionLogic.ts');
sanitizeFile('src/server/reminderLogic.ts');
