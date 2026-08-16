const express = require("express");
const pool = require("../db/pool");

const router = express.Router();
const MAX_ANSWERS = 8;

router.post("/", async (req, res) => {
  const { poll_id, user_id, answers } = req.body;

  if (!poll_id || !user_id || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "poll_id, user_id, and a non-empty answers array are required" });
  }

  const uniqueAnswers = [...new Set(answers)];

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

    const hasInvalidAnswer = uniqueAnswers.some((a) => !validAnswers.includes(a));
    if (hasInvalidAnswer) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "answers contains an option that is not valid for this poll" });
    }

    const existing = await client.query(
      "SELECT 1 FROM poll_answers WHERE poll_id = $1 AND user_id = $2 LIMIT 1",
      [poll_id, user_id]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "You have already answered this poll" });
    }

    const insertedRows = [];
    for (const answer of uniqueAnswers) {
      const result = await client.query(
        "INSERT INTO poll_answers (poll_id, user_id, answer) VALUES ($1, $2, $3) RETURNING *",
        [poll_id, user_id, answer]
      );
      insertedRows.push(result.rows[0]);
    }

    await client.query("COMMIT");
    res.status(201).json({ pollAnswers: insertedRows });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
