function alertDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function classifyTaskAlerts(allTasks, overdueResponse, todayResponse) {
    const today = new Date();
    const todayKey = alertDateKey(today);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const tomorrowKey = alertDateKey(tomorrow);
    const incompleteTasks = allTasks.filter((task) => !task.completed);
    const taskListNames = new Map(allTasks.map((task) =>
        [String(task.taskListId), task.taskListName || "Task list"]));
    const addTaskListName = (task) => ({
        ...task,
        taskListName: taskListNames.get(String(task.taskListId)) || "Task list"
    });

    return {
        overdue: overdueResponse.filter((task) => !task.completed).map(addTaskListName),
        today: todayResponse.filter((task) => !task.completed).map(addTaskListName),
        tomorrow: incompleteTasks.filter((task) => task.dueDate === tomorrowKey),
        upcoming: incompleteTasks.filter((task) => task.dueDate > tomorrowKey)
    };
}

function updateAlertBadges(groups) {
    const count = groups.overdue.length + groups.today.length + groups.tomorrow.length;
    document.querySelectorAll("[data-alert-badge]").forEach((badge) => {
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.hidden = count === 0;
    });
    return count;
}

async function loadAlertGroupsFromApi(allTasksOverride = null) {
    let user = null;
    let allTasks = allTasksOverride;

    const [overdueResponse, todayResponse] = await Promise.all([
        apiRequest("/api/tasks/overdue"),
        apiRequest("/api/tasks/today")
    ]);

    if (allTasks === null) {
        const users = await apiRequest("/api/users");
        user = Array.isArray(users) ? users[0] : null;
        if (!user) {
            throw new Error("Your account could not be loaded. Please log in again.");
        }

        localStorage.setItem("user", JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email
        }));

        const taskLists = await apiRequest(
            `/api/task-lists/user/${encodeURIComponent(user.id)}`);
        const taskGroups = await Promise.all(taskLists.map(async (taskList) => {
            const tasks = await apiRequest(
                `/api/tasks/list/${encodeURIComponent(taskList.id)}`);
            return tasks.map((task) => ({ ...task, taskListName: taskList.name }));
        }));
        const taskListNames = new Map(taskLists.map((taskList) =>
            [String(taskList.id), taskList.name]));
        allTasks = taskGroups.flat().map((task) => ({
            ...task,
            taskListName: task.taskListName
                || taskListNames.get(String(task.taskListId))
                || "Task list"
        }));
    }

    return {
        user,
        groups: classifyTaskAlerts(allTasks, overdueResponse, todayResponse)
    };
}

function renderAlertTask(task, groupName) {
    const card = document.createElement("article");
    card.className = `alert-task-card${groupName === "overdue" ? " alert-task-overdue" : ""}`;

    const detail = document.createElement("div");
    detail.className = "alert-task-detail";
    const title = document.createElement("strong");
    title.className = "alert-task-title";
    title.textContent = task.title;
    const meta = document.createElement("div");
    meta.className = "alert-task-meta";
    const due = document.createElement("span");
    due.textContent = `Due ${task.dueDate}`;
    const list = document.createElement("span");
    list.textContent = task.taskListName || "Task list";
    meta.append(due, list);
    detail.append(title, meta);

    const priority = document.createElement("span");
    priority.className = `priority-label priority-${String(task.priority || "LOW").toLowerCase()}`;
    priority.textContent = task.priority || "LOW";

    const complete = document.createElement("button");
    complete.type = "button";
    complete.className = "button button-dark alert-complete-button";
    complete.dataset.taskId = task.id;
    complete.textContent = "Complete";

    card.append(detail, priority, complete);
    return card;
}

function renderAlertGroup(name, tasks) {
    const list = document.getElementById(`${name}-alert-list`);
    const empty = document.getElementById(`${name}-empty`);
    const count = document.getElementById(`${name}-group-count`);
    list.replaceChildren();
    count.textContent = String(tasks.length);
    empty.hidden = tasks.length > 0;
    tasks.forEach((task) => list.append(renderAlertTask(task, name)));
}

function renderAlertGroups(groups) {
    const sections = [
        ["overdue", "alert-count-overdue"],
        ["today", "alert-count-today"],
        ["tomorrow", "alert-count-tomorrow"],
        ["upcoming", "alert-count-upcoming"]
    ];
    for (const [name, countId] of sections) {
        renderAlertGroup(name, groups[name]);
        const summary = document.getElementById(countId);
        if (summary) {
            summary.textContent = String(groups[name].length);
        }
    }
    updateAlertBadges(groups);
}

function renderDashboardAlertSummary(groups) {
    document.getElementById("dashboard-overdue-count").textContent =
        String(groups.overdue.length);
    document.getElementById("dashboard-today-count").textContent =
        String(groups.today.length);
    document.getElementById("dashboard-tomorrow-count").textContent =
        String(groups.tomorrow.length);
    updateAlertBadges(groups);
}

function removeTaskFromAlertGroups(taskId) {
    for (const group of Object.values(alertGroups)) {
        const index = group.findIndex((task) => String(task.id) === String(taskId));
        if (index !== -1) {
            group.splice(index, 1);
        }
    }
}

let alertGroups = { overdue: [], today: [], tomorrow: [], upcoming: [] };

async function initializeAlertsPage() {
    if (!getToken()) {
        window.location.replace("login.html");
        return;
    }

    document.getElementById("logout-button").addEventListener("click", logoutFromAlerts);
    document.getElementById("mobile-logout-button").addEventListener("click", logoutFromAlerts);
    document.getElementById("mobile-nav-toggle").addEventListener("click", (event) => {
        const sidebar = document.querySelector(".sidebar");
        const expanded = sidebar.classList.toggle("nav-expanded");
        event.currentTarget.setAttribute("aria-expanded", String(expanded));
        event.currentTarget.setAttribute("aria-label", expanded ? "Close navigation" : "Open navigation");
    });

    document.querySelector(".alerts-page").addEventListener("click", async (event) => {
        const button = event.target.closest(".alert-complete-button");
        if (!button) {
            return;
        }
        button.disabled = true;
        try {
            await apiRequest(`/api/tasks/${encodeURIComponent(button.dataset.taskId)}/complete`, {
                method: "PUT"
            });
            removeTaskFromAlertGroups(button.dataset.taskId);
            renderAlertGroups(alertGroups);
            const message = document.getElementById("alert-action-message");
            message.textContent = "Task marked complete.";
            message.className = "alert-action-message message-success";
            window.setTimeout(() => {
                message.textContent = "";
                message.className = "alert-action-message";
            }, 2500);
        } catch (error) {
            button.disabled = false;
            const message = document.getElementById("alert-action-message");
            message.textContent = error.message;
            message.className = "alert-action-message message-error";
        }
    });

    try {
        const loaded = await loadAlertGroupsFromApi();
        alertGroups = loaded.groups;
        document.getElementById("alerts-welcome").textContent = `${loaded.user.name}’s alerts`;
        document.getElementById("alerts-date-label").textContent =
            new Intl.DateTimeFormat(undefined, {
                weekday: "long", month: "long", day: "numeric"
            }).format(new Date()).toUpperCase();
        document.getElementById("alert-summary-date").textContent = "Current tasks";
        renderAlertGroups(alertGroups);
        const message = document.getElementById("alerts-message");
        message.textContent = "";
        message.className = "inline-message";
    } catch (error) {
        const message = document.getElementById("alerts-message");
        message.textContent = error.message;
        message.className = "inline-message message-error";
    }
}

function logoutFromAlerts() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

if (document.body.classList.contains("alerts-page")) {
    initializeAlertsPage();
}
