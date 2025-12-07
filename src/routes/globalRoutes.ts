import { Router } from "express";
import { checkAuth } from "../middleware/checkAuth";

const router = Router();

router.post("/activity", checkAuth, (req, res) => {
  res.json({ ok: true });
});

export default router;
