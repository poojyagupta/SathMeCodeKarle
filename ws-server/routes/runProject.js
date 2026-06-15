const express = require("express");
const router = express.Router();

const { runProject } = require("../services/terminalService");

module.exports = (io) => {
  router.post("/", async (req, res) => {
    await runProject(req.body.files, io);
    res.sendStatus(200);
  });

  return router;
};
