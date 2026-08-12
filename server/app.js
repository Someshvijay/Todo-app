import express from 'express';
import cors from 'cors';
import pool from './db/database.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY due_date ASC NULLS LAST, id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.get('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching todo:', err);
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

app.post('/api/todos', async (req, res) => {
  const { title, description, due_date, completed } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, description, due_date, completed) VALUES ($1, $2, $3, $4) RETURNING *',
      [title.trim(), description || null, due_date || null, completed || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating todo:', err);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, due_date, completed } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const current = existing.rows[0];
    const result = await pool.query(
      'UPDATE tasks SET title = $1, description = $2, due_date = $3, completed = $4 WHERE id = $5 RETURNING *',
      [
        title !== undefined ? title : current.title,
        description !== undefined ? description : current.description,
        due_date !== undefined ? due_date : current.due_date,
        completed !== undefined ? completed : current.completed,
        id
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating todo:', err);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting todo:', err);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

export default app;
