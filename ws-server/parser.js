function extractFunctions(code) {
  const regex = /function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;

  const functions = [];
  let match;

  while ((match = regex.exec(code)) !== null) {
    functions.push({
      name: match[1],
      body: match[2].trim(),
    });
  }

  return functions;
}

module.exports = { extractFunctions };
