(() => {
    "use strict";

    const INVENTORY_STORAGE_KEY = "genshinBuildPlannerInventory";
    const FARMING_STORAGE_KEY = "genshinFarmingSchedule";
    const OWNERSHIP_STORAGE_KEY =
        "genshinBuildPlannerCharacterOwnership";
    const BUILDS_STORAGE_KEY = "genshinBuildPlannerBuilds";

    function readStorage(key, fallback) {
        try {
            const saved = localStorage.getItem(key);

            if (!saved) {
                return fallback;
            }

            return JSON.parse(saved);
        } catch (error) {
            console.error(`Unable to read dashboard storage: ${key}`, error);
            return fallback;
        }
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

    function getInventoryCount() {
        const inventory = readStorage(INVENTORY_STORAGE_KEY, {});

        if (
            !inventory ||
            typeof inventory !== "object" ||
            Array.isArray(inventory)
        ) {
            return 0;
        }

        return Object.keys(inventory).length;
    }

    function getFarmingTasks() {
        const tasks = readStorage(FARMING_STORAGE_KEY, []);

        return Array.isArray(tasks)
            ? tasks.filter(task => task && typeof task === "object")
            : [];
    }

    function getOwnedCharacters() {
        const ownership =
            readStorage(OWNERSHIP_STORAGE_KEY, {});

        if (
            typeof characters === "undefined" ||
            !Array.isArray(characters) ||
            !ownership ||
            typeof ownership !== "object" ||
            Array.isArray(ownership)
        ) {
            return [];
        }

        return characters.filter(character => (
            ownership[character.id] &&
            ownership[character.id].owned === true
        ));
    }

    function renderOwnershipCounts() {
        const ownedCount =
            document.getElementById("dashboardOwnedCharacters");
        const fiveStarCount =
            document.getElementById("dashboardFiveStarCharacters");
        const fourStarCount =
            document.getElementById("dashboardFourStarCharacters");

        if (!ownedCount || !fiveStarCount || !fourStarCount) {
            return;
        }

        const ownedCharacters =
            getOwnedCharacters();

        ownedCount.textContent =
            String(ownedCharacters.length);
        fiveStarCount.textContent =
            String(
                ownedCharacters.filter(
                    character => Number(character.rarity) === 5
                ).length
            );
        fourStarCount.textContent =
            String(
                ownedCharacters.filter(
                    character => Number(character.rarity) === 4
                ).length
            );
    }

    function renderInventoryCount() {
        const count = document.getElementById("dashboardMaterialsTracked");
        const note = document.getElementById("dashboardMaterialsNote");

        if (!count || !note) {
            return;
        }

        const materialCount = getInventoryCount();

        count.textContent = String(materialCount);
        note.textContent = materialCount === 0
            ? "No materials saved yet"
            : "From your current inventory";
    }

    function renderFarmingOverview() {
        const content = document.getElementById("dashboardFarmingContent");

        if (!content) {
            return;
        }

        const tasks = getFarmingTasks();
        const remainingTasks = tasks.filter(task => task.completed !== true);
        const completedTasks = tasks.length - remainingTasks.length;

        if (tasks.length === 0) {
            content.innerHTML = `
                <div class="dashboard-placeholder dashboard-farming-empty">
                    <span class="dashboard-placeholder-mark">⌁</span>
                    <strong>No farming tasks saved</strong>
                    <p>Add tasks in Farming Schedule to see your current priorities here.</p>
                </div>
            `;
            return;
        }

        const priorityTasks = remainingTasks.slice(0, 3);
        const priorityMarkup = priorityTasks.length > 0
            ? priorityTasks.map(task => `
                <li>
                    <span>${escapeHTML(task.day || "Unscheduled")}</span>
                    <strong>${escapeHTML(task.material || "Unnamed material")}</strong>
                    <small>${Number(task.quantity) || 1} needed</small>
                </li>
            `).join("")
            : `
                <li class="dashboard-task-complete">
                    <span>✓</span>
                    <strong>All saved tasks completed</strong>
                    <small>Great work, Traveler</small>
                </li>
            `;

        content.innerHTML = `
            <div class="dashboard-farming-summary">
                <div>
                    <strong>${tasks.length}</strong>
                    <span>Total tasks</span>
                </div>
                <div>
                    <strong>${remainingTasks.length}</strong>
                    <span>Remaining</span>
                </div>
                <div>
                    <strong>${completedTasks}</strong>
                    <span>Completed</span>
                </div>
            </div>
            <div class="dashboard-priority-heading">
                <span>Upcoming priorities</span>
                <small>From your saved schedule</small>
            </div>
            <ul class="dashboard-task-list">${priorityMarkup}</ul>
        `;
    }

    function getUpgradeEntries() {
        if (
            window.genshinBuilds &&
            typeof window.genshinBuilds.getUpgradeEntries === "function"
        ) {
            return window.genshinBuilds.getUpgradeEntries();
        }

        const saved = readStorage(BUILDS_STORAGE_KEY, {});
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
            return [];
        }

        return [];
    }

    function renderUpgradeOverview() {
        const count = document.getElementById("dashboardCharactersUpgrading");
        const note = document.getElementById("dashboardUpgradingNote");
        const content = document.getElementById("dashboardUpgradeContent");

        if (!count || !note || !content) {
            return;
        }

        const entries = getUpgradeEntries();
        const characterIds = new Set(
            entries.map(entry => entry.character.id)
        );

        count.textContent = String(characterIds.size);
        note.textContent = characterIds.size === 1
            ? "Character with saved builds"
            : "Characters with saved builds";

        if (entries.length === 0) {
            content.className = "dashboard-placeholder";
            content.innerHTML = `
                <span class="dashboard-placeholder-mark">✧</span>
                <strong>No saved builds yet</strong>
                <p>Create a build to track upgrade targets here.</p>
            `;
            return;
        }

        content.className = "dashboard-upgrade-list";
        content.innerHTML = entries.slice(0, 6).map(entry => `
            <div class="dashboard-upgrade-item">
                <div>
                    <strong>${escapeHTML(entry.character.name)}</strong>
                    <span>${escapeHTML(entry.build.name)}</span>
                </div>
                <div class="dashboard-upgrade-progress">
                    <span>
                        <i style="width:${entry.progress.percent}%"></i>
                    </span>
                    <small>${entry.progress.percent}% · ${escapeHTML(entry.progress.status)}</small>
                </div>
            </div>
        `).join("");
    }

    function renderMaterialOverview() {
        const content =
            document.getElementById("dashboardMaterialsRequirements");

        if (!content) {
            return;
        }

        const summary =
            window.genshinMaterials &&
            typeof window.genshinMaterials.getSummary === "function"
                ? window.genshinMaterials.getSummary()
                : null;

        if (!summary || !summary.results) {
            content.innerHTML = `
                <div class="dashboard-placeholder">
                    <span class="dashboard-placeholder-mark">◇</span>
                    <strong>Calculating requirements</strong>
                    <p>Saved build materials will appear here shortly.</p>
                </div>
            `;
            return;
        }

        if (!summary.results.length) {
            content.innerHTML = `
                <div class="dashboard-placeholder">
                    <span class="dashboard-placeholder-mark">◇</span>
                    <strong>No saved build requirements</strong>
                    <p>Create a build to compare its materials with inventory.</p>
                </div>
            `;
            return;
        }

        const mostNeeded = summary.mostNeeded.length
            ? summary.mostNeeded.map(material => `
                <li>
                    <strong>${escapeHTML(material.name)}</strong>
                    <span>×${Number(material.missing).toLocaleString("en-IN")} missing</span>
                </li>
            `).join("")
            : "<li><strong>All tracked materials covered</strong><span>Review Mora separately</span></li>";

        content.innerHTML = `
            <div class="dashboard-material-stat-grid">
                <div><strong>${summary.missingTypes}</strong><span>Missing types</span></div>
                <div><strong>${Number(summary.missingQuantity).toLocaleString("en-IN")}</strong><span>Items missing</span></div>
                <div><strong>${Number(summary.moraShortage).toLocaleString("en-IN")}</strong><span>Mora shortage</span></div>
                <div><strong>${summary.buildsOutstanding}</strong><span>Builds outstanding</span></div>
            </div>
            <p class="dashboard-priority-heading">Most-needed materials</p>
            <ul class="dashboard-material-priority-list">${mostNeeded}</ul>
            <a class="dashboard-inline-link" href="#materials">Open full material requirements →</a>
        `;
    }

    function renderDashboardData() {
        renderOwnershipCounts();
        renderInventoryCount();
        renderFarmingOverview();
        renderUpgradeOverview();
        renderMaterialOverview();
    }

    function initializeDashboard() {
        renderDashboardData();

        window.addEventListener(
            "characterOwnershipChanged",
            () => {
                renderOwnershipCounts();
                renderUpgradeOverview();
            }
        );
        window.addEventListener(
            "buildsChanged",
            renderUpgradeOverview
        );
        window.addEventListener(
            "materialRequirementsChanged",
            renderMaterialOverview
        );

        window.setInterval(renderDashboardData, 1000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeDashboard);
    } else {
        initializeDashboard();
    }
})();
