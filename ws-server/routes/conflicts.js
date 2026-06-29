const express = require("express");
const router = express.Router();

const { getConflicts } = require("../services/conflictQueue");

router.get("/", (req, res) => {
  const conflicts = getConflicts();

  res.json(conflicts);
});

module.exports = router;
