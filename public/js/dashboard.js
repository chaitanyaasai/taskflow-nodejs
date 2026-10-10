const token = localStorage.getItem("taskflow_token");

const taskList = document.getElementById("taskList");
const taskForm = document.getElementById("taskForm");
const messageBox = document.getElementById("message");

const addTaskButton = document.getElementById("addTaskButton");
const cancelTaskButton = document.getElementById("cancelTaskButton");
const saveTaskButton = document.getElementById("saveTaskButton");
const logoutButton = document.getElementById("logoutButton");

let tasks = [];

// Redirect users who are not logged in
if (!token) {
  window.location.href = "/login.html";
}

// Show messages
function showMessage(message, type = "success") {
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "message";
}

// API helper: automatically attaches JWT
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  //   if (response.status === 401 || response.status === 403) {
  //     localStorage.removeItem("taskflow_token");
  //     window.location.href = "/login.html";
  //     throw new Error("Your session has expired. Please log in again.");
  //   }

  if (response.status === 401 || response.status === 403) {
    console.error("Authentication failed:", data);
    throw new Error(
      data.message || "Authentication failed. Please check the token.",
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

// Load tasks from backend
async function loadTasks() {
  try {
    const data = await apiRequest("/api/tasks");

    // Supports either a direct array or { tasks: [...] }
    tasks = Array.isArray(data) ? data : data.tasks || data.data || [];

    renderTasks();
  } catch (error) {
    taskList.innerHTML = "";
    showMessage(error.message, "error");
  }
}

// Update dashboard counters
function updateStats() {
  const completed = tasks.filter((task) => task.status === "completed").length;

  document.getElementById("totalTasks").textContent = tasks.length;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("pendingTasks").textContent =
    tasks.length - completed;
}

// Render task list safely
function renderTasks() {
  updateStats();

  taskList.innerHTML = "";

  if (tasks.length === 0) {
    taskList.innerHTML = `
            <div class="empty">
                No tasks yet. Click "Add Task" to create your first task.
            </div>
        `;
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = "task-item";

    const info = document.createElement("div");
    info.className = "task-info";

    const title = document.createElement("h3");
    title.textContent = task.title || "Untitled task";

    const description = document.createElement("p");
    description.textContent = task.description || "No description";

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const status = document.createElement("span");
    const isCompleted = task.status === "completed";

    status.className = `status ${
      isCompleted ? "status-completed" : "status-pending"
    }`;

    status.textContent = isCompleted ? "Completed" : "Pending";

    meta.appendChild(status);

    info.append(title, description, meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.className = "edit-btn";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editTask(task));

    const statusButton = document.createElement("button");
    statusButton.className = "complete-btn";
    statusButton.textContent = isCompleted ? "Reopen" : "Complete";
    statusButton.addEventListener("click", () => toggleTaskStatus(task));

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    actions.append(editButton, statusButton, deleteButton);
    item.append(info, actions);
    taskList.appendChild(item);
  });
}

// Open form for a new task
addTaskButton.addEventListener("click", () => {
  resetForm();
  taskForm.classList.add("active");
  document.getElementById("taskTitle").focus();
});

// Close form
cancelTaskButton.addEventListener("click", resetForm);

function resetForm() {
  taskForm.reset();
  document.getElementById("taskId").value = "";
  saveTaskButton.textContent = "Save Task";
  taskForm.classList.remove("active");
}

// Edit existing task
function editTask(task) {
  document.getElementById("taskId").value = task.id;
  document.getElementById("taskTitle").value = task.title || "";
  document.getElementById("taskDescription").value = task.description || "";
  document.getElementById("taskStatus").value = task.status || "pending";

  saveTaskButton.textContent = "Update Task";
  taskForm.classList.add("active");

  taskForm.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

// Create or update task
taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const id = document.getElementById("taskId").value;

  const payload = {
    title: document.getElementById("taskTitle").value.trim(),
    description: document.getElementById("taskDescription").value.trim(),
    status: document.getElementById("taskStatus").value,
  };

  if (!payload.title) {
    showMessage("Please enter a task title.", "error");
    return;
  }

  saveTaskButton.disabled = true;
  saveTaskButton.textContent = id ? "Updating..." : "Saving...";

  try {
    if (id) {
      await apiRequest(`/api/tasks/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      showMessage("Task updated successfully!");
    } else {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      showMessage("Task created successfully!");
    }

    resetForm();
    await loadTasks();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    saveTaskButton.disabled = false;
    saveTaskButton.textContent = "Save Task";
  }
});

// Toggle task status
async function toggleTaskStatus(task) {
  const newStatus = task.status === "completed" ? "pending" : "completed";

  try {
    await apiRequest(`/api/tasks/${encodeURIComponent(task.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        title: task.title,
        description: task.description || "",
        status: newStatus,
      }),
    });

    showMessage("Task status updated!");
    await loadTasks();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

// Delete task
async function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  try {
    await apiRequest(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    showMessage("Task deleted successfully!");
    await loadTasks();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

// Logout
logoutButton.addEventListener("click", async () => {
  try {
    await apiRequest("/api/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    console.error("Logout request failed:", error.message);
  } finally {
    localStorage.removeItem("taskflow_token");
    window.location.href = "/login.html";
  }
});

// AI Task Planner
const aiPlanForm = document.getElementById("aiPlanForm");
const aiGoalInput = document.getElementById("aiGoal");
const generatePlanButton = document.getElementById("generatePlanButton");
const aiMessage = document.getElementById("aiMessage");
const aiPlanResults = document.getElementById("aiPlanResults");

let generatedPlan = [];

aiPlanForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const goal = aiGoalInput.value.trim();

  if (!goal) {
    aiMessage.textContent = "Please enter a goal.";
    aiMessage.className = "message error";
    return;
  }

  generatePlanButton.disabled = true;
  generatePlanButton.textContent = "Generating...";
  aiMessage.textContent = "AI is creating your plan. Please wait...";
  aiMessage.className = "message";
  aiPlanResults.replaceChildren();
  generatedPlan = [];

  try {
    const data = await apiRequest("/api/ai/plan", {
      method: "POST",
      body: JSON.stringify({ goal }),
    });

    generatedPlan = data.plan.tasks;

    aiMessage.textContent = data.plan.title;
    aiMessage.className = "message success";

    generatedPlan.forEach((task, index) => {
      const card = document.createElement("article");
      card.className = "task-item ai-task-card";

      const info = document.createElement("div");
      info.className = "task-info";

      const title = document.createElement("h3");
      title.textContent = task.title;

      const description = document.createElement("p");
      description.textContent = task.description;

      const priority = document.createElement("p");
      priority.className = "ai-priority";
      priority.textContent =
        "Priority: " +
        task.priority.charAt(0).toUpperCase() +
        task.priority.slice(1);

      info.append(title, description, priority);

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "save-btn";
      saveButton.textContent = "Add to My Tasks";

      saveButton.addEventListener("click", async () => {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
          await apiRequest("/api/tasks", {
            method: "POST",
            body: JSON.stringify({
              title: task.title,
              description: task.description,
              status: "pending",
            }),
          });

          card.remove();
          showMessage(`Added "${task.title}" to your tasks.`);
          await loadTasks();
        } catch (error) {
          showMessage(error.message, "error");
          saveButton.disabled = false;
          saveButton.textContent = "Add to My Tasks";
        }
      });

      card.append(info, saveButton);
      aiPlanResults.appendChild(card);
    });
  } catch (error) {
    aiMessage.textContent = error.message || "Unable to generate a plan.";
    aiMessage.className = "message error";
  } finally {
    generatePlanButton.disabled = false;
    generatePlanButton.textContent = "Generate Plan";
  }
});

// Initial load
loadTasks();
