import { Router } from 'express';
import { pool } from '../db/pool.js';
import { query, validationResult } from 'express-validator';

const router = Router();

router.get('/',
  [
    query('page').optional().toInt().isInt({ min: 1 }),
    query('limit').optional().toInt().isInt({ min: 1, max: 100 }),
    query('customer_id').optional().toInt().isInt({ min: 1 }),
    query('first_name').optional().trim().isLength({ min: 1, max: 45 }),
    query('last_name').optional().trim().isLength({ min: 1, max: 45 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;

    const cid = req.query.customer_id ?? null;
    const fn = req.query.first_name ?? null;
    const ln = req.query.last_name ?? null;

    const [rows] = await pool.query(
      `SELECT customer_id, first_name, last_name, email, active
       FROM customer
       WHERE (? IS NULL OR customer_id = ?)
         AND (? IS NULL OR first_name LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR last_name  LIKE CONCAT('%', ?, '%'))
       ORDER BY last_name, first_name
       LIMIT ? OFFSET ?`,
       [cid, cid, fn, fn, ln, ln, limit, offset]
    );

    res.json({ data: rows, page, limit });
});

export default router;
