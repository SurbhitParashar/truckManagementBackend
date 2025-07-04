import express from "express";
import { addTerminal, getTerminals } from "../controllers/terminalController.js";

const router = express.Router();

router.post("/addTerminal", addTerminal);
router.get("/getTerminal", getTerminals);

export default router;
