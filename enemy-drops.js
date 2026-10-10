(() => {
    "use strict";

    const CHARACTER_API =
        "https://genshin-db-api.vercel.app/api/v5/characters";

    const TALENT_API =
        "https://genshin-db-api.vercel.app/api/v5/talents";

    const INVENTORY_KEY =
        "genshinBuildPlannerInventory";

    const ASCENSION_STAGES = [
        { key: "ascend1", level: 20 },
        { key: "ascend2", level: 40 },
        { key: "ascend3", level: 50 },
        { key: "ascend4", level: 60 },
        { key: "ascend5", level: 70 },
        { key: "ascend6", level: 80 }
    ];

    const TALENTS = [
        {
            name: "Normal Attack",
            from: "normalAttackFrom",
            to: "normalAttackTo"
        },
        {
            name: "Elemental Skill",
            from: "skillFrom",
            to: "skillTo"
        },
        {
            name: "Elemental Burst",
            from: "burstFrom",
            to: "burstTo"
        }
    ];

    const ENEMY_DROP_PATTERNS = [
        /^Slime /i,
        /Hilichurl.*Mask/i,
        /Damaged Mask/i,
        /Stained Mask/i,
        /Ominous Mask/i,
        /Firm Arrowhead/i,
        /Sharp Arrowhead/i,
        /Weathered Arrowhead/i,
        /Recruit's Insignia/i,
        /Sergeant's Insignia/i,
        /Lieutenant's Insignia/i,
        /Whopperflower Nectar/i,
        /Shimmering Nectar/i,
        /Energy Nectar/i,
        /Old Handguard/i,
        /Kageuchi Handguard/i,
        /Famed Handguard/i,
        /Spectral Husk/i,
        /Spectral Heart/i,
        /Spectral Nucleus/i,
        /Damaged Prism/i,
        /Turbid Prism/i,
        /Radiant Prism/i,
        /Fungal Spores/i,
        /Luminescent Pollen/i,
        /Crystalline Cyst Dust/i,
        /Inactivated Fungal Nucleus/i,
        /Dormant Fungal Nucleus/i,
        /Robust Fungal Nucleus/i,
        /Divining Scroll/i,
        /Sealed Scroll/i,
        /Forbidden Curse Scroll/i,
        /Chaos Device/i,
        /Chaos Circuit/i,
        /Chaos Core/i,
        /Treasure Hoarder.*Insignia/i,
        /Gloomy Statuette/i,
        /Dark Statuette/i,
        /Deathly Statuette/i,
        /Old Operative's Pocket Watch/i,
        /Operative's Standard Pocket Watch/i,
        /Operative's Constancy/i,
        /Meshing Gear/i,
        /Mechanical Spur Gear/i,
        /Artificed Dynamic Gear/i,
        /Tattered Warrant/i,
        /Immaculate Warrant/i,
        /Frost-Etched Warrant/i,
        /Juvenile Fang/i,
        /Seasoned Fang/i,
        /Tyrant's Fang/i,
        /Sentry's Wooden Whistle/i,
        /Warrior's Metal Whistle/i,
        /Saurian-Crowned Warrior's Golden Whistle/i,
        /Transoceanic Pearl/i,
        /Transoceanic Chunk/i,
        /Xenochromatic Crystal/i,
        /Broken Drive Shaft/i,
        /Reinforced Drive Shaft/i,
        /Precision Drive Shaft/i,
        /Lightless Bone/i,
        /Glowing Remains/i,
        /Radiant Exoskeleton/i,
        /Cold-Cracked Shellshard/i,
        /Warm Back-Shell/i,
        /Blazing Prismshell/i,
        /Axis of the Secret Source/i,
        /Sheath of the Secret Source/i,
        /Heart of the Secret Source/i,
        /Mistshroud Manifestation/i,
        /Mistshroud Plate/i,
        /Mistshroud Helmet/i
    ];

    let materials = [];
    let activeCharacter = "";
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

    function normalizeName(value) {
        return String(value ?? "")
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
            const value = localStorage.getItem(
                INVENTORY_KEY
            );

            if (!value) {
                return {};
            }

            const parsed = JSON.parse(value);

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

    function getOwned(materialName) {
        const inventory = getInventory();
        const key = normalizeName(materialName);

        const matchingKey = Object.keys(inventory).find(
            item => normalizeName(item) === key
        );

        if (!matchingKey) {
            return 0;
        }

        const amount = Number(inventory[matchingKey]);

        return Number.isFinite(amount) && amount > 0
            ? Math.floor(amount)
            : 0;
    }

    function isEnemyDrop(name) {
        return ENEMY_DROP_PATTERNS.some(
            pattern => pattern.test(name)
        );
    }

    function addMaterials(target, list) {
        if (!Array.isArray(list)) {
            return;
        }

        list.forEach(item => {
            if (
                !item ||
                !item.name ||
                !isEnemyDrop(item.name)
            ) {
                return;
            }

            const amount = Number(item.count);

            if (!Number.isFinite(amount) || amount <= 0) {
                return;
            }

            const key = normalizeName(item.name);

            if (!target.has(key)) {
                target.set(key, {
                    name: item.name,
                    quantity: 0
                });
            }

            target.get(key).quantity += amount;
        });
    }

    function getApiResult(data) {
        if (data?.result && typeof data.result === "object") {
            return data.result;
        }

        return data;
    }

    async function fetchCharacterData(api, name) {
        const response = await fetch(
            `${api}?query=${encodeURIComponent(name)}&resultLanguage=english`
        );

        if (!response.ok) {
            throw new Error(
                `API request failed: HTTP ${response.status}`
            );
        }

        const result = getApiResult(
            await response.json()
        );

        if (!result || !result.costs) {
            throw new Error(
                `Material data was not found for ${name}.`
            );
        }

        return result;
    }

    function getAscensionStages(fromLevel, toLevel) {
        return ASCENSION_STAGES.filter(stage => {
            return (
                toLevel >= stage.level &&
                fromLevel < stage.level
            );
        });
    }

    function getTalentRanges() {
        return TALENTS.map(talent => ({
            name: talent.name,
            from: Number(
                document.getElementById(talent.from)?.value
            ),
            to: Number(
                document.getElementById(talent.to)?.value
            )
        }));
    }

    function validateTalentRanges(ranges) {
        for (const range of ranges) {
            if (
                !Number.isFinite(range.from) ||
                !Number.isFinite(range.to) ||
                range.from < 1 ||
                range.to > 10 ||
                range.to < range.from
            ) {
                throw new Error(
                    `Check the level targets for ${range.name}.`
                );
            }
        }
    }

    function calculateResults(
        characterData,
        talentData,
        stages,
        ranges
    ) {
        const totals = new Map();

        stages.forEach(stage => {
            addMaterials(
                totals,
                characterData.costs[stage.key]
            );
        });

        ranges.forEach(range => {
            for (
                let level = range.from + 1;
                level <= range.to;
                level++
            ) {
                addMaterials(
                    totals,
                    talentData.costs[`lvl${level}`]
                );
            }
        });

        return Array.from(totals.values())
            .map(material => {
                const owned = getOwned(material.name);

                return {
                    ...material,
                    owned,
                    remaining: Math.max(
                        0,
                        material.quantity - owned
                    )
                };
            })
            .sort((a, b) => {
                if (a.remaining === 0 && b.remaining > 0) {
                    return 1;
                }

                if (b.remaining === 0 && a.remaining > 0) {
                    return -1;
                }

                return a.name.localeCompare(b.name);
            });
    }

    function addStyles() {
        if (
            document.getElementById(
                "enemyDropsStyles"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id = "enemyDropsStyles";

        style.textContent = `
            #enemyDropsPanel {
                margin: 28px auto;
                padding: 24px;
                max-width: 1250px;
                color: #f4f0e8;
                background: #171923;
                border: 1px solid #303342;
                border-radius: 16px;
            }

            .ed-title {
                margin: 0 0 8px;
                color: #d6b36a;
                font-size: 24px;
            }

            .ed-description {
                margin: 0 0 18px;
                color: #aaaab8;
                line-height: 1.7;
            }

            .ed-character {
                margin-bottom: 16px;
                padding: 12px;
                background: #10121a;
                border: 1px solid #303342;
                border-radius: 10px;
                color: #f1d79b;
                font-weight: 700;
            }

            .ed-button {
                padding: 12px 18px;
                border: 1px solid #d6b36a;
                border-radius: 9px;
                background: #d6b36a;
                color: #10121a;
                font-weight: 700;
                cursor: pointer;
            }

            .ed-button:disabled {
                opacity: .5;
                cursor: not-allowed;
            }

            .ed-message {
                margin-top: 16px;
                line-height: 1.7;
            }

            .ed-error {
                color: #ffaaaa;
            }

            .ed-success {
                color: #8cdbac;
            }

            .ed-summary {
                display: grid;
                grid-template-columns:
                    repeat(auto-fit, minmax(150px, 1fr));
                gap: 12px;
                margin: 20px 0;
            }

            .ed-summary-card {
                padding: 15px;
                background: #10121a;
                border: 1px solid #303342;
                border-radius: 10px;
            }

            .ed-summary-card span {
                display: block;
                margin-bottom: 8px;
                color: #aaaab8;
                font-size: 12px;
            }

            .ed-summary-card strong {
                color: #f1d79b;
                font-size: 22px;
            }

            .ed-results {
                display: grid;
                grid-template-columns:
                    repeat(auto-fit, minmax(240px, 1fr));
                gap: 14px;
                margin-top: 18px;
            }

            .ed-card {
                padding: 17px;
                background: #10121a;
                border: 1px solid #303342;
                border-radius: 12px;
            }

            .ed-card h4 {
                margin: 0 0 14px;
                color: #f1d79b;
                line-height: 1.5;
            }

            .ed-info {
                color: #bcbcc8;
                font-size: 13px;
                line-height: 2;
            }

            .ed-needed {
                color: #f1d79b;
                font-weight: 800;
            }

            .ed-complete {
                color: #8cdbac;
                font-weight: 800;
            }

            @media (max-width: 600px) {
                #enemyDropsPanel {
                    margin: 20px 4%;
                    padding: 16px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function createPanel() {
        if (
            document.getElementById(
                "enemyDropsPanel"
            )
        ) {
            return;
        }

        const panel = document.createElement("section");

        panel.id = "enemyDropsPanel";

        panel.innerHTML = `
            <h2 class="ed-title">
                Enemy Drops Calculator
            </h2>

            <p class="ed-description">
                Calculate enemy materials required for your selected
                character ascension and talent targets.
                Your inventory will be deducted automatically.
            </p>

            <div
                id="edCharacter"
                class="ed-character"
            >
                Select a character in your Build Planner first.
            </div>

            <button
                id="edCalculateButton"
                class="ed-button"
                type="button"
            >
                Calculate Enemy Drops
            </button>

            <button
                id="edRefreshButton"
                class="ed-button"
                type="button"
            >
                Refresh Inventory
            </button>

            <div
                id="edMessage"
                class="ed-message"
                aria-live="polite"
            ></div>

            <div
                id="edSummary"
                class="ed-summary"
            ></div>

            <div
                id="edResults"
                class="ed-results"
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
            "edCalculateButton"
        ).addEventListener(
            "click",
            calculateEnemyDrops
        );

        document.getElementById(
            "edRefreshButton"
        ).addEventListener(
            "click",
            refreshInventory
        );

        document.getElementById(
            "edResults"
        ).addEventListener(
            "click",
            handleResultClick
        );

        syncCharacter();
    }

    function syncCharacter() {
        const character = getSelectedCharacter();

        const name = character?.name || "";

        const characterElement =
            document.getElementById("edCharacter");

        if (!characterElement) {
            return;
        }

        if (name !== activeCharacter) {
            activeCharacter = name;
            materials = [];

            document.getElementById(
                "edResults"
            ).innerHTML = "";

            document.getElementById(
                "edSummary"
            ).innerHTML = "";

            document.getElementById(
                "edMessage"
            ).textContent = "";
        }

        characterElement.textContent = name
            ? `Selected character: ${name}`
            : "Select a character in your Build Planner first.";
    }

    async function calculateEnemyDrops() {
        const version = ++calculationVersion;

        const character = getSelectedCharacter();

        const button =
            document.getElementById("edCalculateButton");

        const message =
            document.getElementById("edMessage");

        const results =
            document.getElementById("edResults");

        const summary =
            document.getElementById("edSummary");

        if (!character?.name) {
            message.textContent =
                "Select a character in your Build Planner first.";

            message.className = "ed-message ed-error";
            return;
        }

        const fromLevel = Number(
            document.getElementById("levelFrom")?.value
        );

        const toLevel = Number(
            document.getElementById("levelTo")?.value
        );

        if (
            !Number.isFinite(fromLevel) ||
            !Number.isFinite(toLevel) ||
            fromLevel < 1 ||
            toLevel > 90 ||
            toLevel < fromLevel
        ) {
            message.textContent =
                "Check your character level targets.";

            message.className = "ed-message ed-error";
            return;
        }

        const ranges = getTalentRanges();

        try {
            validateTalentRanges(ranges);
        } catch (error) {
            message.textContent = error.message;
            message.className = "ed-message ed-error";
            return;
        }

        const stages = getAscensionStages(
            fromLevel,
            toLevel
        );

        const hasTalentUpgrades = ranges.some(
            range => range.to > range.from
        );

        if (!stages.length && !hasTalentUpgrades) {
            message.textContent =
                "Your selected targets do not require any upgrades.";

            message.className = "ed-message ed-error";
            results.innerHTML = "";
            summary.innerHTML = "";
            return;
        }

        activeCharacter = character.name;

        button.disabled = true;
        button.textContent = "Calculating...";

        results.innerHTML = "";
        summary.innerHTML = "";

        message.textContent =
            `Calculating enemy drops for ${character.name}...`;

        message.className = "ed-message";

        try {
            const requests = [];

            if (stages.length) {
                requests.push(
                    fetchCharacterData(
                        CHARACTER_API,
                        character.name
                    )
                );
            } else {
                requests.push(Promise.resolve(null));
            }

            if (hasTalentUpgrades) {
                requests.push(
                    fetchCharacterData(
                        TALENT_API,
                        character.name
                    )
                );
            } else {
                requests.push(Promise.resolve(null));
            }

            const [
                characterData,
                talentData
            ] = await Promise.all(requests);

            if (version !== calculationVersion) {
                return;
            }

            const totals = new Map();

            if (characterData) {
                stages.forEach(stage => {
                    addMaterials(
                        totals,
                        characterData.costs[stage.key]
                    );
                });
            }

            if (talentData) {
                ranges.forEach(range => {
                    for (
                        let level = range.from + 1;
                        level <= range.to;
                        level++
                    ) {
                        addMaterials(
                            totals,
                            talentData.costs[`lvl${level}`]
                        );
                    }
                });
            }

            materials = Array.from(totals.values())
                .map(material => {
                    const owned = getOwned(material.name);

                    return {
                        ...material,
                        owned,
                        remaining: Math.max(
                            0,
                            material.quantity - owned
                        )
                    };
                })
                .sort((a, b) => {
                    if (
                        a.remaining === 0 &&
                        b.remaining > 0
                    ) {
                        return 1;
                    }

                    if (
                        b.remaining === 0 &&
                        a.remaining > 0
                    ) {
                        return -1;
                    }

                    return a.name.localeCompare(b.name);
                });

            if (!materials.length) {
                message.textContent =
                    "No recognized enemy-drop materials were found for these targets.";

                message.className = "ed-message";
                return;
            }

            renderResults();

            const totalRequired = materials.reduce(
                (sum, item) => sum + item.quantity,
                0
            );

            const totalOwned = materials.reduce(
                (sum, item) => sum + item.owned,
                0
            );

            const totalRemaining = materials.reduce(
                (sum, item) => sum + item.remaining,
                0
            );

            summary.innerHTML = `
                <div class="ed-summary-card">
                    <span>Total required</span>
                    <strong>${totalRequired.toLocaleString()}</strong>
                </div>

                <div class="ed-summary-card">
                    <span>Already owned</span>
                    <strong>${totalOwned.toLocaleString()}</strong>
                </div>

                <div class="ed-summary-card">
                    <span>Still needed</span>
                    <strong>${totalRemaining.toLocaleString()}</strong>
                </div>
            `;

            message.textContent =
                `Enemy drops calculated for ${character.name}.`;

            message.className = "ed-message ed-success";
        } catch (error) {
            console.error(
                "Enemy drops calculation failed:",
                error
            );

            if (version === calculationVersion) {
                message.textContent =
                    error.message ||
                    "Could not calculate enemy drops. Check your internet connection.";

                message.className = "ed-message ed-error";
            }
        } finally {
            if (version === calculationVersion) {
                button.disabled = false;
                button.textContent = "Calculate Enemy Drops";
            }
        }
    }

    function renderResults() {
        const results =
            document.getElementById("edResults");

        results.innerHTML = materials.map(
            (material, index) => {
                const complete =
                    material.remaining === 0;

                return `
                    <article class="ed-card">
                        <h4>
                            ${escapeHTML(material.name)}
                        </h4>

                        <div class="ed-info">
                            Required:
                            ${material.quantity.toLocaleString()}<br>

                            Owned:
                            ${material.owned.toLocaleString()}<br>

                            <span class="${
                                complete
                                    ? "ed-complete"
                                    : "ed-needed"
                            }">
                                ${
                                    complete
                                        ? "Inventory sufficient ✓"
                                        : `Still needed: ${material.remaining.toLocaleString()}`
                                }
                            </span>
                        </div>

                        <br>

                        <button
                            class="ed-button"
                            type="button"
                            data-ed-add="${index}"
                            ${complete ? "disabled" : ""}
                        >
                            ${
                                complete
                                    ? "Already Have Enough"
                                    : "Add to Farming Schedule"
                            }
                        </button>
                    </article>
                `;
            }
        ).join("");
    }

    function refreshInventory() {
        materials = materials.map(material => {
            const owned = getOwned(material.name);

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

        const summary =
            document.getElementById("edSummary");

        const totalRequired = materials.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        const totalOwned = materials.reduce(
            (sum, item) => sum + item.owned,
            0
        );

        const totalRemaining = materials.reduce(
            (sum, item) => sum + item.remaining,
            0
        );

        summary.innerHTML = materials.length
            ? `
                <div class="ed-summary-card">
                    <span>Total required</span>
                    <strong>${totalRequired.toLocaleString()}</strong>
                </div>

                <div class="ed-summary-card">
                    <span>Already owned</span>
                    <strong>${totalOwned.toLocaleString()}</strong>
                </div>

                <div class="ed-summary-card">
                    <span>Still needed</span>
                    <strong>${totalRemaining.toLocaleString()}</strong>
                </div>
            `
            : "";

        const message =
            document.getElementById("edMessage");

        message.textContent =
            "Inventory refreshed.";

        message.className = "ed-message ed-success";
    }

    function handleResultClick(event) {
        const button = event.target.closest(
            "[data-ed-add]"
        );

        if (!button) {
            return;
        }

        const index = Number(button.dataset.edAdd);
        const material = materials[index];

        if (!material) {
            return;
        }

        const selected = getSelectedCharacter();

        if (
            !selected ||
            normalizeName(selected.name) !==
                normalizeName(activeCharacter)
        ) {
            alert(
                "Your selected character changed. Recalculate enemy drops first."
            );

            return;
        }

        const remaining = Math.max(
            0,
            material.quantity - getOwned(material.name)
        );

        if (remaining === 0) {
            alert("You already have enough of this material.");
            refreshInventory();
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
                "Could not find the Farming Schedule form."
            );

            return;
        }

        category.value = "other";
        name.value = material.name;
        quantity.value = remaining;
        day.value = "Monday";

        notes.value =
            `Enemy drops for ${activeCharacter}. ` +
            `Total required: ${material.quantity}. ` +
            `Owned: ${getOwned(material.name)}. ` +
            `Remaining: ${remaining}.`;

        category.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        form.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        name.focus();

        const message =
            document.getElementById("edMessage");

        message.textContent =
            `${remaining} ${material.name} added to the Farming Schedule form. Review the task and click Add Task to save it.`;

        message.className = "ed-message ed-success";
    }

    function init() {
        addStyles();
        createPanel();

        setInterval(() => {
            syncCharacter();
        }, 500);

        document.addEventListener(
            "change",
            event => {
                if (
                    [
                        "levelFrom",
                        "levelTo",
                        "normalAttackFrom",
                        "normalAttackTo",
                        "skillFrom",
                        "skillTo",
                        "burstFrom",
                        "burstTo"
                    ].includes(event.target.id)
                ) {
                    syncCharacter();
                }
            }
        );
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