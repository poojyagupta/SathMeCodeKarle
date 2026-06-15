const { parse } = require("@babel/parser");

function extractFunctions(code) {
  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx"],
      errorRecovery: true, // 🔥 FIX 1 (prevents crash)
    });

    const functions = [];

    function traverse(node) {
      if (!node) return;

      if (node.type === "FunctionDeclaration") {
        const functionCode = code.slice(node.start, node.end).trim();

        // 🔥 Ignore incomplete functions
        if (functionCode.endsWith("}") && functionCode.length > 15) {
          functions.push({
            name: node.id?.name || "anonymous",
            body: functionCode,
          });
        }
      }

      // 🔥 ARROW FUNCTIONS
      if (node.type === "VariableDeclaration") {
        node.declarations.forEach((decl) => {
          if (decl.init && decl.init.type === "ArrowFunctionExpression") {
            const functionCode = code.slice(decl.start, decl.end).trim();

            if (functionCode.includes("=>") && functionCode.length > 10) {
              functions.push({
                name: decl.id.name,
                body: functionCode,
              });
            }
          }
        });
      }
      // 🔥 TRAVERSE CHILDREN
      for (const key in node) {
        const child = node[key];

        if (Array.isArray(child)) {
          child.forEach(traverse);
        } else if (typeof child === "object" && child !== null) {
          traverse(child);
        }
      }
    }

    traverse(ast);

    return {
      success: true,
      functions,
    };
  } catch (err) {
    // 🔥 FIX 3 (never crash server)
    return {
      success: false,
      functions: [],
    };
  }
}

module.exports = { extractFunctions };
