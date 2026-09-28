let currentUser = null;
let currentView = "dashboard";
let taskLists = [];
let allTasksCache = [];
let taskRefreshVersion = 0;
let editingTaskId = null;
let editingTaskListId = null;
let activeTaskListId = null;
let searchTimer = null;

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function setMessage(id, message, kind = "") {
    const element = document.getElementById(id);
    element.textContent = message;
    element.classList.remove("message-error", "message-success", "message-info");
    if (kind) {
        element.classList.add(`message-${kind}`);
    }
}

function formatToday() {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
    }).format(new Date());
}

function setStats(stats) {
    const fields = [
        ["stat-total", "totalTasks"],
        ["stat-completed", "completedTasks"],
        ["stat-pending", "pendingTasks"],
        ["stat-overdue", "overdueTasks"],
        ["stat-high", "highPriorityTasks"],
        ["stat-medium", "mediumPriorityTasks"],
        ["stat-low", "lowPriorityTasks"]
    ];
    for (const [elementId, field] of fields) {
        setText(elementId, Number(stats[field] ?? 0).toLocaleString());
    }
    setText("stats-updated", "Updated just now");
}

function setActiveView(view) {
    currentView = view;
    document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
        const active = button.dataset.view === view;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
    });

    const titleByView = {
        dashboard: ["YOUR LISTS, ALL HERE", "My tasks"],
        tasks: ["YOUR LISTS, ALL HERE", "My tasks"],
        today: ["A FRESH LOOK AT TODAY", "Today"],
        overdue: ["READY FOR A RESET", "Overdue"]
    };
    const [kicker, heading] = titleByView[view];
    setText("task-kicker", kicker);
    setText("tasks-heading", heading);
    document.getElementById("stats-section").hidden = view !== "dashboard";
    document.getElementById("tasklists-section").hidden =
        view !== "dashboard" && view !== "tasks";
}

function makeTaskListCard(taskList) {
    const card = document.createElement("article");
    card.className = "tasklist-card";

    const marker = document.createElement("span");
    marker.className = "tasklist-marker";
    marker.setAttribute("aria-hidden", "true");

    const name = document.createElement("strong");
    name.className = "tasklist-card-name";
    name.textContent = taskList.name;

    const count = allTasksCache.filter((task) =>
        String(task.taskListId) === String(taskList.id)).length;
    const taskCount = document.createElement("span");
    taskCount.className = "tasklist-card-count";
    taskCount.textContent = `${count} ${count === 1 ? "task" : "tasks"}`;

    const actions = document.createElement("div");
    actions.className = "tasklist-card-actions";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "tasklist-open";
    open.dataset.action = "open-list";
    open.dataset.taskListId = taskList.id;
    open.textContent = "View tasks";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "task-edit";
    edit.dataset.action = "edit-list";
    edit.dataset.taskListId = taskList.id;
    edit.textContent = "Edit";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "task-delete";
    remove.dataset.action = "delete-list";
    remove.dataset.taskListId = taskList.id;
    remove.setAttribute("aria-label", `Delete ${taskList.name} and its tasks`);
    remove.textContent = "Delete";

    actions.append(open, edit, remove);
    card.append(marker, name, taskCount, actions);
    return card;
}

function renderTaskLists() {
    const list = document.getElementById("tasklist-list");
    list.replaceChildren();
    if (!taskLists.length) {
        setMessage("tasklist-message", "No task lists yet. Create one to get started.");
        updateTaskListOptions();
        return;
    }
    setMessage("tasklist-message", `${taskLists.length} ${taskLists.length === 1 ? "list" : "lists"}`);
    taskLists.forEach((taskList) => list.append(makeTaskListCard(taskList)));
    updateTaskListOptions();
}

function updateTaskListOptions(selectedId = "") {
    const select = document.getElementById("task-list-select");
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = taskLists.length ? "Choose a list" : "Create a task list first";
    placeholder.disabled = true;
    placeholder.selected = !selectedId;
    select.append(placeholder);

    taskLists.forEach((taskList) => {
        const option = document.createElement("option");
        option.value = taskList.id;
        option.textContent = taskList.name;
        option.selected = String(taskList.id) === String(selectedId);
        select.append(option);
    });
    select.disabled = taskLists.length === 0;
}

function makeTaskRow(task) {
    const row = document.createElement("article");
    row.className = `task-row${task.completed ? " task-row-complete" : ""}`;

    const detail = document.createElement("div");
    detail.className = "task-row-detail";
    const title = document.createElement("strong");
    title.className = "task-row-title";
    title.textContent = task.title;
    const metadata = document.createElement("div");
    metadata.className = "task-row-metadata";
    const dueDate = document.createElement("span");
    dueDate.className = "task-row-date";
    dueDate.textContent = task.dueDate ? `Due ${task.dueDate}` : "No due date";
    const listName = document.createElement("span");
    listName.className = "task-row-list-name";
    listName.textContent = task.taskListName || "Task list";
    const status = document.createElement("span");
    status.className = `task-status${task.completed ? " status-completed" : " status-pending"}`;
    status.textContent = task.completed ? "Completed" : "Pending";
    metadata.append(dueDate, listName, status);
    if (currentView === "overdue") {
        const overdue = document.createElement("span");
        overdue.className = "task-status status-overdue";
        overdue.textContent = "Overdue";
        metadata.append(overdue);
    }
    detail.append(title, metadata);

    const priority = document.createElement("span");
    const priorityName = String(task.priority || "LOW").toLowerCase();
    priority.className = `priority-label priority-${priorityName}`;
    priority.textContent = task.priority || "LOW";

    const actions = document.createElement("div");
    actions.className = "task-row-actions";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = `task-completion-action${task.completed ? " is-complete" : ""}`;
    toggle.dataset.action = "toggle";
    toggle.dataset.taskId = task.id;
    toggle.dataset.completed = String(task.completed);
    toggle.textContent = task.completed ? "Mark Incomplete" : "Complete";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "task-edit";
    edit.dataset.action = "edit";
    edit.dataset.taskId = task.id;
    edit.textContent = "Edit";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "task-delete";
    remove.dataset.action = "delete";
    remove.dataset.taskId = task.id;
    remove.setAttribute("aria-label", `Delete ${task.title}`);
    remove.textContent = "Delete";
    actions.append(toggle, edit, remove);

    row.append(detail, priority, actions);
    return row;
}

function renderTasks(tasks) {
    const list = document.getElementById("task-list");
    list.replaceChildren();
    if (!tasks.length) {
        const title = document.getElementById("task-search").value.trim();
        const message = title
            ? "No tasks found."
            : currentView === "today"
                ? "No tasks due today."
                : currentView === "overdue"
                    ? "Great! You have no overdue tasks."
                    : allTasksCache.length === 0 && !activeTaskListId
                        ? "No tasks yet. Create your first task."
                        : "No tasks match these filters.";
        setMessage("task-message", message);
        return;
    }
    setMessage("task-message", `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`);
    tasks.forEach((task) => list.append(makeTaskRow(task)));
}

async function loadCurrentUser() {
    const users = await apiRequest("/api/users");
    currentUser = Array.isArray(users) ? users[0] : null;
    if (!currentUser) {
        throw new Error("Your account could not be loaded. Please log in again.");
    }
    localStorage.setItem("user", JSON.stringify({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email
    }));
    setText("welcome-heading", `Welcome back, ${currentUser.name}`);
}

async function loadTaskLists() {
    if (!currentUser) {
        throw new Error("Your account could not be loaded.");
    }
    taskLists = await apiRequest(
        `/api/task-lists/user/${encodeURIComponent(currentUser.id)}`);
    if (!taskLists.some((taskList) =>
        String(taskList.id) === String(activeTaskListId))) {
        activeTaskListId = null;
    }
    renderTaskLists();
}

async function loadAllUserTasks() {
    const taskGroups = await Promise.all(taskLists.map(async (taskList) => {
        const tasks = await apiRequest(
            `/api/tasks/list/${encodeURIComponent(taskList.id)}`);
        return tasks.map((task) => ({ ...task, taskListName: taskList.name }));
    }));
    return taskGroups.flat();
}

async function loadTasks() {
    const requestVersion = ++taskRefreshVersion;
    setMessage("task-message", "Loading your tasks…", "info");
    const title = document.getElementById("task-search").value.trim();
    const priority = document.getElementById("priority-filter").value;

    try {
        let tasks;
        if (title) {
            tasks = await apiRequest(`/api/tasks/search?title=${encodeURIComponent(title)}`);
        } else if (priority) {
            tasks = await apiRequest(`/api/tasks/filter?priority=${encodeURIComponent(priority)}`);
        } else if (currentView === "today") {
            tasks = await apiRequest("/api/tasks/today");
        } else if (currentView === "overdue") {
            tasks = await apiRequest("/api/tasks/overdue");
        } else if (activeTaskListId !== null) {
            tasks = await apiRequest(
                `/api/tasks/list/${encodeURIComponent(activeTaskListId)}`);
        } else {
            tasks = allTasksCache;
        }

        const status = document.getElementById("status-filter").value;
        if (status) {
            const isCompleted = status === "completed";
            tasks = tasks.filter((task) => task.completed === isCompleted);
        }

        if (requestVersion === taskRefreshVersion) {
            const taskListNames = new Map(taskLists.map((taskList) =>
                [String(taskList.id), taskList.name]));
            renderTasks(tasks.map((task) => ({
                ...task,
                taskListName: taskListNames.get(String(task.taskListId)) || "Task list"
            })));
        }
    } catch (error) {
        if (requestVersion === taskRefreshVersion) {
            setMessage("task-message", error.message, "error");
            document.getElementById("task-list").replaceChildren();
        }
    }
}

async function loadDashboardStats() {
    try {
        setStats(await apiRequest("/api/dashboard"));
        setMessage("dashboard-message", "");
    } catch (error) {
        setText("stats-updated", "Stats unavailable");
        setMessage("dashboard-message", error.message, "error");
    }
}

async function loadDashboardAlerts() {
    try {
        const { groups } = await loadAlertGroupsFromApi(allTasksCache);
        renderDashboardAlertSummary(groups);
        setMessage("dashboard-alert-message", "");
    } catch (error) {
        setMessage("dashboard-alert-message", error.message, "error");
    }
}

async function refreshDashboardAndTasks() {
    let taskCacheError = null;
    try {
        allTasksCache = await loadAllUserTasks();
        renderTaskLists();
    } catch (error) {
        taskCacheError = error;
        allTasksCache = [];
        renderTaskLists();
    }
    await Promise.all([loadDashboardStats(), loadTasks(), loadDashboardAlerts()]);
    const usesCachedTasks = !document.getElementById("task-search").value.trim()
        && !document.getElementById("priority-filter").value
        && currentView !== "today"
        && currentView !== "overdue"
        && activeTaskListId === null;
    if (taskCacheError && usesCachedTasks) {
        setMessage("task-message", taskCacheError.message, "error");
        document.getElementById("task-list").replaceChildren();
    }
}

async function refreshTaskListsAndContent() {
    try {
        await loadTaskLists();
        await refreshDashboardAndTasks();
        return true;
    } catch (error) {
        setMessage("tasklist-message", error.message, "error");
        return false;
    }
}

function showTaskDialog(task = null) {
    const dialog = document.getElementById("task-dialog");
    const form = document.getElementById("task-form");
    editingTaskId = task ? task.id : null;
    form.reset();
    updateTaskListOptions(task ? task.taskListId : "");
    setText("task-dialog-heading", task ? "Edit task" : "Add a task");
    setText("save-task-button", task ? "Save changes" : "Add task");
    setMessage("task-form-message", "");

    if (task) {
        document.getElementById("task-title").value = task.title;
        document.getElementById("task-due-date").value = task.dueDate;
        document.getElementById("task-priority").value = task.priority;
    }
    dialog.showModal();
}

function closeTaskDialog() {
    document.getElementById("task-dialog").close();
    document.getElementById("task-form").reset();
    editingTaskId = null;
}

function showTaskListDialog(taskList) {
    editingTaskListId = taskList.id;
    document.getElementById("tasklist-edit-name").value = taskList.name;
    setMessage("tasklist-form-message", "");
    document.getElementById("tasklist-dialog").showModal();
}

function closeTaskListDialog() {
    document.getElementById("tasklist-dialog").close();
    document.getElementById("tasklist-edit-form").reset();
    editingTaskListId = null;
}

async function submitTaskListEdit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || editingTaskListId === null) {
        return;
    }
    const button = document.getElementById("save-tasklist-button");
    button.disabled = true;
    setMessage("tasklist-form-message", "Saving task list…", "info");
    try {
        await apiRequest(`/api/task-lists/${encodeURIComponent(editingTaskListId)}`, {
            method: "PUT",
            body: JSON.stringify({
                name: document.getElementById("tasklist-edit-name").value.trim()
            })
        });
        closeTaskListDialog();
        if (await refreshTaskListsAndContent()) {
            setMessage("tasklist-message", "Task list updated.", "success");
        }
    } catch (error) {
        setMessage("tasklist-form-message", error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function submitTaskForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) {
        return;
    }

    const submitButton = document.getElementById("save-task-button");
    submitButton.disabled = true;
    setMessage("task-form-message", editingTaskId ? "Saving task…" : "Creating task…", "info");
    const request = {
        taskListId: Number(document.getElementById("task-list-select").value),
        title: document.getElementById("task-title").value.trim(),
        dueDate: document.getElementById("task-due-date").value,
        priority: document.getElementById("task-priority").value
    };

    try {
        if (editingTaskId) {
            await apiRequest(`/api/tasks/${encodeURIComponent(editingTaskId)}`, {
                method: "PUT",
                body: JSON.stringify(request)
            });
        } else {
            await apiRequest("/api/tasks", {
                method: "POST",
                body: JSON.stringify(request)
            });
        }
        closeTaskDialog();
        document.getElementById("task-search").value = "";
        document.getElementById("priority-filter").value = "";
        document.getElementById("status-filter").value = "";
        activeTaskListId = null;
        setActiveView("tasks");
        await refreshDashboardAndTasks();
    } catch (error) {
        setMessage("task-form-message", error.message, "error");
    } finally {
        submitButton.disabled = false;
    }
}

async function createTaskList(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) {
        return;
    }
    const button = document.getElementById("create-tasklist-button");
    button.disabled = true;
    setMessage("tasklist-message", "Creating your list…", "info");
    try {
        await apiRequest("/api/task-lists", {
            method: "POST",
            body: JSON.stringify({
                name: document.getElementById("tasklist-name").value.trim()
            })
        });
        form.reset();
        form.hidden = true;
        await refreshTaskListsAndContent();
    } catch (error) {
        setMessage("tasklist-message", error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function handleTaskAction(button) {
    const taskId = button.dataset.taskId;
    const action = button.dataset.action;
    if (action === "delete" && !window.confirm("Delete this task? This cannot be undone.")) {
        return;
    }

    button.disabled = true;
    try {
        if (action === "toggle") {
            const transition = button.dataset.completed === "true" ? "incomplete" : "complete";
            await apiRequest(`/api/tasks/${encodeURIComponent(taskId)}/${transition}`, {
                method: "PUT"
            });
        } else if (action === "delete") {
            await apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, {
                method: "DELETE"
            });
        } else if (action === "edit") {
            const task = allTasksCache.find((item) => String(item.id) === String(taskId));
            if (!task) {
                throw new Error("Requested task was not found.");
            }
            showTaskDialog(task);
            return;
        }
        await refreshDashboardAndTasks();
    } catch (error) {
        setMessage("task-message", error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function handleTaskListAction(button) {
    if (button.dataset.action === "open-list") {
        document.getElementById("task-search").value = "";
        document.getElementById("priority-filter").value = "";
        document.getElementById("status-filter").value = "";
        activeTaskListId = button.dataset.taskListId;
        setActiveView("tasks");
        const taskList = taskLists.find((item) =>
            String(item.id) === String(activeTaskListId));
        if (taskList) {
            setText("tasks-heading", taskList.name);
        }
        await loadTasks();
        return;
    }

    if (button.dataset.action === "edit-list") {
        const taskList = taskLists.find((item) =>
            String(item.id) === String(button.dataset.taskListId));
        if (taskList) {
            showTaskListDialog(taskList);
        }
        return;
    }

    const taskList = taskLists.find((item) =>
        String(item.id) === String(button.dataset.taskListId));
    if (!taskList || !window.confirm(
        "Are you sure you want to delete this task list? Tasks inside it will also be deleted.")) {
        return;
    }

    button.disabled = true;
    setMessage("tasklist-message", "Deleting list and its tasks…", "info");
    try {
        await apiRequest(`/api/task-lists/${encodeURIComponent(taskList.id)}`, {
            method: "DELETE"
        });
        await refreshTaskListsAndContent();
    } catch (error) {
        setMessage("tasklist-message", error.message, "error");
    } finally {
        button.disabled = false;
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

async function initializeDashboard() {
    setText("today-label", formatToday().toUpperCase());
    try {
        await loadCurrentUser();
        await loadTaskLists();
        await refreshDashboardAndTasks();
        if (window.location.hash === "#tasklists-section") {
            setActiveView("tasks");
            document.getElementById("tasklists-section").scrollIntoView();
        }
    } catch (error) {
        setMessage("tasklist-message", error.message, "error");
        setMessage("task-message", error.message, "error");
    }
}

if (!getToken()) {
    window.location.replace("login.html");
} else {
    document.querySelectorAll(".nav-item").forEach((button) => {
        button.addEventListener("click", () => {
            document.getElementById("task-search").value = "";
            document.getElementById("priority-filter").value = "";
            document.getElementById("status-filter").value = "";
            activeTaskListId = null;
            document.querySelector(".sidebar").classList.remove("nav-expanded");
            document.getElementById("mobile-nav-toggle").setAttribute("aria-expanded", "false");
            setActiveView(button.dataset.view);
            loadTasks();
        });
    });

    document.getElementById("task-search-form").addEventListener("submit", (event) => {
        event.preventDefault();
        clearTimeout(searchTimer);
        document.getElementById("priority-filter").value = "";
        activeTaskListId = null;
        loadTasks();
    });
    document.getElementById("task-search").addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            document.getElementById("priority-filter").value = "";
            activeTaskListId = null;
            loadTasks();
        }, 350);
    });
    document.getElementById("priority-filter").addEventListener("change", () => {
        clearTimeout(searchTimer);
        document.getElementById("task-search").value = "";
        activeTaskListId = null;
        loadTasks();
    });
    document.getElementById("status-filter").addEventListener("change", loadTasks);
    document.getElementById("task-form").addEventListener("submit", submitTaskForm);
    document.getElementById("tasklist-form").addEventListener("submit", createTaskList);
    document.getElementById("tasklist-edit-form").addEventListener("submit", submitTaskListEdit);
    document.getElementById("task-list").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (button) {
            handleTaskAction(button);
        }
    });
    document.getElementById("tasklist-list").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (button) {
            handleTaskListAction(button);
        }
    });
    document.getElementById("show-tasklist-form").addEventListener("click", () => {
        const form = document.getElementById("tasklist-form");
        form.hidden = !form.hidden;
        if (!form.hidden) {
            document.getElementById("tasklist-name").focus();
        }
    });
    document.getElementById("mobile-nav-toggle").addEventListener("click", (event) => {
        const sidebar = document.querySelector(".sidebar");
        const expanded = sidebar.classList.toggle("nav-expanded");
        event.currentTarget.setAttribute("aria-expanded", String(expanded));
        event.currentTarget.setAttribute("aria-label", expanded ? "Close navigation" : "Open navigation");
    });
    document.getElementById("cancel-tasklist-form").addEventListener("click", () => {
        document.getElementById("tasklist-form").reset();
        document.getElementById("tasklist-form").hidden = true;
    });
    document.getElementById("show-task-form").addEventListener("click", () => {
        if (!taskLists.length) {
            setMessage("tasklist-message", "Create a task list before adding tasks.", "error");
            document.getElementById("tasklists-section").scrollIntoView({ behavior: "smooth" });
            return;
        }
        showTaskDialog();
    });
    document.getElementById("cancel-task-dialog").addEventListener("click", closeTaskDialog);
    document.getElementById("close-task-dialog").addEventListener("click", closeTaskDialog);
    document.getElementById("task-dialog").addEventListener("click", (event) => {
        if (event.target === event.currentTarget) {
            closeTaskDialog();
        }
    });
    document.getElementById("cancel-tasklist-dialog").addEventListener("click", closeTaskListDialog);
    document.getElementById("close-tasklist-dialog").addEventListener("click", closeTaskListDialog);
    document.getElementById("tasklist-dialog").addEventListener("click", (event) => {
        if (event.target === event.currentTarget) {
            closeTaskListDialog();
        }
    });
    document.getElementById("logout-button").addEventListener("click", logout);
    document.getElementById("mobile-logout-button").addEventListener("click", logout);
    initializeDashboard();
}
