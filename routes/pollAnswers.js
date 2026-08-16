const express = require("express");
const pool = require("../db/pool");

const router = express.Router();
const MAX_ANSWERS = 8;

router.post("/", async (req, res) => {
  const { poll_id, user_id, answer } = req.body;

  if (!poll_id || !user_id || typeof answer !== "string" || answer.trim().length === 0) {
    return res.status(400).json({ error: "poll_id, user_id, and answer are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pollResult = await client.query("SELECT * FROM polls WHERE id = $1 FOR SHARE", [poll_id]);
    const poll = pollResult.rows[0];

    if (!poll) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Poll not found" });
    }

    const validAnswers = Array.from(
      { length: MAX_ANSWERS },
      (_, i) => poll[`answer_${i + 1}`]
    ).filter(Boolean);

    if (!validAnswers.includes(answer)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "answer is not a valid option for this poll" });
    }

    const existing = await client.query(
      "SELECT 1 FROM poll_answers WHERE poll_id = $1 AND user_id = $2 LIMIT 1",
      [poll_id, user_id]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "You have already answered this poll" });
    }

    const result = await client.query(
      "INSERT INTO poll_answers (poll_id, user_id, answer) VALUES ($1, $2, $3) RETURNING *",
      [poll_id, user_id, answer]
    );

    await client.query("COMMIT");
    res.status(201).json({ pollAnswer: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
