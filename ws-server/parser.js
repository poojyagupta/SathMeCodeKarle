function extractFunctions(code) {
  const regex = /function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;

  const functions = [];
  let match;

  while ((match = regex.exec(code)) !== null) {
    const name = match[1];
    const body = match[2].trim();

    // 🔥 STRICT FILTERS

    // must have semicolon (basic completeness)
    if (!body.includes(";")) continue;

    // must NOT be too small (avoid partial typing)
    if (body.length < 10) continue;

    functions.push({ name, body });
  }

  return functions;
}

module.exports = { extractFunctions };
