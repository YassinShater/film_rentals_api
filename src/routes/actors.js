import { Router } from 'express';
import { pool } from '../db/pool.js';
const router = Router();

router.get('/top', async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT a.actor_id, a.first_name, a.last_name, COUNT(r.rental_id) rental_count
     FROM actor a
     JOIN film_actor fa ON fa.actor_id = a.actor_id
     JOIN inventory i ON i.film_id = fa.film_id
     LEFT JOIN rental r ON r.inventory_id = i.inventory_id
     GROUP BY a.actor_id, a.first_name, a.last_name
     ORDER BY rental_count DESC, a.last_name ASC
     LIMIT 5`
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const actorId = req.params.id;
  const [[actor]] = await pool.query(
    `SELECT actor_id, first_name, last_name FROM actor WHERE actor_id = ?`, [actorId]
  );
  if (!actor) return res.status(404).json({ error: 'Actor not found' });

  const [topFilms] = await pool.query(
    `SELECT f.film_id, f.title, COUNT(r.rental_id) rental_count
     FROM film f
     JOIN film_actor fa ON fa.film_id = f.film_id
     JOIN inventory i ON i.film_id = f.film_id
     LEFT JOIN rental r ON r.inventory_id = i.inventory_id
     WHERE fa.actor_id = ?
     GROUP BY f.film_id, f.title
     ORDER BY rental_count DESC, f.title ASC
     LIMIT 5`, [actorId]
  );

  res.json({ actor, topFilms });
});

export default router;
