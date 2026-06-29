const conflicts = []; //array to hold all the conflicts

function addConflict(conflict) {
  const existingConflict = conflicts.find(
    (c) => c.function === conflict.function && c.status === "pending",
  );

  if (existingConflict) {
    existingConflict.aiSuggestion = conflict.aiSuggestion;
    existingConflict.timestamp = conflict.timestamp;

    return existingConflict;
  }

  conflicts.push(conflict);
  console.log("📦 Queue Size:", conflicts.length);
  return conflict;
}

function getConflicts() {
  const allConflicts = [...conflicts]; //this creates a copy of the conflcits array, so that the original array is not modified when we return it
  return allConflicts;
}

function updateConflictStatus(id, status) {
  const changeconflict = conflicts.find((conflict) => conflict.id === id);
  if (changeconflict) {
    changeconflict.status = status;
  }
  return changeconflict;
}
module.exports = {
  addConflict,
  getConflicts,
  updateConflictStatus,
};
