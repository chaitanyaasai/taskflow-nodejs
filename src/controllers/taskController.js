const pool = require("../config/db");

// Allowed task statuses
const ALLOWED_STATUSES = ["pending", "in_progress", "completed"];

// Validate task ID format (UUID)
const isValidUUID = (id) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return uuidRegex.test(id);
};

// 1. CREATE TASK
const createTask = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      title,
      description = null,
      status = "pending",
      due_date = null,
    } = req.body;

    // Validate title
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // Validate status
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const result = await pool.query(
      `INSERT INTO tasks
       (user_id, title, description, status, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title.trim(), description, status, due_date],
    );

    console.log("Task created:", result.rows[0].id);

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: result.rows[0],
    });
  } catch (error) {
    console.error("Create task error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
    });
  }
};

// 2. GET ALL TASKS
const getTasks = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT *
       FROM tasks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      tasks: result.rows,
    });
  } catch (error) {
    console.error("Get tasks error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve tasks",
    });
  }
};

// 3. GET SINGLE TASK
const getTaskById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      task: result.rows[0],
    });
  } catch (error) {
    console.error("Get task by ID error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve task",
    });
  }
};

// 4. UPDATE TASK
const updateTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const { title, description = null, status, due_date = null } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    // Validate title
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    // Validate status
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           status = $3,
           due_date = $4,
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [title.trim(), description, status, due_date, id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    console.log("Task updated:", id);

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: result.rows[0],
    });
  } catch (error) {
    console.error("Update task error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update task",
    });
  }
};

// 5. DELETE TASK
const deleteTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    console.log("Task deleted:", id);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      task: result.rows[0],
    });
  } catch (error) {
    console.error("Delete task error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
