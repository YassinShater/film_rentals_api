import { Router } from 'express';
import { pool } from '../db/pool.js';
import { query, validationResult } from 'express-validator';

const router = Router();

/**
 * GET /api/films/top
 * Top 5 rented films of all time
 */
router.get('/top', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT f.film_id, f.title, COUNT(r.rental_id) AS rental_count
     FROM film f
     JOIN inventory i ON i.film_id = f.film_id
     JOIN rental r ON r.inventory_id = i.inventory_id
     GROUP BY f.film_id, f.title
     ORDER BY rental_count DESC, f.title ASC
     LIMIT 5`
  );
  res.json(rows);
});

/**
 * GET /api/films/search?q=...&page=&limit=
 * Search by film title, actor full name, or category name
 * (Route is intentionally placed BEFORE /:id)
 */
router.get(
  '/search',
  [
    query('q').trim().isLength({ min: 1, max: 100 }).withMessage('q is required (1–100 chars)'),
    query('page').optional().toInt().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().toInt().isInt({ min: 1, max: 100 }).withMessage('limit 1–100'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const q = String(req.query.q);
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT DISTINCT f.film_id, f.title
       FROM film f
       LEFT JOIN film_actor fa ON fa.film_id = f.film_id
       LEFT JOIN actor a ON a.actor_id = fa.actor_id
       LEFT JOIN film_category fc ON fc.film_id = f.film_id
       LEFT JOIN category c ON c.category_id = fc.category_id
       WHERE f.title LIKE CONCAT('%', ?, '%')
          OR CONCAT(a.first_name,' ',a.last_name) LIKE CONCAT('%', ?, '%')
          OR c.name LIKE CONCAT('%', ?, '%')
       ORDER BY f.title
       LIMIT ? OFFSET ?`,
      [q, q, q, limit, offset]
    );

    res.json({ data: rows, page, limit });
  }
);

/**
 * GET /api/films/:id
 * Film details with categories and actors
 * Constrain :id to digits so /search won't match this
 */
router.get('/:id(\\d+)', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT f.*,
            GROUP_CONCAT(DISTINCT c.name ORDER BY c.name)        AS categories,
            GROUP_CONCAT(DISTINCT CONCAT(a.first_name,' ',a.last_name)
                         ORDER BY a.last_name)                    AS actors
     FROM film f
     LEFT JOIN film_category fc ON fc.film_id = f.film_id
     LEFT JOIN category c       ON c.category_id = fc.category_id
     LEFT JOIN film_actor fa    ON fa.film_id = f.film_id
     LEFT JOIN actor a          ON a.actor_id = fa.actor_id
     WHERE f.film_id = ?
     GROUP BY f.film_id`,
    [req.params.id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Film not found' });
  res.json(rows[0]);
});

export default router;

