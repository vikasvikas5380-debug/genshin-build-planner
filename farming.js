(() => {
    "use strict";

    const API_URL = "http://localhost:3000/api/farming-schedule";
    const STORAGE_KEY = "genshinFarmingSchedule";

    const DAYS = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
    ];

    const CATEGORIES = {
        talent: {
            label: "Talent Books",
            icon: "📚",
            days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            recommendation:
                "Talent-book domains rotate in three groups. Monday/Thursday, Tuesday/Friday, and Wednesday/Saturday share their respective rotations. All three groups are available on Sunday."
        },

        weapon: {
            label: "Weapon Ascension Materials",
            icon: "⚔️",
            days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            recommendation:
                "Weapon ascension material domains use three rotating groups: Monday/Thursday, Tuesday/Friday, and Wednesday/Saturday. All groups are available on Sunday."
        },

        boss: {
            label: "Boss Materials",
            icon: "👹",
            days: DAYS,
            recommendation:
                "Plan your world-boss runs around the character materials you need. Check the boss's availability and your remaining material requirements."
        },

        weekly: {
            label: "Weekly Boss Materials",
            icon: "🐉",
            days: DAYS,
            recommendation:
                "Plan your weekly boss claims and check which boss drops the material you need. Weekly boss rewards have their own claim limits."
        },

        mora: {
            label: "Mora",
            icon: "💰",
            days: DAYS,
            recommendation:
                "Farm Blossom of Wealth Ley Lines when you need more Mora. Check the Resin Calculator to estimate your Resin requirements."
        },

        exp: {
            label: "Character EXP",
            icon: "✨",
            days: DAYS,
            recommendation:
                "Farm Blossom of Revelation Ley Lines for character EXP materials when you need to level characters."
        },

        local: {
            label: "Local Specialties",
            icon: "🌿",
            days: DAYS,
            recommendation:
                "Plan a collection route for the local specialty required by your character. Check the material's region and respawn timing."
        },

        other: {
            label: "Other Materials",
            icon: "📦",
            days: DAYS,
            recommendation:
                "Choose a day that fits your farming plan and add notes about the material or location."
        }
    };

    let tasks = [];
    let selectedDay = getTodayName();
    let editingTaskId = null;
    let isSaving = false;
    let saveTimer = null;
    let pendingSave = false;

    function getTodayName() {
        return DAYS[(new Date().getDay() + 6) % 7];
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

    function getCategory(task) {
        return CATEGORIES[task.category] ? task.category : "other";
    }

    function getCategoryInfo(task) {
        return CATEGORIES[getCategory(task)];
    }

    function normalizeTask(task) {
        return {
            id: String(task.id || createId()),
            material: String(task.material || ""),
            quantity: Math.max(1, Number(task.quantity) || 1),
            day: DAYS.includes(task.day) ? task.day : "Monday",
            notes: String(task.notes || ""),
            category: getCategory(task),
            completed: task.completed === true
        };
    }

    function createId() {
        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function readLocalTasks() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return [];
            }

            const parsed = JSON.parse(saved);

            return Array.isArray(parsed)
                ? parsed.map(normalizeTask)
                : [];
        } catch (error) {
            console.warn("Unable to read farming schedule:", error);
            return [];
        }
    }

    function saveLocalTasks() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (error) {
            console.error("Unable to save local farming schedule:", error);
        }
    }

    async function loadTasks() {
        tasks = readLocalTasks();
        render();

        try {
            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            if (!result.success || !Array.isArray(result.tasks)) {
                throw new Error("Invalid schedule response.");
            }

            tasks = result.tasks.map(normalizeTask);
            saveLocalTasks();
            render();
            setConnectionStatus(true);
        } catch (error) {
            console.warn(
                "Farming schedule API unavailable. Showing local copy.",
                error
            );

            setConnectionStatus(false);
        }
    }

    function setConnectionStatus(connected) {
        const status = document.getElementById("farmingConnectionStatus");

        if (!status) {
            return;
        }

        status.textContent = connected
            ? "● MongoDB connected"
            : "● Local copy · MongoDB unavailable";

        status.classList.toggle("farming-online", connected);
        status.classList.toggle("farming-offline", !connected);
    }

    async function saveTasksToMongo() {
        if (isSaving) {
            pendingSave = true;
            return;
        }

        isSaving = true;
        pendingSave = false;

        try {
            const response = await fetch(API_URL, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    tasks
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to save schedule."
                );
            }

            setConnectionStatus(true);
        } catch (error) {
            console.error("Farming schedule save failed:", error);
            setConnectionStatus(false);
        } finally {
            isSaving = false;

            if (pendingSave) {
                pendingSave = false;
                saveTasksToMongo();
            }
        }
    }

    function scheduleSave() {
        saveLocalTasks();

        clearTimeout(saveTimer);

        saveTimer = setTimeout(() => {
            saveTasksToMongo();
        }, 250);
    }

    function injectStyles() {
        if (document.getElementById("farmingScheduleStyles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "farmingScheduleStyles";

        style.textContent = `
            #farmingSchedule {
                padding: 80px 5%;
                color: #f4f0e8;
                scroll-margin-top: 90px;
            }

            .farming-shell {
                max-width: 1250px;
                margin: 0 auto;
            }

            .farming-heading {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                gap: 20px;
                flex-wrap: wrap;
                margin-bottom: 28px;
            }

            .farming-eyebrow {
                color: #d6b36a;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 10px;
            }

            .farming-title {
                margin: 0;
                color: #f5e8c8;
                font-size: clamp(28px, 4vw, 42px);
            }

            .farming-subtitle {
                margin: 10px 0 0;
                color: #aaaab8;
                line-height: 1.7;
            }

            .farming-status {
                font-size: 12px;
                padding: 9px 13px;
                border-radius: 999px;
                background: #1b1e29;
                border: 1px solid #343746;
            }

            .farming-online {
                color: #85d8a5;
            }

            .farming-offline {
                color: #e7b86c;
            }

            .farming-stats {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 14px;
                margin-bottom: 24px;
            }

            .farming-stat {
                padding: 20px;
                border: 1px solid #2d3040;
                border-radius: 16px;
                background: linear-gradient(145deg, #1c1f2b, #141620);
            }

            .farming-stat-label {
                color: #a8a9b7;
                font-size: 13px;
                margin-bottom: 9px;
            }

            .farming-stat-value {
                color: #f0d38c;
                font-size: 28px;
                font-weight: 800;
            }

            .farming-layout {
                display: grid;
                grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
                gap: 22px;
                align-items: start;
            }

            .farming-panel {
                padding: 22px;
                background: #171923;
                border: 1px solid #2d3040;
                border-radius: 18px;
                min-width: 0;
            }

            .farming-panel h3 {
                color: #f1d79b;
                margin: 0 0 20px;
                font-size: 19px;
            }

            .farming-field {
                display: block;
                margin-bottom: 16px;
            }

            .farming-field span {
                display: block;
                color: #c8c8d1;
                font-size: 13px;
                margin-bottom: 8px;
            }

            .farming-field input,
            .farming-field select,
            .farming-field textarea {
                width: 100%;
                box-sizing: border-box;
                border: 1px solid #393c4d;
                border-radius: 10px;
                padding: 12px;
                background: #10121a;
                color: #f5f5f7;
                font: inherit;
                outline: none;
            }

            .farming-field input:focus,
            .farming-field select:focus,
            .farming-field textarea:focus {
                border-color: #d6b36a;
                box-shadow: 0 0 0 3px #d6b36a1b;
            }

            .farming-field textarea {
                resize: vertical;
                min-height: 75px;
            }

            .farming-recommendation {
                margin: 15px 0;
                padding: 14px;
                border: 1px solid #51452e;
                border-radius: 12px;
                background: #d6b36a0c;
            }

            .farming-recommendation-title {
                color: #f0d38c;
                font-size: 13px;
                font-weight: 800;
                margin-bottom: 8px;
            }

            .farming-recommendation-text {
                color: #c2c2cd;
                font-size: 12px;
                line-height: 1.7;
            }

            .farming-recommendation-days {
                color: #e6c477;
                font-size: 12px;
                margin-top: 10px;
                line-height: 1.6;
            }

            .farming-btn {
                border: 1px solid #d6b36a;
                border-radius: 10px;
                padding: 11px 15px;
                cursor: pointer;
                font-weight: 750;
                transition: transform .18s ease, opacity .18s ease;
            }

            .farming-btn:hover {
                transform: translateY(-1px);
            }

            .farming-btn-primary {
                background: #d6b36a;
                color: #171923;
                width: 100%;
            }

            .farming-btn-secondary {
                background: transparent;
                color: #e5c77f;
            }

            .farming-form-actions {
                display: flex;
                gap: 10px;
            }

            .farming-form-actions .farming-btn {
                flex: 1;
            }

            .farming-days {
                display: grid;
                grid-template-columns: repeat(7, minmax(0, 1fr));
                gap: 8px;
                margin-bottom: 18px;
            }

            .farming-day {
                background: #10121a;
                border: 1px solid #303343;
                border-radius: 10px;
                padding: 12px 5px;
                text-align: center;
                color: #c6c6d0;
                cursor: pointer;
                min-width: 0;
            }

            .farming-day strong {
                display: block;
                font-size: 13px;
            }

            .farming-day small {
                display: block;
                color: #9b9cab;
                font-size: 11px;
                margin-top: 5px;
            }

            .farming-day.active {
                border-color: #d6b36a;
                background: #d6b36a18;
                color: #f2d28b;
            }

            .farming-day.active small {
                color: #e4c477;
            }

            .farming-day-name {
                color: #f1d79b;
                margin: 0 0 14px;
                font-size: 20px;
            }

            .farming-task-list {
                display: grid;
                gap: 12px;
            }

            .farming-task {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px;
                background: #10121a;
                border: 1px solid #2d3040;
                border-radius: 13px;
            }

            .farming-task.completed {
                opacity: .65;
            }

            .farming-task.completed .farming-task-name {
                text-decoration: line-through;
            }

            .farming-check {
                width: 19px;
                height: 19px;
                flex: 0 0 auto;
                margin-top: 3px;
                accent-color: #d6b36a;
                cursor: pointer;
            }

            .farming-task-content {
                flex: 1;
                min-width: 0;
            }

            .farming-task-name {
                color: #f4e6c4;
                font-weight: 750;
                overflow-wrap: anywhere;
            }

            .farming-task-quantity {
                color: #d6b36a;
                font-size: 13px;
                margin-top: 5px;
            }

            .farming-task-category {
                display: inline-block;
                color: #e2d0a6;
                font-size: 11px;
                border: 1px solid #51452e;
                border-radius: 999px;
                padding: 4px 8px;
                margin-top: 8px;
            }

            .farming-task-notes {
                color: #a7a8b6;
                font-size: 12px;
                line-height: 1.6;
                margin-top: 8px;
                overflow-wrap: anywhere;
            }

            .farming-task-actions {
                display: flex;
                gap: 7px;
                flex-wrap: wrap;
                justify-content: flex-end;
            }

            .farming-icon-btn {
                border: 1px solid #383b4b;
                background: #1a1d28;
                color: #d8d8e0;
                border-radius: 8px;
                padding: 7px 9px;
                cursor: pointer;
            }

            .farming-icon-btn:hover {
                border-color: #d6b36a;
                color: #f0d38c;
            }

            .farming-delete:hover {
                border-color: #bd6262;
                color: #ff9b9b;
            }

            .farming-empty {
                text-align: center;
                padding: 35px 15px;
                color: #a7a8b6;
                border: 1px dashed #393c4d;
                border-radius: 13px;
                line-height: 1.7;
            }

            .farming-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 15px;
            }

            .farming-toolbar p {
                color: #a7a8b6;
                font-size: 12px;
                margin: 0;
            }

            @media (max-width: 900px) {
                .farming-layout {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 600px) {
                #farmingSchedule {
                    padding: 55px 4%;
                }

                .farming-stats {
                    gap: 8px;
                }

                .farming-stat {
                    padding: 13px;
                }

                .farming-stat-value {
                    font-size: 23px;
                }

                .farming-days {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }

                .farming-task {
                    flex-wrap: wrap;
                }

                .farming-task-actions {
                    width: 100%;
                    padding-left: 30px;
                    justify-content: flex-start;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function injectNavigationLink() {
        const navLinks = document.querySelector(".nav-links");

        if (!navLinks || document.getElementById("farmingNavLink")) {
            return;
        }

        const link = document.createElement("a");

        link.id = "farmingNavLink";
        link.href = "#farmingSchedule";
        link.textContent = "Farming Schedule";

        navLinks.appendChild(link);
    }

    function createPanel() {
        if (document.getElementById("farmingSchedule")) {
            return;
        }

        const section = document.createElement("section");
        section.id = "farmingSchedule";

        section.innerHTML = `
            <div class="farming-shell">
                <div class="farming-heading">
                    <div>
                        <div class="farming-eyebrow">Weekly Planner</div>
                        <h2 class="farming-title">Farming Schedule</h2>
                        <p class="farming-subtitle">
                            Plan your farming days and organize your material goals.
                        </p>
                    </div>

                    <div id="farmingConnectionStatus" class="farming-status">
                        Connecting to MongoDB...
                    </div>
                </div>

                <div class="farming-stats">
                    <div class="farming-stat">
                        <div class="farming-stat-label">Total Tasks</div>
                        <div id="farmingTotalTasks" class="farming-stat-value">0</div>
                    </div>

                    <div class="farming-stat">
                        <div class="farming-stat-label">Completed</div>
                        <div id="farmingCompletedTasks" class="farming-stat-value">0</div>
                    </div>

                    <div class="farming-stat">
                        <div class="farming-stat-label">Remaining</div>
                        <div id="farmingRemainingTasks" class="farming-stat-value">0</div>
                    </div>
                </div>

                <div class="farming-layout">
                    <form id="farmingTaskForm" class="farming-panel">
                        <h3 id="farmingFormTitle">Add Farming Task</h3>

                        <label class="farming-field">
                            <span>Material name</span>
                            <input
                                id="farmingMaterial"
                                type="text"
                                maxlength="120"
                                placeholder="e.g. Mora, Hero's Wit"
                                required
                            >
                        </label>

                        <label class="farming-field">
                            <span>Material category</span>
                            <select id="farmingCategory" required>
                                ${Object.entries(CATEGORIES).map(([key, category]) =>
                                    `<option value="${key}">${category.icon} ${category.label}</option>`
                                ).join("")}
                            </select>
                        </label>

                        <div id="farmingRecommendation" class="farming-recommendation"></div>

                        <label class="farming-field">
                            <span>Quantity to farm</span>
                            <input
                                id="farmingQuantity"
                                type="number"
                                min="1"
                                max="1000000"
                                step="1"
                                value="1"
                                required
                            >
                        </label>

                        <label class="farming-field">
                            <span>Farming day</span>
                            <select id="farmingDay" required>
                                ${DAYS.map(day =>
                                    `<option value="${day}">${day}</option>`
                                ).join("")}
                            </select>
                        </label>

                        <label class="farming-field">
                            <span>Notes (optional)</span>
                            <textarea
                                id="farmingNotes"
                                maxlength="300"
                                placeholder="Add a reminder..."
                            ></textarea>
                        </label>

                        <div id="farmingFormActions" class="farming-form-actions">
                            <button class="farming-btn farming-btn-primary" type="submit">
                                + Add Task
                            </button>
                        </div>
                    </form>

                    <div class="farming-panel">
                        <div class="farming-toolbar">
                            <h3 style="margin:0;">Your Week</h3>

                            <button
                                id="farmingClearCompleted"
                                class="farming-btn farming-btn-secondary"
                                type="button"
                            >
                                Clear Completed
                            </button>
                        </div>

                        <div id="farmingDayTabs" class="farming-days"></div>

                        <h4 id="farmingSelectedDay" class="farming-day-name"></h4>

                        <div class="farming-toolbar">
                            <p id="farmingDaySummary"></p>
                        </div>

                        <div id="farmingTaskList" class="farming-task-list"></div>
                    </div>
                </div>
            </div>
        `;

        const footer = document.querySelector("footer");

        if (footer) {
            footer.parentNode.insertBefore(section, footer);
        } else {
            document.body.appendChild(section);
        }

        document.getElementById("farmingDay").value = selectedDay;

        updateRecommendation();
    }

    function updateRecommendation() {
        const categoryKey =
            document.getElementById("farmingCategory").value;

        const category = CATEGORIES[categoryKey] || CATEGORIES.other;

        const recommendation =
            document.getElementById("farmingRecommendation");

        if (!recommendation) {
            return;
        }

        let daysText;

        if (categoryKey === "talent" || categoryKey === "weapon") {
            daysText =
                "Rotations: Monday/Thursday · Tuesday/Friday · Wednesday/Saturday · All groups Sunday";
        } else {
            daysText = "Suggested days: Any day, based on your needs.";
        }

        recommendation.innerHTML = `
            <div class="farming-recommendation-title">
                ${category.icon} Farming Recommendation
            </div>

            <div class="farming-recommendation-text">
                ${escapeHTML(category.recommendation)}
            </div>

            <div class="farming-recommendation-days">
                ${escapeHTML(daysText)}
            </div>
        `;

        updateDayOptions(categoryKey);
    }

    function updateDayOptions(categoryKey) {
        const daySelect = document.getElementById("farmingDay");

        if (!daySelect) {
            return;
        }

        const currentDay = daySelect.value;
        const category = CATEGORIES[categoryKey] || CATEGORIES.other;

        daySelect.innerHTML = DAYS.map(day => {
            let label = day;

            if (
                (categoryKey === "talent" || categoryKey === "weapon") &&
                day === "Sunday"
            ) {
                label = `${day} — All rotations`;
            }

            return `<option value="${day}">${escapeHTML(label)}</option>`;
        }).join("");

        daySelect.value = DAYS.includes(currentDay) ? currentDay : selectedDay;
    }

    function renderStats() {
        const completed = tasks.filter(task => task.completed).length;

        document.getElementById("farmingTotalTasks").textContent =
            tasks.length;

        document.getElementById("farmingCompletedTasks").textContent =
            completed;

        document.getElementById("farmingRemainingTasks").textContent =
            tasks.length - completed;
    }

    function renderDayTabs() {
        const container = document.getElementById("farmingDayTabs");

        container.innerHTML = DAYS.map(day => {
            const dayTasks = tasks.filter(task => task.day === day);
            const completed = dayTasks.filter(task => task.completed).length;

            return `
                <button
                    class="farming-day ${selectedDay === day ? "active" : ""}"
                    type="button"
                    data-farming-day="${day}"
                    aria-pressed="${selectedDay === day}"
                >
                    <strong>${day.slice(0, 3)}</strong>
                    <small>${completed}/${dayTasks.length}</small>
                </button>
            `;
        }).join("");
    }

    function renderTaskList() {
        const list = document.getElementById("farmingTaskList");

        const dayTasks = tasks.filter(task => task.day === selectedDay);

        const completed = dayTasks.filter(task => task.completed).length;

        document.getElementById("farmingSelectedDay").textContent =
            selectedDay;

        document.getElementById("farmingDaySummary").textContent =
            `${completed} of ${dayTasks.length} tasks completed`;

        if (dayTasks.length === 0) {
            list.innerHTML = `
                <div class="farming-empty">
                    <div style="font-size:28px;margin-bottom:8px;">✦</div>
                    <strong>No tasks planned for ${escapeHTML(selectedDay)}</strong>
                    <div>Add a task using the form to start planning your farming.</div>
                </div>
            `;

            return;
        }

        list.innerHTML = dayTasks.map(task => {
            const category = getCategoryInfo(task);

            return `
                <article class="farming-task ${task.completed ? "completed" : ""}">
                    <input
                        class="farming-check"
                        type="checkbox"
                        data-farming-action="toggle"
                        data-task-id="${escapeHTML(task.id)}"
                        ${task.completed ? "checked" : ""}
                        aria-label="Mark ${escapeHTML(task.material)} completed"
                    >

                    <div class="farming-task-content">
                        <div class="farming-task-name">
                            ${escapeHTML(task.material)}
                        </div>

                        <div class="farming-task-quantity">
                            Target quantity: ${Number(task.quantity).toLocaleString()}
                        </div>

                        <div class="farming-task-category">
                            ${category.icon} ${escapeHTML(category.label)}
                        </div>

                        ${task.notes ? `
                            <div class="farming-task-notes">
                                ${escapeHTML(task.notes)}
                            </div>
                        ` : ""}
                    </div>

                    <div class="farming-task-actions">
                        <button
                            class="farming-icon-btn"
                            type="button"
                            data-farming-action="edit"
                            data-task-id="${escapeHTML(task.id)}"
                        >Edit</button>

                        <button
                            class="farming-icon-btn farming-delete"
                            type="button"
                            data-farming-action="delete"
                            data-task-id="${escapeHTML(task.id)}"
                        >Delete</button>
                    </div>
                </article>
            `;
        }).join("");
    }

    function render() {
        if (!document.getElementById("farmingSchedule")) {
            return;
        }

        renderStats();
        renderDayTabs();
        renderTaskList();
    }

    function resetForm() {
        editingTaskId = null;

        document.getElementById("farmingTaskForm").reset();
        document.getElementById("farmingQuantity").value = 1;
        document.getElementById("farmingDay").value = selectedDay;
        document.getElementById("farmingCategory").value = "other";

        document.getElementById("farmingFormTitle").textContent =
            "Add Farming Task";

        document.getElementById("farmingFormActions").innerHTML = `
            <button class="farming-btn farming-btn-primary" type="submit">
                + Add Task
            </button>
        `;

        updateRecommendation();
    }

    function editTask(task) {
        editingTaskId = task.id;

        document.getElementById("farmingMaterial").value = task.material;
        document.getElementById("farmingQuantity").value = task.quantity;
        document.getElementById("farmingDay").value = task.day;
        document.getElementById("farmingNotes").value = task.notes || "";
        document.getElementById("farmingCategory").value = getCategory(task);

        document.getElementById("farmingFormTitle").textContent =
            "Edit Farming Task";

        document.getElementById("farmingFormActions").innerHTML = `
            <button class="farming-btn farming-btn-primary" type="submit">
                Save Changes
            </button>

            <button
                id="farmingCancelEdit"
                class="farming-btn farming-btn-secondary"
                type="button"
            >
                Cancel
            </button>
        `;

        document.getElementById("farmingCancelEdit").addEventListener(
            "click",
            resetForm
        );

        updateRecommendation();

        document.getElementById("farmingTaskForm").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    function handleSubmit(event) {
        event.preventDefault();

        const material =
            document.getElementById("farmingMaterial").value.trim();

        const quantity =
            Number(document.getElementById("farmingQuantity").value);

        const day =
            document.getElementById("farmingDay").value;

        const notes =
            document.getElementById("farmingNotes").value.trim();

        const category =
            document.getElementById("farmingCategory").value;

        if (!material || material.length > 120) {
            alert("Enter a material name with up to 120 characters.");
            return;
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 1000000
        ) {
            alert("Quantity must be a positive whole number.");
            return;
        }

        if (!DAYS.includes(day)) {
            alert("Choose a valid farming day.");
            return;
        }

        if (!CATEGORIES[category]) {
            alert("Choose a valid material category.");
            return;
        }

        if (notes.length > 300) {
            alert("Notes cannot exceed 300 characters.");
            return;
        }

        if (editingTaskId) {
            const task = tasks.find(item => item.id === editingTaskId);

            if (task) {
                task.material = material;
                task.quantity = quantity;
                task.day = day;
                task.notes = notes;
                task.category = category;
            }
        } else {
            tasks.push({
                id: createId(),
                material,
                quantity,
                day,
                notes,
                category,
                completed: false
            });
        }

        selectedDay = day;

        resetForm();
        scheduleSave();
        render();
    }

    function handleTaskAction(event) {
        const target = event.target.closest("[data-farming-action]");

        if (!target) {
            return;
        }

        const action = target.dataset.farmingAction;
        const id = target.dataset.taskId;
        const task = tasks.find(item => item.id === id);

        if (!task) {
            return;
        }

        if (action === "toggle") {
            task.completed = target.checked;
        }

        if (action === "edit") {
            editTask(task);
            return;
        }

        if (action === "delete") {
            const confirmed = confirm(
                `Delete the farming task "${task.material}"?`
            );

            if (!confirmed) {
                return;
            }

            tasks = tasks.filter(item => item.id !== id);

            if (editingTaskId === id) {
                resetForm();
            }
        }

        scheduleSave();
        render();
    }

    function handleDaySelection(event) {
        const button = event.target.closest("[data-farming-day]");

        if (!button) {
            return;
        }

        selectedDay = button.dataset.farmingDay;

        if (!DAYS.includes(selectedDay)) {
            return;
        }

        document.getElementById("farmingDay").value = selectedDay;

        render();
    }

    function clearCompletedTasks() {
        const completedCount =
            tasks.filter(task => task.completed).length;

        if (completedCount === 0) {
            alert("There are no completed tasks to clear.");
            return;
        }

        if (!confirm(`Remove ${completedCount} completed task(s)?`)) {
            return;
        }

        tasks = tasks.filter(task => !task.completed);

        resetForm();
        scheduleSave();
        render();
    }

    function bindEvents() {
        document.getElementById("farmingTaskForm").addEventListener(
            "submit",
            handleSubmit
        );

        document.getElementById("farmingCategory").addEventListener(
            "change",
            updateRecommendation
        );

        document.getElementById("farmingDayTabs").addEventListener(
            "click",
            handleDaySelection
        );

        document.getElementById("farmingTaskList").addEventListener(
            "change",
            event => {
                if (
                    event.target.matches(
                        '[data-farming-action="toggle"]'
                    )
                ) {
                    handleTaskAction(event);
                }
            }
        );

        document.getElementById("farmingTaskList").addEventListener(
            "click",
            handleTaskAction
        );

        document.getElementById("farmingClearCompleted").addEventListener(
            "click",
            clearCompletedTasks
        );

        const navLink = document.getElementById("farmingNavLink");

        if (navLink) {
            navLink.addEventListener("click", () => {
                selectedDay = getTodayName();
                render();
            });
        }
    }

    function init() {
        injectStyles();
        injectNavigationLink();
        createPanel();
        bindEvents();
        loadTasks();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();