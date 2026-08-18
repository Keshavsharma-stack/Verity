const fs = require('fs');

function sanitizeFile(path) {
    let content = fs.readFileSync(path, 'utf8');

    // Remove direct error message exposure in 500 responses
    content = content.replace(/res\.status\(500\)\.json\(\{\s*error:\s*[a-zA-Z0-9_\.\?]+\|\|\s*'([^']+)'/g, "res.status(500).json({ error: '$1'");
    content = content.replace(/res\.status\(500\)\.json\(\{\s*error:\s*[a-zA-Z0-9_\.\?]+\s*\}/g, "res.status(500).json({ error: 'Internal server error' }");
    content = content.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*[a-zA-Z0-9_\.\?]+\|\|\s*'([^']+)'/g, "res.status(500).json({ success: false, error: '$1'");
    content = content.replace(/res\.status\(500\)\.json\(\{\s*success:\s*false,\s*status:\s*'FAILED',\s*error:\s*[^,]+,/g, "res.status(500).json({ success: false, status: 'FAILED', error: 'Internal server error',");

    fs.writeFileSync(path, content);
    console.log("Sanitized 500 errors in " + path);
}

sanitizeFile('src/server/extractionLogic.ts');
sanitizeFile('src/server/reminderLogic.ts');
