(() => {
    "use strict";

    const INVENTORY_STORAGE_KEY = "genshinBuildPlannerInventory";
    const CATEGORY_ORDER = [
        "Character Ascension",
        "Talent Upgrades",
        "Boss Materials",
        "Local Specialties",
        "Enemy Drops"
    ];

    let requirementResults = [];
    let accountSummary = createEmptySummary();
    let refreshToken = 0;
    let isCalculating = false;
    const ascensionCache = new Map();
    const talentCache = new Map();

    function createEmptySummary() {
        return {
            missingTypes: 0,
            missingQuantity: 0,
            moraRequired: 0,
            moraOwned: 0,
            moraShortage: 0,
            buildsOutstanding: 0,
            mostNeeded: [],
            materials: [],
            results: []
        };
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

    function formatNumber(value) {
        return Number(value || 0).toLocaleString("en-IN");
    }

    function materialKey(material) {
        return material.id != null
            ? String(material.id)
            : String(material.name || "").trim().toLowerCase();
    }

    function inventoryKey(name) {
        if (typeof window.inventoryKey === "function") {
            return window.inventoryKey(name);
        }

        return String(name)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
    }

    function getInventorySnapshot() {
        if (typeof getInventoryStorage === "function") {
            return getInventoryStorage() || {};
        }

        try {
            const saved = localStorage.getItem(INVENTORY_STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            return parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
                ? parsed
                : {};
        } catch (error) {
            console.error("Unable to read material requirements inventory:", error);
            return {};
        }
    }

    function getOwnedAmount(name, inventory) {
        const key = inventoryKey(name);
        const raw = inventory[key];
        const amount = Number(raw);

        return {
            amount: Number.isFinite(amount) && amount >= 0
                ? Math.floor(amount)
                : 0,
            tracked: Object.prototype.hasOwnProperty.call(inventory, key)
        };
    }

    function classifyAscensionMaterial(material) {
        const id = Number(material.id);
        const name = String(material.name || "").toLowerCase();

        if (id === 202 || name === "mora") {
            return "Mora";
        }

        if (id >= 101000 && id < 102000) {
            return "Local Specialties";
        }

        if (id >= 112000 && id < 113000) {
            return "Enemy Drops";
        }

        if (id >= 113000 && id < 114000) {
            return "Boss Materials";
        }

        return "Character Ascension";
    }

    function classifyTalentMaterial(material) {
        const id = Number(material.id);
        const name = String(material.name || "").toLowerCase();

        if (id === 202 || name === "mora") {
            return "Mora";
        }

        if (id >= 112000 && id < 113000) {
            return "Enemy Drops";
        }

        if (id >= 113000 && id < 114000) {
            return "Boss Materials";
        }

        return "Talent Upgrades";
    }

    function getCharacterLevel(character) {
        try {
            const saved = JSON.parse(
                localStorage.getItem(
                    "genshinBuildPlannerCharacterOwnership"
                ) || "{}"
            );
            const level = Number(saved?.[character.id]?.level);
            return saved?.[character.id]?.owned === true &&
                Number.isInteger(level) &&
                level >= 1 &&
                level <= 90
                ? level
                : 1;
        } catch (error) {
            console.error("Unable to read character level:", error);
            return 1;
        }
    }

    function getAscensionData(character) {
        if (!ascensionCache.has(character.id)) {
            ascensionCache.set(
                character.id,
                fetchAscensionCharacterData(character.name)
            );
        }
        return ascensionCache.get(character.id);
    }

    function getTalentData(character) {
        if (!talentCache.has(character.id)) {
            talentCache.set(
                character.id,
                fetchTalentData(character.id, character.name)
            );
        }
        return talentCache.get(character.id);
    }

    function addMaterial(materials, material, category, entry) {
        if (!material || !material.name) {
            return;
        }

        const required = Number(material.count);
        if (!Number.isFinite(required) || required <= 0) {
            return;
        }

        const key = materialKey(material);
        const existing = materials.get(key);

        if (existing) {
            existing.required += required;
            existing.categories.add(category);
            existing.sources.push(entry);
            return;
        }

        materials.set(key, {
            id: material.id,
            key,
            name: material.name,
            required,
            categories: new Set([category]),
            sources: [entry]
        });
    }

    function materialMapToArray(materials, inventory) {
        return [...materials.values()]
            .filter(material => material.name.toLowerCase() !== "mora")
            .map(material => {
                const owned = getOwnedAmount(material.name, inventory);
                const missing = Math.max(material.required - owned.amount, 0);
                const excess = Math.max(owned.amount - material.required, 0);
                return {
                    ...material,
                    categories: [...material.categories],
                    owned: owned.amount,
                    tracked: owned.tracked,
                    missing,
                    excess,
                    sources: material.sources
                };
            });
    }

    async function calculateBuildRequirements(entry, token) {
        const { character, build } = entry;
        const inventory = getInventorySnapshot();
        const materialMap = new Map();
        const unavailable = [];
        const notes = [];
        const currentLevel = getCharacterLevel(character);
        const targetLevel = Number(build.targets.characterLevel);
        const buildSource = {
            characterId: character.id,
            characterName: character.name,
            buildId: build.id,
            buildName: build.name
        };
        let moraRequired = 0;

        if (targetLevel > currentLevel) {
            try {
                const data = await getAscensionData(character);
                if (token !== refreshToken) {
                    return null;
                }

                const stages = getRequiredAscensionStages(
                    currentLevel,
                    targetLevel
                );
                const totals = sumAscensionMaterials(stages, data.costs);

                totals.forEach(material => {
                    const category = classifyAscensionMaterial(material);
                    if (category === "Mora") {
                        moraRequired += Number(material.count) || 0;
                    } else {
                        addMaterial(
                            materialMap,
                            material,
                            category,
                            buildSource
                        );
                    }
                });
            } catch (error) {
                unavailable.push(
                    `Character ascension: ${error.message || "data unavailable"}`
                );
            }
        }

        const talentTargets = [
            ["Normal Attack", Number(build.targets.normalAttack)],
            ["Elemental Skill", Number(build.targets.skill)],
            ["Elemental Burst", Number(build.targets.burst)]
        ];
        const ranges = talentTargets.map(([name, to]) => ({
            name,
            from: 1,
            to
        }));
        const hasTalentUpgrade = ranges.some(range => range.to > range.from);

        if (hasTalentUpgrade) {
            notes.push("Talent requirements are estimated from level 1 because current talent levels are not stored.");

            try {
                const data = await getTalentData(character);
                if (token !== refreshToken) {
                    return null;
                }

                const totals = calculateCombinedTalentMaterials(data, ranges);
                totals.forEach(material => {
                    const category = classifyTalentMaterial(material);
                    if (category === "Mora") {
                        moraRequired += Number(material.count) || 0;
                    } else {
                        addMaterial(
                            materialMap,
                            material,
                            category,
                            buildSource
                        );
                    }
                });
            } catch (error) {
                unavailable.push(
                    `Talent upgrades: ${error.message || "data unavailable"}`
                );
            }
        }

        const materials = materialMapToArray(materialMap, inventory);
        const ownedMora = getOwnedAmount("Mora", inventory);
        const moraMissing = Math.max(moraRequired - ownedMora.amount, 0);
        const missingQuantity = materials.reduce(
            (total, material) => total + material.missing,
            0
        );

        return {
            ...buildSource,
            character,
            build,
            currentLevel,
            targetLevel,
            materials,
            unavailable,
            notes,
            moraRequired,
            moraOwned: ownedMora.amount,
            moraTracked: ownedMora.tracked,
            moraMissing,
            missingQuantity,
            outstanding: missingQuantity > 0 || moraMissing > 0
        };
    }

    function buildCombinedMaterials(results, inventory) {
        const combined = new Map();

        results.forEach(result => {
            result.materials.forEach(material => {
                const existing = combined.get(material.key);
                if (existing) {
                    existing.required += material.required;
                    existing.categories = [
                        ...new Set([
                            ...existing.categories,
                            ...material.categories
                        ])
                    ];
                    existing.sources.push(...material.sources);
                } else {
                    combined.set(material.key, {
                        ...material,
                        categories: [...material.categories],
                        sources: [...material.sources]
                    });
                }
            });
        });

        return [...combined.values()].map(material => {
            const owned = getOwnedAmount(material.name, inventory);
            return {
                ...material,
                owned: owned.amount,
                tracked: owned.tracked,
                missing: Math.max(material.required - owned.amount, 0),
                excess: Math.max(owned.amount - material.required, 0),
                sources: [
                    ...new Map(
                        material.sources.map(source => [
                            `${source.characterId}:${source.buildId}`,
                            source
                        ])
                    ).values()
                ]
            };
        });
    }

    function updateSummary(results) {
        const inventory = getInventorySnapshot();
        const materials = buildCombinedMaterials(results, inventory);
        const mostNeeded = materials
            .filter(material => material.missing > 0)
            .sort((a, b) => b.missing - a.missing)
            .slice(0, 3);
        const moraRequired = results.reduce(
            (total, result) => total + result.moraRequired,
            0
        );
        const moraOwned = getOwnedAmount("Mora", inventory).amount;

        accountSummary = {
            missingTypes: materials.filter(material => material.missing > 0).length,
            missingQuantity: materials.reduce(
                (total, material) => total + material.missing,
                0
            ),
            moraRequired,
            moraOwned,
            moraShortage: Math.max(moraRequired - moraOwned, 0),
            buildsOutstanding: results.filter(result => result.outstanding).length,
            mostNeeded,
            materials,
            results
        };
    }

    function getStatus(material) {
        if (material.missing === 0) {
            return material.excess > 0 ? "Excess" : "Complete";
        }
        return "Missing";
    }

    function renderMaterialTable(materials, compact = false) {
        if (!materials.length) {
            return `
                <div class="materials-empty">
                    <strong>No material requirements available.</strong>
                    <span>Create a saved build with upgrade targets to calculate requirements.</span>
                </div>
            `;
        }

        return `
            <div class="materials-table-scroll">
                <table class="materials-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Category</th>
                            <th>Required</th>
                            <th>Owned</th>
                            <th>Missing</th>
                            <th>Excess</th>
                            ${compact ? "" : "<th>Used by</th>"}
                        </tr>
                    </thead>
                    <tbody>
                        ${materials.map(material => `
                            <tr class="materials-row-${getStatus(material).toLowerCase()}">
                                <td>
                                    <span class="material-name-cell">
                                        <span class="material-icon">◆</span>
                                        <strong>${escapeHTML(material.name)}</strong>
                                    </span>
                                </td>
                                <td>${escapeHTML(material.categories.join(" • "))}</td>
                                <td>${formatNumber(material.required)}</td>
                                <td>${formatNumber(material.owned)}</td>
                                <td class="materials-missing-cell">${formatNumber(material.missing)}</td>
                                <td>${formatNumber(material.excess)}</td>
                                ${compact ? "" : `
                                    <td>
                                        <span class="material-source-list">
                                            ${material.sources.map(source =>
                                                `${escapeHTML(source.characterName)} · ${escapeHTML(source.buildName)}`
                                            ).join("<br>")}
                                        </span>
                                    </td>
                                `}
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderBuildResult(result) {
        const categoryGroups = CATEGORY_ORDER.map(category => ({
            category,
            materials: result.materials.filter(material =>
                material.categories.includes(category)
            )
        })).filter(group => group.materials.length);

        return `
            <article class="build-material-card">
                <div class="build-material-card-heading">
                    <div>
                        <p class="target-label">${escapeHTML(result.characterName)}</p>
                        <h3>${escapeHTML(result.buildName)}</h3>
                    </div>
                    <span class="build-status ${result.outstanding ? "build-status-in-progress" : "build-status-completed"}">
                        ${result.outstanding ? "Needs Materials" : "Complete"}
                    </span>
                </div>
                <div class="build-material-mora">
                    <span>Mora required</span>
                    <strong>${formatNumber(result.moraRequired)}</strong>
                    <small>${formatNumber(result.moraOwned)} owned · ${formatNumber(result.moraMissing)} missing</small>
                </div>
                ${result.notes.length
                    ? `<p class="materials-estimate-note">${result.notes.map(escapeHTML).join(" ")}</p>`
                    : ""}
                ${result.unavailable.length
                    ? `<div class="materials-unavailable"><strong>Unavailable data</strong><span>${result.unavailable.map(escapeHTML).join(" ")}</span></div>`
                    : ""}
                ${categoryGroups.length
                    ? categoryGroups.map(group => `
                        <div class="build-material-category">
                            <h4>${escapeHTML(group.category)}</h4>
                            ${renderMaterialTable(group.materials, true)}
                        </div>
                    `).join("")
                    : `<div class="materials-empty"><strong>No calculated material requirements.</strong></div>`}
            </article>
        `;
    }

    function render() {
        const status = document.getElementById("materialsStatus");
        const combined = document.getElementById("combinedMaterialsContent");
        const buildContent = document.getElementById("buildMaterialsContent");
        const mostNeeded = document.getElementById("materialsMostNeeded");

        if (!status || !combined || !buildContent) {
            return;
        }

        status.textContent = isCalculating
            ? "Calculating saved build requirements..."
            : requirementResults.length
                ? `${requirementResults.length} saved build${requirementResults.length === 1 ? "" : "s"} analyzed.`
                : "Waiting for saved builds.";
        combined.innerHTML = renderMaterialTable(accountSummary.materials);
        buildContent.innerHTML = requirementResults.length
            ? requirementResults.map(renderBuildResult).join("")
            : `<div class="materials-empty"><strong>No saved build requirements yet.</strong><span>Use Build Library to create a build for an owned character.</span></div>`;
        mostNeeded.textContent = accountSummary.mostNeeded.length
            ? `Most needed: ${accountSummary.mostNeeded.map(material => `${material.name} ×${formatNumber(material.missing)}`).join(", ")}`
            : "No missing materials";

        document.getElementById("materialsMissingTypes").textContent =
            formatNumber(accountSummary.missingTypes);
        document.getElementById("materialsMissingQuantity").textContent =
            formatNumber(accountSummary.missingQuantity);
        document.getElementById("materialsMoraShortage").textContent =
            formatNumber(accountSummary.moraShortage);
        document.getElementById("materialsBuildsOutstanding").textContent =
            formatNumber(accountSummary.buildsOutstanding);

        window.dispatchEvent(new CustomEvent("materialRequirementsChanged"));
    }

    async function refreshRequirements() {
        const token = ++refreshToken;
        isCalculating = true;
        render();

        const entries =
            window.genshinBuilds &&
            typeof window.genshinBuilds.getUpgradeEntries === "function"
                ? window.genshinBuilds.getUpgradeEntries()
                : [];
        const results = [];

        const calculated = await Promise.all(
            entries.map(entry => calculateBuildRequirements(entry, token))
        );

        if (token !== refreshToken) {
            return;
        }

        calculated.filter(Boolean).forEach(result => results.push(result));
        requirementResults = results;
        updateSummary(results);
        isCalculating = false;
        render();
    }

    function initialize() {
        document.getElementById("refreshMaterialsButton")
            ?.addEventListener("click", refreshRequirements);

        window.addEventListener("buildsChanged", refreshRequirements);
        window.addEventListener(
            "characterOwnershipChanged",
            refreshRequirements
        );
        window.addEventListener("inventoryChanged", () => {
            updateSummary(requirementResults);
            render();
        });

        window.genshinMaterials = {
            getSummary() {
                return accountSummary;
            },
            refresh: refreshRequirements
        };

        refreshRequirements();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
