(() => {
    "use strict";

    const API_URL =
        "https://genshin-db-api.vercel.app/api/v5/talents";

    const INVENTORY_STORAGE_KEY =
        "genshinBuildPlannerInventory";

    const TALENT_TYPES = [
        {
            name: "Normal Attack",
            fromId: "normalAttackFrom",
            toId: "normalAttackTo"
        },
        {
            name: "Elemental Skill",
            fromId: "skillFrom",
            toId: "skillTo"
        },
        {
            name: "Elemental Burst",
            fromId: "burstFrom",
            toId: "burstTo"
        }
    ];

    const DAYS = {
        Monday: ["Monday", "Thursday"],
        Tuesday: ["Tuesday", "Friday"],
        Wednesday: ["Wednesday", "Saturday"]
    };

    const BOOK_ROTATIONS = {
        Freedom: "Monday",
        Prosperity: "Monday",
        Transience: "Monday",
        Admonition: "Monday",
        Equity: "Monday",
        Contention: "Monday",

        Resistance: "Tuesday",
        Diligence: "Tuesday",
        Elegance: "Tuesday",
        Ingenuity: "Tuesday",
        Justice: "Tuesday",
        Kindling: "Tuesday",

        Ballad: "Wednesday",
        Gold: "Wednesday",
        Light: "Wednesday",
        Praxis: "Wednesday",
        Order: "Wednesday",
        Conflict: "Wednesday"
    };

    let currentMaterials = [];
    let currentCharacter = null;
    let lastCalculatedCharacter = null;
    let calculationVersion = 0;

    function escapeHTML(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[character]
        );
    }

    function normalizeName(name) {
        return String(name ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
    }

    function getSelectedCharacter() {
        if (
            typeof selectedCharacterData !== "undefined" &&
            selectedCharacterData
        ) {
            return selectedCharacterData;
        }

        return null;
    }

    function getInventory() {
        try {
            const saved = localStorage.getItem(
                INVENTORY_STORAGE_KEY
            );

            if (!saved) {
                return {};
            }

            const parsed = JSON.parse(saved);

            return parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
                ? parsed
                : {};
        } catch (error) {
            console.error(
                "Could not read inventory:",
                error
            );

            return {};
        }
    }

    function getOwnedAmount(materialName) {
        const inventory = getInventory();
        const targetName = normalizeName(materialName);

        const matchingKey = Object.keys(inventory).find(
            key => normalizeName(key) === targetName
        );

        if (!matchingKey) {
            return 0;
        }

        const amount = Number(inventory[matchingKey]);

        return Number.isFinite(amount) && amount > 0
            ? Math.floor(amount)
            : 0;
    }

    function getApiResult(data) {
        if (data?.result?.costs) {
            return data.result;
        }

        if (data?.costs) {
            return data;
        }

        if (Array.isArray(data)) {
            return data.find(item => item?.costs) || null;
        }

        return null;
    }

    function getRotation(materialName) {
        for (const [family, firstDay] of Object.entries(
            BOOK_ROTATIONS
        )) {
            if (
                materialName.toLowerCase().includes(
                    family.toLowerCase()
                )
            ) {
                return {
                    family,
                    firstDay,
                    days: DAYS[firstDay]
                };
            }
        }

        return null;
    }

    function getTalentRanges() {
        return TALENT_TYPES.map(talent => {
            const fromElement = document.getElementById(
                talent.fromId
            );

            const toElement = document.getElementById(
                talent.toId
            );

            return {
                name: talent.name,
                from: Number(fromElement?.value),
                to: Number(toElement?.value)
            };
        });
    }

    function validateRanges(ranges) {
        for (const range of ranges) {
            if (
                !Number.isFinite(range.from) ||
                !Number.isFinite(range.to) ||
                range.from < 1 ||
                range.to > 10 ||
                range.to < range.from
            ) {
                throw new Error(
                    `Invalid level range for ${range.name}.`
                );
            }
        }
    }

    function getTalentBookMaterials(
        talentData,
        ranges
    ) {
        const totals = new Map();
        const costs = talentData?.costs || {};

        for (const range of ranges) {
            for (
                let level = range.from + 1;
                level <= range.to;
                level++
            ) {
                const levelCosts = costs[`lvl${level}`];

                if (!Array.isArray(levelCosts)) {
                    continue;
                }

                for (const material of levelCosts) {
                    if (!material?.name) {
                        continue;
                    }

                    if (
                        !/^(Teachings of |Guide to |Philosophies of )/i
                            .test(material.name)
                    ) {
                        continue;
                    }

                    const key = normalizeName(material.name);

                    const existing = totals.get(key);

                    if (existing) {
                        existing.quantity +=
                            Number(material.count) || 0;
                    } else {
                        totals.set(key, {
                            name: material.name,
                            quantity:
                                Number(material.count) || 0
                        });
                    }
                }
            }
        }

        return Array.from(totals.values())
            .map(material => {
                const owned = getOwnedAmount(material.name);

                return {
                    ...material,
                    owned,
                    remaining: Math.max(
                        0,
                        material.quantity - owned
                    ),
                    rotation: getRotation(material.name)
                };
            })
            .sort((a, b) => {
                const order = {
                    "teachings": 1,
                    "guide": 2,
                    "philosophies": 3
                };

                function rank(name) {
                    const lower = name.toLowerCase();

                    if (lower.startsWith("teachings of ")) {
                        return order.teachings;
                    }

                    if (lower.startsWith("guide to ")) {
                        return order.guide;
                    }

                    if (lower.startsWith("philosophies of ")) {
                        return order.philosophies;
                    }

                    return 4;
                }

                return (
                    rank(a.name) - rank(b.name) ||
                    a.name.localeCompare(b.name)
                );
            });
    }

    function createPanel() {
        if (
            document.getElementById(
                "characterDomainPanel"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id = "characterDomainStyles";

        style.textContent = `
            #characterDomainPanel {
                max-width: 1250px;
                margin: 30px auto;
                padding: 24px;
                color: #f4f0e8;
                background: #171923;
                border: 1px solid #2d3040;
                border-radius: 18px;
            }

            .cd-title {
                margin: 0 0 8px;
                color: #f1d79b;
                font-size: 24px;
            }

            .cd-description {
                color: #aaaab8;
                line-height: 1.7;
                margin: 0 0 18px;
            }

            .cd-character {
                margin-bottom: 18px;
                padding: 12px 15px;
                background: #10121a;
                border: 1px solid #343746;
                border-radius: 10px;
                color: #f1d79b;
                font-weight: 700;
            }

            .cd-targets {
                display: grid;
                grid-template-columns:
                    repeat(auto-fit, minmax(180px, 1fr));
                gap: 10px;
                margin-bottom: 18px;
            }

            .cd-target {
                padding: 12px;
                background: #10121a;
                border: 1px solid #343746;
                border-radius: 10px;
                color: #c8c8d1;
                font-size: 13px;
                line-height: 1.7;
            }

            .cd-controls {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            .cd-button {
                padding: 12px 18px;
                border: 1px solid #d6b36a;
                border-radius: 10px;
                background: #d6b36a;
                color: #171923;
                font-weight: 750;
                cursor: pointer;
            }

            .cd-button:disabled {
                opacity: .45;
                cursor: not-allowed;
            }

            .cd-results {
                display: grid;
                grid-template-columns:
                    repeat(auto-fit, minmax(250px, 1fr));
                gap: 14px;
                margin-top: 22px;
            }

            .cd-card {
                padding: 18px;
                background: #10121a;
                border: 1px solid #343746;
                border-radius: 13px;
            }

            .cd-card h4 {
                margin: 0 0 14px;
                color: #f1d79b;
            }

            .cd-meta {
                color: #b8b8c5;
                font-size: 13px;
                line-height: 1.9;
                margin-bottom: 15px;
            }

            .cd-remaining {
                color: #f0d38c;
                font-size: 15px;
                font-weight: 800;
            }

            .cd-covered {
                color: #85d8a5;
                font-weight: 800;
            }

            .cd-error {
                color: #ffadad;
                line-height: 1.7;
                margin-top: 18px;
            }

            .cd-success {
                color: #85d8a5;
                margin-top: 14px;
                line-height: 1.7;
            }

            .cd-warning {
                color: #e7b86c;
                font-size: 12px;
                line-height: 1.6;
                margin-top: 12px;
            }

            @media (max-width: 600px) {
                #characterDomainPanel {
                    margin: 20px 4%;
                    padding: 17px;
                }
            }
        `;

        document.head.appendChild(style);

        const panel = document.createElement("section");

        panel.id = "characterDomainPanel";

        panel.innerHTML = `
            <h2 class="cd-title">
                Character Domain Finder
            </h2>

            <p class="cd-description">
                Calculate talent books from your selected Build Targets,
                subtract your inventory, and plan your farming.
            </p>

            <div
                id="cdCharacter"
                class="cd-character"
            >
                No character selected
            </div>

            <div
                id="cdTargets"
                class="cd-targets"
            ></div>

            <div class="cd-controls">
                <button
                    id="cdFindButton"
                    class="cd-button"
                    type="button"
                >
                    Calculate Required Books
                </button>

                <button
                    id="cdRefreshInventory"
                    class="cd-button"
                    type="button"
                >
                    Refresh Inventory
                </button>
            </div>

            <div
                id="cdMessage"
                aria-live="polite"
            ></div>

            <div
                id="cdResults"
                class="cd-results"
            ></div>
        `;

        const farmingSection =
            document.getElementById("farmingSchedule");

        if (farmingSection) {
            farmingSection.appendChild(panel);
        } else {
            document.body.appendChild(panel);
        }

        document.getElementById(
            "cdFindButton"
        ).addEventListener(
            "click",
            findDomains
        );

        document.getElementById(
            "cdRefreshInventory"
        ).addEventListener(
            "click",
            refreshInventoryDisplay
        );

        document.getElementById(
            "cdResults"
        ).addEventListener(
            "click",
            addMaterialToSchedule
        );

        syncCharacterAndTargets();
    }

    function syncCharacterAndTargets() {
        const character = getSelectedCharacter();

        const characterElement =
            document.getElementById("cdCharacter");

        const targetsElement =
            document.getElementById("cdTargets");

        if (!characterElement || !targetsElement) {
            return;
        }

        const characterName = character?.name || null;

        characterElement.textContent = characterName
            ? `Selected character: ${characterName}`
            : "Select a character in your Build Planner first.";

        const ranges = getTalentRanges();

        targetsElement.innerHTML = ranges.map(range => `
            <div class="cd-target">
                <strong>${escapeHTML(range.name)}</strong><br>
                Current level: ${escapeHTML(range.from)}<br>
                Target level: ${escapeHTML(range.to)}
            </div>
        `).join("");

        if (
            characterName !== lastCalculatedCharacter
        ) {
            lastCalculatedCharacter = characterName;
            currentCharacter = characterName;
            currentMaterials = [];

            const results =
                document.getElementById("cdResults");

            const message =
                document.getElementById("cdMessage");

            if (results) {
                results.innerHTML = "";
            }

            if (message) {
                message.textContent = characterName
                    ? "Character synchronized. Click Calculate Required Books."
                    : "";

                message.className = "";
            }
        }
    }

    async function fetchTalentData(characterName) {
        const response = await fetch(
            `${API_URL}?query=${encodeURIComponent(
                characterName
            )}&resultLanguage=english`
        );

        if (!response.ok) {
            throw new Error(
                `Talent API returned HTTP ${response.status}.`
            );
        }

        const rawData = await response.json();
        const data = getApiResult(rawData);

        if (!data?.costs) {
            throw new Error(
                `Talent cost data was not found for ${characterName}.`
            );
        }

        return data;
    }

    async function findDomains() {
        const version = ++calculationVersion;

        const character = getSelectedCharacter();

        const message =
            document.getElementById("cdMessage");

        const results =
            document.getElementById("cdResults");

        const button =
            document.getElementById("cdFindButton");

        results.innerHTML = "";
        currentMaterials = [];

        if (!character?.name) {
            message.textContent =
                "Please select a character in your Build Planner first.";

            message.className = "cd-error";
            return;
        }

        const ranges = getTalentRanges();

        try {
            validateRanges(ranges);
        } catch (error) {
            message.textContent = error.message;
            message.className = "cd-error";
            return;
        }

        const hasUpgrades = ranges.some(
            range => range.to > range.from
        );

        if (!hasUpgrades) {
            message.textContent =
                "Increase at least one talent target level to calculate books.";

            message.className = "cd-error";
            return;
        }

        currentCharacter = character.name;

        button.disabled = true;
        button.textContent = "Calculating...";

        message.textContent =
            `Calculating talent books for ${character.name}...`;

        message.className = "";

        try {
            const talentData = await fetchTalentData(
                character.name
            );

            if (version !== calculationVersion) {
                return;
            }

            const materials = getTalentBookMaterials(
                talentData,
                ranges
            );

            if (!materials.length) {
                throw new Error(
                    "No talent-book materials were found for these target levels."
                );
            }

            currentMaterials = materials;

            renderResults(ranges);

            message.textContent =
                `Calculated materials for ${character.name} using your selected talent levels.`;

            message.className = "cd-success";
        } catch (error) {
            console.error(
                "Character domain calculation failed:",
                error
            );

            if (version === calculationVersion) {
                message.textContent = error.message ||
                    "Could not calculate talent materials.";

                message.className = "cd-error";
            }
        } finally {
            if (version === calculationVersion) {
                button.disabled = false;
                button.textContent = "Calculate Required Books";
            }
        }
    }

    function refreshInventoryDisplay() {
        currentMaterials = currentMaterials.map(material => {
            const owned = getOwnedAmount(material.name);

            return {
                ...material,
                owned,
                remaining: Math.max(
                    0,
                    material.quantity - owned
                )
            };
        });

        renderResults();

        const message =
            document.getElementById("cdMessage");

        message.textContent =
            "Inventory refreshed. Remaining quantities have been recalculated.";

        message.className = "cd-success";
    }

    function renderResults() {
        const results =
            document.getElementById("cdResults");

        if (!results) {
            return;
        }

        if (!currentMaterials.length) {
            results.innerHTML = "";
            return;
        }

        results.innerHTML = currentMaterials.map(
            (material, index) => {
                const rotation = material.rotation;

                const daysText = rotation
                    ? `${rotation.days.join(" / ")} · Sunday: all rotations`
                    : "Check the in-game domain schedule.";

                const covered = material.remaining === 0;

                return `
                    <article class="cd-card">
                        <h4>
                            ${escapeHTML(material.name)}
                        </h4>

                        <div class="cd-meta">
                            Required for selected targets:
                            ${material.quantity.toLocaleString()}<br>

                            Already owned:
                            ${material.owned.toLocaleString()}<br>

                            <span class="${
                                covered
                                    ? "cd-covered"
                                    : "cd-remaining"
                            }">
                                ${
                                    covered
                                        ? "Inventory sufficient ✓"
                                        : `Still needed: ${material.remaining.toLocaleString()}`
                                }
                            </span>
                            <br>

                            Recommended days:
                            ${escapeHTML(daysText)}
                        </div>

                        <button
                            class="cd-button"
                            type="button"
                            data-cd-add="${index}"
                            ${covered || !rotation ? "disabled" : ""}
                        >
                            ${
                                covered
                                    ? "Already Have Enough"
                                    : "Add Remaining Quantity"
                            }
                        </button>

                        ${
                            !rotation
                                ? `
                                    <div class="cd-warning">
                                        The domain rotation could not be
                                        identified automatically.
                                    </div>
                                `
                                : ""
                        }
                    </article>
                `;
            }
        ).join("");
    }

    function addMaterialToSchedule(event) {
        const button =
            event.target.closest("[data-cd-add]");

        if (!button) {
            return;
        }

        const index = Number(button.dataset.cdAdd);
        const material = currentMaterials[index];

        if (!material || !material.rotation) {
            return;
        }

        const selected = getSelectedCharacter();

        if (
            !selected ||
            normalizeName(selected.name) !==
                normalizeName(currentCharacter)
        ) {
            alert(
                "The selected character changed. Recalculate the materials first."
            );

            return;
        }

        const owned = getOwnedAmount(material.name);

        const remaining = Math.max(
            0,
            material.quantity - owned
        );

        if (remaining === 0) {
            alert(
                "You already have enough of this material!"
            );

            refreshInventoryDisplay();
            return;
        }

        const category =
            document.getElementById("farmingCategory");

        const name =
            document.getElementById("farmingMaterial");

        const quantity =
            document.getElementById("farmingQuantity");

        const day =
            document.getElementById("farmingDay");

        const notes =
            document.getElementById("farmingNotes");

        const form =
            document.getElementById("farmingTaskForm");

        if (
            !category ||
            !name ||
            !quantity ||
            !day ||
            !notes ||
            !form
        ) {
            alert(
                "The Farming Schedule form could not be found."
            );

            return;
        }

        category.value = "talent";
        name.value = material.name;
        quantity.value = remaining;
        day.value = material.rotation.firstDay;

        notes.value =
            `For ${currentCharacter}. ` +
            `Required for selected talent targets: ${material.quantity}. ` +
            `Owned: ${owned}. ` +
            `Remaining: ${remaining}. ` +
            `Recommended days: ${material.rotation.days.join(" / ")}.`;

        category.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        form.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        name.focus();

        const message =
            document.getElementById("cdMessage");

        message.textContent =
            `${remaining} remaining ${material.name} books filled into your Farming Schedule. Review the task and click Add Task to save it.`;

        message.className = "cd-success";
    }

    function init() {
        createPanel();

        document.addEventListener(
            "change",
            event => {
                if (
                    TALENT_TYPES.some(
                        talent =>
                            event.target.id === talent.fromId ||
                            event.target.id === talent.toId
                    )
                ) {
                    syncCharacterAndTargets();
                }
            }
        );

        document.addEventListener(
            "input",
            event => {
                if (
                    TALENT_TYPES.some(
                        talent =>
                            event.target.id === talent.fromId ||
                            event.target.id === talent.toId
                    )
                ) {
                    syncCharacterAndTargets();
                }
            }
        );

        setInterval(() => {
            const character = getSelectedCharacter();
            const currentName = character?.name || null;

            if (currentName !== lastCalculatedCharacter) {
                syncCharacterAndTargets();
            }
        }, 500);

        const resetButton =
            document.getElementById("resetButton");

        if (resetButton) {
            resetButton.addEventListener(
                "click",
                () => {
                    currentMaterials = [];

                    const results =
                        document.getElementById("cdResults");

                    const message =
                        document.getElementById("cdMessage");

                    if (results) {
                        results.innerHTML = "";
                    }

                    if (message) {
                        message.textContent = "";
                    }

                    syncCharacterAndTargets();
                }
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }
})();