function detectConflicts(userFunctionsMap) {
  const functionMap = {};

  for (const userId in userFunctionsMap) {
    const files = userFunctionsMap[userId];

    for (const fileName in files) {
      const functions = files[fileName];

      functions.forEach((fn) => {
        if (!functionMap[fn.name]) {
          functionMap[fn.name] = [];
        }

        functionMap[fn.name].push({
          user: userId,
          body: fn.body,
          file: fileName,
        });
      });
    }
  }

  const conflicts = [];

  for (const fnName in functionMap) {
    const versions = functionMap[fnName];

    const uniqueUsers = [...new Set(versions.map((v) => v.user))];
    const uniqueBodies = [...new Set(versions.map((v) => v.body))];

    if (uniqueUsers.length > 1 && uniqueBodies.length > 1) {
      conflicts.push({
        type: "function_conflict",
        function: fnName,
        users: uniqueUsers,
        changes: versions,
      });
    }
  }

  return conflicts;
}

module.exports = {
  detectConflicts,
};
