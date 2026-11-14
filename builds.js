(() => {
    "use strict";

    const STORAGE_KEY = "genshinBuildPlannerBuilds";
    const OWNERSHIP_KEY = "genshinBuildPlannerCharacterOwnership";
    const ARTIFACT_SLOTS = [
        ["flower", "Flower of Life"],
        ["plume", "Plume of Death"],
        ["sands", "Sands of Eon"],
        ["goblet", "Goblet of Eonothem"],
        ["circlet", "Circlet of Logos"]
    ];

    const characterPicker =
        document.getElementById("buildCharacterPicker");
    const workspace =
        document.getElementById("buildWorkspace");
    const workspaceEmpty =
        document.getElementById("buildWorkspaceEmpty");
    const buildList =
        document.getElementById("buildList");
    const buildEditor =
        document.getElementById("buildEditor");
    const artifactEditorGrid =
        document.getElementById("artifactEditorGrid");

    let ownership = readOwnership();
    let builds = readBuilds();
    let activeCharacter = null;
    let activeBuildId = null;

    function readJSON(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.error(`Unable to read build storage: ${key}`, error);
            return fallback;
        }
    }

    function readOwnership() {
        const value = readJSON(OWNERSHIP_KEY, {});
        return value &&
            typeof value === "object" &&
            !Array.isArray(value)
            ? value
            : {};
    }

    function createBuildId() {
        return `build-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function createEmptyArtifact() {
        return {
            setName: "",
            mainStat: "",
            substats: "",
            level: 0
        };
    }

    function createDefaultBuild(character) {
        const currentLevel = getCurrentCharacterLevel(character);
        const artifacts = {};

        ARTIFACT_SLOTS.forEach(([key]) => {
            artifacts[key] = createEmptyArtifact();
        });

        return {
            id: createBuildId(),
            characterId: character.id,
            name: `${character.name} Build`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            targets: {
                characterLevel: currentLevel,
                normalAttack: 1,
                skill: 1,
                burst: 1
            },
            weapon: {
                name: "",
                type: character.weapon,
                rarity: "",
                level: 1,
                refinement: 1
            },
            artifacts
        };
    }

    function normalizeNumber(value, min, max, fallback) {
        const number = Number(value);
        return Number.isInteger(number) && number >= min && number <= max
            ? number
            : fallback;
    }

    function normalizeBuild(build, character) {
        if (!build || typeof build !== "object") {
            return null;
        }

        const defaults = createDefaultBuild(character);
        const sourceTargets = build.targets || {};
        const sourceWeapon = build.weapon || {};
        const sourceArtifacts = build.artifacts || {};
        const artifacts = {};

        ARTIFACT_SLOTS.forEach(([key]) => {
            const source = sourceArtifacts[key] || {};
            artifacts[key] = {
                setName: String(source.setName || "").slice(0, 100),
                mainStat: String(source.mainStat || "").slice(0, 100),
                substats: String(source.substats || "").slice(0, 300),
                level: normalizeNumber(source.level, 0, 20, 0)
            };
        });

        return {
            id: typeof build.id === "string" && build.id
                ? build.id
                : defaults.id,
            characterId: character.id,
            name: String(build.name || defaults.name).trim().slice(0, 80) ||
                defaults.name,
            createdAt: build.createdAt || defaults.createdAt,
            updatedAt: build.updatedAt || defaults.updatedAt,
            targets: {
                characterLevel: normalizeNumber(
                    sourceTargets.characterLevel,
                    1,
                    90,
                    defaults.targets.characterLevel
                ),
                normalAttack: normalizeNumber(
                    sourceTargets.normalAttack,
                    1,
                    10,
                    1
                ),
                skill: normalizeNumber(sourceTargets.skill, 1, 10, 1),
                burst: normalizeNumber(sourceTargets.burst, 1, 10, 1)
            },
            weapon: {
                name: String(sourceWeapon.name || "").slice(0, 100),
                type: character.weapon,
                rarity: ["", "1", "2", "3", "4", "5"].includes(
                    String(sourceWeapon.rarity || "")
                )
                    ? String(sourceWeapon.rarity || "")
                    : "",
                level: normalizeNumber(sourceWeapon.level, 1, 90, 1),
                refinement: normalizeNumber(
                    sourceWeapon.refinement,
                    1,
                    5,
                    1
                )
            },
            artifacts
        };
    }

    function readBuilds() {
        const value = readJSON(STORAGE_KEY, {});

        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return {};
        }

        const normalized = {};
        Object.entries(value).forEach(([characterId, characterBuilds]) => {
            const character = characters.find(item => item.id === characterId);

            if (!character || !Array.isArray(characterBuilds)) {
                return;
            }

            normalized[characterId] = characterBuilds
                .map(build => normalizeBuild(build, character))
                .filter(Boolean);
        });

        return normalized;
    }

    function persistBuilds() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(builds));
        } catch (error) {
            console.error("Unable to save character builds:", error);
            showValidation("Unable to save this build. Check browser storage.");
            return false;
        }

        window.dispatchEvent(new CustomEvent("buildsChanged"));
        return true;
    }

    function getCurrentCharacterLevel(character) {
        const saved = ownership[character.id];
        return saved && saved.owned === true
            ? normalizeNumber(saved.level, 1, 90, 1)
            : 1;
    }

    function getCharacterBuilds(characterId) {
        return Array.isArray(builds[characterId])
            ? builds[characterId]
            : [];
    }

    function getActiveBuild() {
        return activeCharacter && activeBuildId
            ? getCharacterBuilds(activeCharacter.id)
                .find(build => build.id === activeBuildId) || null
            : null;
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

    function clampPercent(value) {
        return Math.max(0, Math.min(100, Math.round(value)));
    }

    function getBuildProgress(build, character) {
        const currentLevel = getCurrentCharacterLevel(character);
        const targets = build.targets;
        const parts = [];
        const notes = [];

        parts.push({
            achieved: currentLevel >= targets.characterLevel,
            configured: targets.characterLevel > currentLevel
        });

        [
            ["Normal Attack", targets.normalAttack],
            ["Elemental Skill", targets.skill],
            ["Elemental Burst", targets.burst]
        ].forEach(([label, target]) => {
            if (target > 1) {
                parts.push({ achieved: false, configured: true });
                notes.push(`${label} current level is not tracked`);
            }
        });

        if (build.weapon.name.trim()) {
            parts.push({ achieved: false, configured: true });
            notes.push("Weapon ownership progress is not tracked");
        }

        ARTIFACT_SLOTS.forEach(([key, label]) => {
            const artifact = build.artifacts[key];
            const configured = artifact.setName ||
                artifact.mainStat ||
                artifact.substats ||
                artifact.level > 0;

            if (configured) {
                parts.push({ achieved: false, configured: true });
                notes.push(`${label} ownership progress is not tracked`);
            }
        });

        const hasConfiguration = parts.some(part => part.configured);
        const progress = !hasConfiguration
            ? 0
            : parts.length === 0
                ? 0
                : clampPercent(
                    parts.filter(part => part.achieved).length / parts.length * 100
                );
        const completed = hasConfiguration &&
            parts.every(part => part.achieved);

        return {
            percent: progress,
            status: !hasConfiguration
                ? "Not Started"
                : completed
                    ? "Completed"
                    : "In Progress",
            note: completed
                ? "Saved targets are currently met."
                : notes.length
                    ? notes.slice(0, 2).join("; ") + "."
                    : `Current character level: ${currentLevel}/${targets.characterLevel}.`
        };
    }

    function renderArtifactInputs(artifacts) {
        artifactEditorGrid.innerHTML = ARTIFACT_SLOTS.map(([key, label]) => {
            const artifact = artifacts[key] || createEmptyArtifact();
            return `
                <fieldset class="artifact-editor-card">
                    <legend>${escapeHTML(label)}</legend>
                    <label>
                        <span>Set name</span>
                        <input data-artifact-field="setName" data-artifact-slot="${key}"
                            type="text" maxlength="100" value="${escapeHTML(artifact.setName)}"
                            placeholder="Optional target set">
                    </label>
                    <label>
                        <span>Main stat</span>
                        <input data-artifact-field="mainStat" data-artifact-slot="${key}"
                            type="text" maxlength="100" value="${escapeHTML(artifact.mainStat)}"
                            placeholder="Optional main stat">
                    </label>
                    <label>
                        <span>Substats</span>
                        <textarea data-artifact-field="substats" data-artifact-slot="${key}"
                            maxlength="300" rows="2" placeholder="Comma-separated targets">${escapeHTML(artifact.substats)}</textarea>
                    </label>
                    <label>
                        <span>Level</span>
                        <input data-artifact-field="level" data-artifact-slot="${key}"
                            type="number" min="0" max="20" step="1" value="${artifact.level}">
                    </label>
                </fieldset>
            `;
        }).join("");
    }

    function populateWeaponType(character) {
        const select = document.getElementById("buildWeaponType");
        select.innerHTML = `<option value="${escapeHTML(character.weapon)}">${escapeHTML(character.weapon)}</option>`;
    }

    function renderBuildEditor(build) {
        const character = activeCharacter;
        const progress = getBuildProgress(build, character);

        document.getElementById("buildEditorTitle").textContent = build.name;
        document.getElementById("buildNameInput").value = build.name;
        document.getElementById("buildTargetLevel").value =
            build.targets.characterLevel;
        document.getElementById("buildTargetNormal").value =
            build.targets.normalAttack;
        document.getElementById("buildTargetSkill").value =
            build.targets.skill;
        document.getElementById("buildTargetBurst").value =
            build.targets.burst;
        document.getElementById("buildWeaponName").value = build.weapon.name;
        document.getElementById("buildWeaponRarity").value = build.weapon.rarity;
        document.getElementById("buildWeaponLevel").value = build.weapon.level;
        document.getElementById("buildWeaponRefinement").value =
            String(build.weapon.refinement);
        populateWeaponType(character);
        renderArtifactInputs(build.artifacts);
        attachArtifactLevelIds();

        document.getElementById("buildProgressValue").textContent =
            `${progress.percent}%`;
        document.getElementById("buildProgressStatus").textContent =
            progress.status;
        document.getElementById("buildProgressStatus").className =
            `build-status build-status-${progress.status.toLowerCase().replace(" ", "-")}`;
        document.getElementById("buildProgressBar").style.width =
            `${progress.percent}%`;
        document.getElementById("buildProgressNote").textContent = progress.note;
        buildEditor.classList.add("show");
        clearValidation();
    }

    function renderBuildList() {
        if (!activeCharacter) {
            buildList.innerHTML = "";
            return;
        }

        const characterBuilds = getCharacterBuilds(activeCharacter.id);

        if (!characterBuilds.length) {
            buildList.innerHTML = `
                <div class="build-list-empty">
                    <strong>No saved builds for ${escapeHTML(activeCharacter.name)}</strong>
                    <span>Create a named build to start tracking targets.</span>
                </div>
            `;
            buildEditor.classList.remove("show");
            return;
        }

        buildList.innerHTML = characterBuilds.map(build => {
            const progress = getBuildProgress(build, activeCharacter);
            return `
                <button class="saved-build-card ${build.id === activeBuildId ? "active" : ""}"
                    type="button" data-build-id="${escapeHTML(build.id)}">
                    <span class="saved-build-card-heading">
                        <strong>${escapeHTML(build.name)}</strong>
                        <span class="build-status build-status-${progress.status.toLowerCase().replace(" ", "-")}">${progress.status}</span>
                    </span>
                    <span class="saved-build-card-progress">
                        <span><i style="width:${progress.percent}%"></i></span>
                        <small>${progress.percent}% target progress</small>
                    </span>
                </button>
            `;
        }).join("");

        buildList.querySelectorAll("[data-build-id]").forEach(button => {
            button.addEventListener("click", () => {
                activeBuildId = button.dataset.buildId;
                renderBuildList();
                const build = getActiveBuild();
                if (build) {
                    renderBuildEditor(build);
                }
            });
        });
    }

    function renderWorkspace() {
        if (!activeCharacter) {
            workspace.classList.remove("show");
            workspaceEmpty.classList.remove("hidden");
            return;
        }

        workspaceEmpty.classList.add("hidden");
        workspace.classList.add("show");
        document.getElementById("buildManagerCharacterIcon").innerHTML = `
            <img src="${escapeHTML(activeCharacter.image)}" alt="${escapeHTML(activeCharacter.name)}">
        `;
        document.getElementById("buildManagerCharacterName").textContent =
            activeCharacter.name;
        document.getElementById("buildManagerCharacterDetails").textContent =
            `${activeCharacter.element} • ${activeCharacter.weapon}`;
        renderBuildList();

        const build = getActiveBuild();
        if (build) {
            renderBuildEditor(build);
        }
    }

    function renderCharacterPicker() {
        ownership = readOwnership();
        const sortedCharacters = [...characters].sort((a, b) => {
            const ownedA = ownership[a.id]?.owned === true ? 0 : 1;
            const ownedB = ownership[b.id]?.owned === true ? 0 : 1;
            return ownedA - ownedB || a.name.localeCompare(b.name);
        });

        characterPicker.innerHTML = sortedCharacters.map(character => {
            const owned = ownership[character.id]?.owned === true;
            const count = getCharacterBuilds(character.id).length;
            return `
                <button class="build-character-choice ${activeCharacter?.id === character.id ? "active" : ""} ${owned ? "owned" : "unowned"}"
                    type="button" data-character-id="${escapeHTML(character.id)}" ${owned ? "" : "disabled"}>
                    <span class="build-choice-portrait">
                        <img src="${escapeHTML(character.image)}" alt="">
                    </span>
                    <span class="build-choice-copy">
                        <strong>${escapeHTML(character.name)}</strong>
                        <small>${owned ? `${count} saved build${count === 1 ? "" : "s"}` : "Not owned"}</small>
                    </span>
                    <span class="build-choice-mark">${owned ? "✓" : "—"}</span>
                </button>
            `;
        }).join("");

        characterPicker.querySelectorAll("[data-character-id]").forEach(button => {
            button.addEventListener("click", () => {
                const character = characters.find(
                    item => item.id === button.dataset.characterId
                );
                if (!character || ownership[character.id]?.owned !== true) {
                    return;
                }
                activeCharacter = character;
                const saved = getCharacterBuilds(character.id);
                activeBuildId = saved[0]?.id || null;
                renderCharacterPicker();
                renderWorkspace();
            });
        });
    }

    function showValidation(message) {
        const element = document.getElementById("buildValidationMessage");
        element.textContent = message;
        element.classList.add("show");
    }

    function clearValidation() {
        const element = document.getElementById("buildValidationMessage");
        element.textContent = "";
        element.classList.remove("show");
    }

    function readInteger(id, min, max, label) {
        const value = Number(document.getElementById(id).value);
        if (!Number.isInteger(value) || value < min || value > max) {
            throw new Error(`${label} must be between ${min} and ${max}.`);
        }
        return value;
    }

    function readBuildFromEditor(existing) {
        const name = document.getElementById("buildNameInput").value.trim();
        if (!name || name.length > 80) {
            throw new Error("Enter a build name up to 80 characters.");
        }

        const artifacts = {};
        ARTIFACT_SLOTS.forEach(([key]) => {
            const read = field => document.querySelector(
                `[data-artifact-slot="${key}"][data-artifact-field="${field}"]`
            ).value.trim();
            artifacts[key] = {
                setName: read("setName").slice(0, 100),
                mainStat: read("mainStat").slice(0, 100),
                substats: read("substats").slice(0, 300),
                level: readInteger(
                    `artifact-level-${key}`,
                    0,
                    20,
                    `${key} artifact level`
                )
            };
        });

        return normalizeBuild({
            ...existing,
            name,
            targets: {
                characterLevel: readInteger(
                    "buildTargetLevel",
                    1,
                    90,
                    "Character level"
                ),
                normalAttack: readInteger(
                    "buildTargetNormal",
                    1,
                    10,
                    "Normal Attack level"
                ),
                skill: readInteger(
                    "buildTargetSkill",
                    1,
                    10,
                    "Elemental Skill level"
                ),
                burst: readInteger(
                    "buildTargetBurst",
                    1,
                    10,
                    "Elemental Burst level"
                )
            },
            weapon: {
                name: document.getElementById("buildWeaponName").value.trim(),
                type: activeCharacter.weapon,
                rarity: document.getElementById("buildWeaponRarity").value,
                level: readInteger("buildWeaponLevel", 1, 90, "Weapon level"),
                refinement: readInteger(
                    "buildWeaponRefinement",
                    1,
                    5,
                    "Weapon refinement"
                )
            },
            artifacts,
            updatedAt: new Date().toISOString()
        }, activeCharacter);
    }

    function attachArtifactLevelIds() {
        ARTIFACT_SLOTS.forEach(([key]) => {
            const input = document.querySelector(
                `[data-artifact-slot="${key}"][data-artifact-field="level"]`
            );
            if (input) {
                input.id = `artifact-level-${key}`;
            }
        });
    }

    function loadBuildIntoCalculator(build) {
        if (!activeCharacter || typeof selectCharacter !== "function") {
            return;
        }

        selectCharacter(activeCharacter);
        document.getElementById("levelFrom").value =
            getCurrentCharacterLevel(activeCharacter);
        document.getElementById("levelTo").value =
            build.targets.characterLevel;
        document.getElementById("normalAttackFrom").value = 1;
        document.getElementById("normalAttackTo").value =
            build.targets.normalAttack;
        document.getElementById("skillFrom").value = 1;
        document.getElementById("skillTo").value = build.targets.skill;
        document.getElementById("burstFrom").value = 1;
        document.getElementById("burstTo").value = build.targets.burst;

        [
            "levelFrom",
            "levelTo",
            "normalAttackFrom",
            "normalAttackTo",
            "skillFrom",
            "skillTo",
            "burstFrom",
            "burstTo"
        ].forEach(id => {
            document.getElementById(id).dispatchEvent(new Event("input"));
        });

        document.getElementById("calculator").scrollIntoView({
            behavior: "smooth"
        });
    }

    document.getElementById("createBuildButton").addEventListener("click", () => {
        if (!activeCharacter) {
            return;
        }

        const build = createDefaultBuild(activeCharacter);
        builds[activeCharacter.id] = [
            ...getCharacterBuilds(activeCharacter.id),
            build
        ];
        activeBuildId = build.id;
        if (persistBuilds()) {
            renderCharacterPicker();
            renderBuildList();
            renderBuildEditor(build);
        }
    });

    buildEditor.addEventListener("submit", event => {
        event.preventDefault();
        clearValidation();

        const existing = getActiveBuild();
        if (!existing || !activeCharacter) {
            return;
        }

        try {
            const updated = readBuildFromEditor(existing);
            builds[activeCharacter.id] = getCharacterBuilds(activeCharacter.id)
                .map(build => build.id === existing.id ? updated : build);
            activeBuildId = updated.id;
            if (persistBuilds()) {
                renderCharacterPicker();
                renderBuildList();
                renderBuildEditor(updated);
            }
        } catch (error) {
            showValidation(error.message || "Unable to save this build.");
        }
    });

    document.getElementById("duplicateBuildButton").addEventListener(
        "click",
        () => {
            const current = getActiveBuild();
            if (!current || !activeCharacter) {
                return;
            }
            const duplicate = {
                ...current,
                id: createBuildId(),
                name: `${current.name} Copy`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                artifacts: JSON.parse(JSON.stringify(current.artifacts)),
                targets: { ...current.targets },
                weapon: { ...current.weapon }
            };
            builds[activeCharacter.id] = [
                ...getCharacterBuilds(activeCharacter.id),
                duplicate
            ];
            activeBuildId = duplicate.id;
            if (persistBuilds()) {
                renderCharacterPicker();
                renderBuildList();
                renderBuildEditor(duplicate);
            }
        }
    );

    document.getElementById("deleteBuildButton").addEventListener(
        "click",
        () => {
            const current = getActiveBuild();
            if (!current || !activeCharacter) {
                return;
            }
            if (!window.confirm(`Delete the build "${current.name}"?`)) {
                return;
            }
            builds[activeCharacter.id] = getCharacterBuilds(activeCharacter.id)
                .filter(build => build.id !== current.id);
            activeBuildId = builds[activeCharacter.id][0]?.id || null;
            if (persistBuilds()) {
                renderCharacterPicker();
                renderBuildList();
                const next = getActiveBuild();
                if (next) {
                    renderBuildEditor(next);
                }
            }
        }
    );

    document.getElementById("renameBuildButton").addEventListener(
        "click",
        () => {
            const input = document.getElementById("buildNameInput");
            input.focus();
            input.select();
        }
    );

    document.getElementById("openBuildCalculatorButton").addEventListener(
        "click",
        () => {
            const current = getActiveBuild();
            if (current) {
                loadBuildIntoCalculator(current);
            }
        }
    );

    buildEditor.addEventListener("input", event => {
        if (event.target.matches("[data-artifact-field='level']")) {
            attachArtifactLevelIds();
        }
    });

    window.addEventListener("characterOwnershipChanged", () => {
        renderCharacterPicker();
        if (
            activeCharacter &&
            ownership[activeCharacter.id]?.owned !== true
        ) {
            activeCharacter = null;
            activeBuildId = null;
            renderWorkspace();
        }
    });

    window.genshinBuilds = {
        getBuilds() {
            return builds;
        },
        getUpgradeEntries() {
            return Object.entries(builds).flatMap(([characterId, characterBuilds]) => {
                const character = characters.find(item => item.id === characterId);
                return character &&
                    ownership[character.id]?.owned === true &&
                    Array.isArray(characterBuilds)
                    ? characterBuilds.map(build => ({
                        character,
                        build,
                        progress: getBuildProgress(build, character)
                    }))
                    : [];
            });
        }
    };

    renderArtifactInputs(createDefaultBuild(characters[0]).artifacts);
    attachArtifactLevelIds();
    renderCharacterPicker();
})();
