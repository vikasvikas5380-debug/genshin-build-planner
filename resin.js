// ============================================================
// GENSHIN BUILD PLANNER
// RESIN CALCULATOR
// ============================================================

const RESIN_DEFAULTS = {

    // 20 Resin -> 61,000 Mora
    mora: {
        resin: 20,
        reward: 61000
    },

    // 20 Resin -> 2 Teaching + 2 Guide
    talentBooks: {
        resin: 20,
        teaching: 2,
        guide: 2
    },

    // 40 Resin -> baseline 3 character boss materials
    characterBoss: {
        resin: 40,
        reward: 3
    },

    // Weekly Boss
    weeklyBoss: {
        materialsPerClaim: 2,
        discountedClaims: 3,
        discountedResin: 30,
        fullResin: 60
    }

};


// ============================================================
// RESIN INVENTORY STORAGE KEY
// ============================================================

const RESIN_INVENTORY_STORAGE_KEY =
    "genshinBuildPlannerInventory";


// ============================================================
// CHARACTER ASCENSION BOSS MATERIALS
// ============================================================

const CHARACTER_BOSS_MATERIALS = [

    "Hurricane Seed",
    "Lightning Prism",
    "Basalt Pillar",
    "Hoarfrost Core",
    "Everflame Seed",
    "Cleansing Heart",
    "Juvenile Jade",
    "Crystalline Bloom",
    "Marionette Core",
    "Perpetual Heart",
    "Smoldering Pearl",
    "Dew of Repudiation",
    "Storm Beads",
    "Riftborn Regalia",
    "Dragonheir's False Fin",
    "Runic Fang",
    "Majestic Hooked Beak",
    "Thunderclap Fruitcore",
    "Perpetual Caliber",
    "Light Guiding Tetrahedron",
    "Quelled Creeper",
    "Pseudo-Stamens",
    "Evergloom Ring",
    "Emperor's Resolution",
    "Fontemer Unihorn",
    "Tourbillon Device",
    "Water That Failed To Transcend",
    "Cloudseam Scale",
    "Fragment of a Golden Melody",
    "Overripe Flamegranate",
    "Mark of the Binding Blessing",
    "Gold-Inscribed Secret Source Core",
    "Ensnaring Gaze",
    "Talisman of the Enigmatic Land",
    "Sparkless Statue Core",
    "Secret Source Airflow Accumulator",
    "Precision Kuuvahki Stamping Die",
    "Lightbearing Scale-Feather",
    "Radiant Antler",
    "Cyclic Military Kuuvahki Core",
    "Remnant of the Dreadwing",
    "Prismatic Severed Tail",
    "Plume of the Fallen Watcher"

];


// ============================================================
// WEEKLY BOSS TALENT MATERIALS
// ============================================================

const WEEKLY_BOSS_MATERIALS = [

    // Stormterror Dvalin
    "Dvalin's Plume",
    "Dvalin's Claw",
    "Dvalin's Sigh",

    // Andrius
    "Tail of Boreas",
    "Ring of Boreas",
    "Spirit Locket of Boreas",

    // Childe
    "Tusk of Monoceros Caeli",
    "Shard of a Foul Legacy",
    "Shadow of the Warrior",

    // Azhdaha
    "Bloodjade Branch",
    "Dragon Lord's Crown",
    "Gilded Scale",

    // La Signora
    "Molten Moment",
    "Hellfire Butterfly",
    "Ashen Heart",

    // Raiden Shogun
    "Mudra of the Malefic General",
    "Tears of the Calamitous God",
    "The Meaning of Aeons",

    // Everlasting Lord of Arcane Wisdom
    "Puppet Strings",
    "Mirror of Mushin",
    "Daka's Bell",

    // Guardian of Apep's Oasis
    "Worldspan Fern",
    "Primordial Greenbloom",
    "Everamber",

    // The Knave
    "Fading Candle",
    "Silken Feather",
    "Denial and Judgment",

    // All-Devouring Narwhal
    "Lightless Silk String",
    "Lightless Eye of the Maelstrom",
    "Lightless Mass",

    // Lord of Eroded Primal Fire
    "Eroded Horn",
    "Eroded Scale-Feather",
    "Eroded Sunfire",

    // The Game Before the Gate
    "Ascended Sample: Knight",
    "Ascended Sample: Queen",
    "Ascended Sample: Rook",

    // Heretic of the False Moon
    "Elixir of the Heretic",
    "Madman's Restraint",
    "Mask of the Virtuous Doctor",

    // Exalted Master of the Heretical Path
    "Counterfeit Resin",
    "Twisted Withered Branch",
    "Profaned Sprout"

];


// ============================================================
// HELPERS
// ============================================================

function resinFormatNumber(value) {

    return Number(value)
        .toLocaleString("en-IN");

}


function resinEscapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function normalizeResinMaterialName(name) {

    return String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

}


// ============================================================
// GET INVENTORY OWNED AMOUNT
// ============================================================

function getInventoryOwnedAmount(materialName) {

    const wantedName =
        normalizeResinMaterialName(
            materialName
        );

    try {

        const saved =
            localStorage.getItem(
                RESIN_INVENTORY_STORAGE_KEY
            );

        if (!saved) {

            return 0;

        }

        const inventory =
            JSON.parse(saved);

        if (
            !inventory ||
            typeof inventory !== "object" ||
            Array.isArray(inventory)
        ) {

            return 0;

        }

        const owned =
            Number(
                inventory[wantedName]
            );

        if (
            !Number.isFinite(owned) ||
            owned < 0
        ) {

            return 0;

        }

        return Math.floor(
            owned
        );

    }

    catch (error) {

        console.error(
            "Unable to read Inventory from localStorage:",
            error
        );

        return 0;

    }

}


// ============================================================
// GET ASCENSION MATERIALS
// ============================================================

function getResinAscensionMaterials() {

    const materials = [];

    document
        .querySelectorAll(
            "#ascensionTotalGrid .ascension-material-card"
        )
        .forEach(card => {

            const name =
                card.querySelector(
                    ".ascension-material-name"
                );

            const count =
                card.querySelector(
                    ".ascension-material-count"
                );

            if (
                !name ||
                !count
            ) {

                return;

            }

            const materialName =
                name.textContent.trim();

            const amount =
                Number(
                    count.textContent
                        .replace(
                            /[^0-9]/g,
                            ""
                        )
                );

            if (
                materialName &&
                Number.isFinite(amount)
            ) {

                materials.push({

                    name:
                        materialName,

                    amount

                });

            }

        });

    return materials;

}


// ============================================================
// GET TALENT MATERIALS
// ============================================================

function getResinTalentMaterials() {

    const materials = [];

    document
        .querySelectorAll(
            "#talentTotalGrid .talent-material-card"
        )
        .forEach(card => {

            const name =
                card.querySelector(
                    ".talent-material-name"
                );

            const count =
                card.querySelector(
                    ".talent-material-count"
                );

            if (
                !name ||
                !count
            ) {

                return;

            }

            const materialName =
                name.textContent.trim();

            const amount =
                Number(
                    count.textContent
                        .replace(
                            /[^0-9]/g,
                            ""
                        )
                );

            if (
                materialName &&
                Number.isFinite(amount)
            ) {

                materials.push({

                    name:
                        materialName,

                    amount

                });

            }

        });

    return materials;

}


// ============================================================
// ALL REQUIRED MATERIALS
// ============================================================

function getAllResinMaterials() {

    return [

        ...getResinAscensionMaterials(),

        ...getResinTalentMaterials()

    ];

}


// ============================================================
// ADD INVENTORY DATA
// ============================================================

function addInventoryData(
    materials
) {

    return materials.map(
        material => {

            const owned =
                getInventoryOwnedAmount(
                    material.name
                );

            const remaining =
                Math.max(
                    0,
                    material.amount -
                    owned
                );

            return {

                ...material,

                owned,

                remaining

            };

        }
    );

}


// ============================================================
// GET MORA
// ============================================================

function getMoraTotal(
    materials
) {

    let total = 0;

    materials.forEach(
        material => {

            if (
                normalizeResinMaterialName(
                    material.name
                ) === "mora"
            ) {

                total +=
                    material.remaining;

            }

        }
    );

    return total;

}


// ============================================================
// GET TALENT BOOKS
// ============================================================

function getTalentBookTotals(
    materials
) {

    let teaching = 0;
    let guide = 0;
    let philosophies = 0;

    materials.forEach(
        material => {

            const name =
                normalizeResinMaterialName(
                    material.name
                );

            if (
                name.startsWith(
                    "teachings of"
                )
            ) {

                teaching +=
                    material.remaining;

            }

            else if (
                name.startsWith(
                    "guide to"
                )
            ) {

                guide +=
                    material.remaining;

            }

            else if (
                name.startsWith(
                    "philosophies of"
                )
            ) {

                philosophies +=
                    material.remaining;

            }

        }
    );

    return {

        teaching,

        guide,

        philosophies

    };

}


// ============================================================
// TALENT BOOK EQUIVALENT
// ============================================================

function calculateTalentBookEquivalent(
    books
) {

    /*
        Teaching = 1
        Guide = 3
        Philosophies = 9
    */

    return (

        books.teaching

        +

        books.guide * 3

        +

        books.philosophies * 9

    );

}


// ============================================================
// CHARACTER BOSS MATERIALS
// ============================================================

function getCharacterBossMaterials(
    materials
) {

    let total = 0;

    materials.forEach(
        material => {

            const materialName =
                normalizeResinMaterialName(
                    material.name
                );

            const isBossMaterial =
                CHARACTER_BOSS_MATERIALS
                    .some(
                        bossMaterial =>
                            normalizeResinMaterialName(
                                bossMaterial
                            ) ===
                            materialName
                    );

            if (
                isBossMaterial
            ) {

                total +=
                    material.remaining;

            }

        }
    );

    return total;

}


// ============================================================
// WEEKLY BOSS MATERIALS
// ============================================================

function getWeeklyBossMaterials(
    materials
) {

    let total = 0;

    materials.forEach(
        material => {

            const materialName =
                normalizeResinMaterialName(
                    material.name
                );

            const isWeeklyBossMaterial =
                WEEKLY_BOSS_MATERIALS
                    .some(
                        weeklyMaterial =>
                            normalizeResinMaterialName(
                                weeklyMaterial
                            ) ===
                            materialName
                    );

            if (
                isWeeklyBossMaterial
            ) {

                total +=
                    material.remaining;

            }

        }
    );

    return total;

}


// ============================================================
// WEEKLY BOSS RESIN CALCULATION
// ============================================================

function calculateWeeklyBossResin(
    weeklyMaterials
) {

    /*
        Conservative baseline:

        2 weekly boss talent materials
        per claim.

        First 3 claims:
        30 Resin each.

        4th claim onward:
        60 Resin each.
    */

    const materialsPerClaim =
        RESIN_DEFAULTS
            .weeklyBoss
            .materialsPerClaim;

    const discountedClaims =
        RESIN_DEFAULTS
            .weeklyBoss
            .discountedClaims;

    const discountedResin =
        RESIN_DEFAULTS
            .weeklyBoss
            .discountedResin;

    const fullResin =
        RESIN_DEFAULTS
            .weeklyBoss
            .fullResin;

    const weeklyRuns =
        weeklyMaterials > 0
            ? Math.ceil(
                weeklyMaterials /
                materialsPerClaim
            )
            : 0;

    const discountedRuns =
        Math.min(
            weeklyRuns,
            discountedClaims
        );

    const fullPriceRuns =
        Math.max(
            0,
            weeklyRuns -
            discountedClaims
        );

    const weeklyBossResin =
        (
            discountedRuns *
            discountedResin
        )
        +
        (
            fullPriceRuns *
            fullResin
        );

    return {

        weeklyMaterials,

        weeklyRuns,

        discountedRuns,

        fullPriceRuns,

        weeklyBossResin

    };

}


// ============================================================
// CALCULATE RESIN
// ============================================================

function calculateResin() {

    const rawMaterials =
        getAllResinMaterials();

    /*
        Required - Owned = Remaining
    */

    const materials =
        addInventoryData(
            rawMaterials
        );


    // --------------------------------------------------------
    // MORA
    // --------------------------------------------------------

    const mora =
        getMoraTotal(
            materials
        );

    const moraRuns =
        mora > 0
            ? Math.ceil(
                mora /
                RESIN_DEFAULTS
                    .mora
                    .reward
            )
            : 0;

    const moraResin =
        moraRuns *
        RESIN_DEFAULTS
            .mora
            .resin;


    // --------------------------------------------------------
    // TALENT BOOKS
    // --------------------------------------------------------

    const books =
        getTalentBookTotals(
            materials
        );

    const talentEquivalent =
        calculateTalentBookEquivalent(
            books
        );

    const equivalentPerRun =

        (
            RESIN_DEFAULTS
                .talentBooks
                .teaching
            *
            1
        )

        +

        (
            RESIN_DEFAULTS
                .talentBooks
                .guide
            *
            3
        );

    const talentRuns =
        talentEquivalent > 0
            ? Math.ceil(
                talentEquivalent /
                equivalentPerRun
            )
            : 0;

    const talentResin =
        talentRuns *
        RESIN_DEFAULTS
            .talentBooks
            .resin;


    // --------------------------------------------------------
    // CHARACTER BOSS
    // --------------------------------------------------------

    const bossMaterials =
        getCharacterBossMaterials(
            materials
        );

    const bossRuns =
        bossMaterials > 0
            ? Math.ceil(
                bossMaterials /
                RESIN_DEFAULTS
                    .characterBoss
                    .reward
            )
            : 0;

    const bossResin =
        bossRuns *
        RESIN_DEFAULTS
            .characterBoss
            .resin;


    // --------------------------------------------------------
    // WEEKLY BOSS
    // --------------------------------------------------------

    const weeklyMaterials =
        getWeeklyBossMaterials(
            materials
        );

    const weekly =
        calculateWeeklyBossResin(
            weeklyMaterials
        );


    // --------------------------------------------------------
    // TOTAL
    // --------------------------------------------------------

    const totalResin =
        moraResin
        +
        talentResin
        +
        bossResin
        +
        weekly.weeklyBossResin;

    return {

        materials,

        mora,

        moraRuns,

        moraResin,

        teaching:
            books.teaching,

        guide:
            books.guide,

        philosophies:
            books.philosophies,

        talentEquivalent,

        talentRuns,

        talentResin,

        bossMaterials,

        bossRuns,

        bossResin,

        weeklyMaterials,

        weeklyRuns:
            weekly.weeklyRuns,

        discountedWeeklyRuns:
            weekly.discountedRuns,

        fullPriceWeeklyRuns:
            weekly.fullPriceRuns,

        weeklyBossResin:
            weekly.weeklyBossResin,

        totalResin

    };

}


// ============================================================
// CREATE RESIN PANEL
// ============================================================

function createResinPanel() {

    const existing =
        document.getElementById(
            "resinPanel"
        );

    if (existing) {

        return existing;

    }

    const inventory =
        document.getElementById(
            "inventoryPanel"
        );

    if (!inventory) {

        return null;

    }

    const panel =
        document.createElement(
            "div"
        );

    panel.id =
        "resinPanel";

    panel.className =
        "resin-panel";

    panel.innerHTML = `

        <div
            class="resin-header"
        >

            <div>

                <p
                    class="resin-label"
                >
                    RESIN CALCULATOR
                </p>

                <h3
                    class="resin-title"
                >
                    Farming Estimate
                </h3>

            </div>

            <div
                class="resin-subtitle"
            >
                Based on the current build
            </div>

        </div>


        <div
            id="resinContent"
        >

            <div
                class="resin-empty"
            >

                <div
                    class="resin-empty-icon"
                >
                    💧
                </div>

                <h3>
                    Calculate a build first
                </h3>

                <p>
                    Your estimated Resin requirement
                    will appear here.
                </p>

            </div>

        </div>

    `;

    inventory.insertAdjacentElement(
        "afterend",
        panel
    );

    return panel;

}


// ============================================================
// RESIN REGENERATION TIME
// ============================================================

const RESIN_REGEN_MINUTES = 8;

function formatResinRegenerationTime(
    resin
) {

    const totalMinutes =
        Math.ceil(
            Number(resin) *
            RESIN_REGEN_MINUTES
        );

    const days =
        Math.floor(
            totalMinutes / 1440
        );

    const hours =
        Math.floor(
            (totalMinutes % 1440) / 60
        );

    const minutes =
        totalMinutes % 60;

    const parts = [];

    if (days > 0) {

        parts.push(
            `${days} day${days === 1 ? "" : "s"}`
        );

    }

    if (hours > 0) {

        parts.push(
            `${hours} hour${hours === 1 ? "" : "s"}`
        );

    }

    if (
        minutes > 0 ||
        parts.length === 0
    ) {

        parts.push(
            `${minutes} minute${minutes === 1 ? "" : "s"}`
        );

    }

    return parts.join(" ");

}


// ============================================================
// RENDER RESIN CALCULATOR
// ============================================================

function renderResinCalculator() {

    const content =
        document.getElementById(
            "resinContent"
        );

    if (!content) {

        return;

    }

    const rawMaterials =
        getAllResinMaterials();

    if (
        rawMaterials.length === 0
    ) {

        content.innerHTML = `

            <div
                class="resin-empty"
            >

                <div
                    class="resin-empty-icon"
                >
                    💧
                </div>

                <h3>
                    Calculate a build first
                </h3>

                <p>
                    Your estimated Resin requirement
                    will appear here.
                </p>

            </div>

        `;

        return;

    }

    const result =
        calculateResin();

    content.innerHTML = `

        <div
            class="resin-main-card"
        >

            <div
                class="resin-stat"
            >

                <div
                    class="resin-stat-label"
                >
                    Total Resin
                </div>

                <div
                    class="resin-stat-value"
                >
                    ${resinFormatNumber(
                        result.totalResin
                    )}
                </div>

                <div
                    class="resin-stat-note"
                >
                    Based on remaining materials
                </div>

            </div>


            <div
                class="resin-stat"
            >

                <div
                    class="resin-stat-label"
                >
                    Resin Regeneration
                </div>

                <div
                    class="resin-stat-value"
                >
                    ${formatResinRegenerationTime(
                        result.totalResin
                    )}
                </div>

                <div
                    class="resin-stat-note"
                >
                    1 Resin every 8 minutes
                </div>

            </div>


            <div
                class="resin-stat"
            >

                <div
                    class="resin-stat-label"
                >
                    Mora
                </div>

                <div
                    class="resin-stat-value"
                >
                    ${resinFormatNumber(
                        result.moraResin
                    )}
                </div>

                <div
                    class="resin-stat-note"
                >
                    ${resinFormatNumber(
                        result.mora
                    )}
                    Mora remaining
                </div>

            </div>


            <div
                class="resin-stat"
            >

                <div
                    class="resin-stat-label"
                >
                    Talent Books
                </div>

                <div
                    class="resin-stat-value"
                >
                    ${resinFormatNumber(
                        result.talentResin
                    )}
                </div>

                <div
                    class="resin-stat-note"
                >
                    ${resinFormatNumber(
                        result.talentEquivalent
                    )}
                    Teaching-equivalent remaining
                </div>

            </div>

        </div>


        <p
            class="resin-section-title"
        >
            RESIN BREAKDOWN
        </p>


        <div
            class="resin-breakdown"
        >

            <!-- MORA -->

            <div
                class="resin-breakdown-card"
            >

                <div>

                    <div
                        class="resin-breakdown-name"
                    >
                        💰 Mora Ley Line
                    </div>

                    <div
                        class="resin-breakdown-info"
                    >

                        ${resinFormatNumber(
                            result.moraRuns
                        )}
                        runs × 20 Resin

                        <br>

                        61,000 Mora per run

                    </div>

                </div>

                <div
                    class="resin-breakdown-value"
                >
                    ${resinFormatNumber(
                        result.moraResin
                    )}
                    Resin
                </div>

            </div>


            <!-- TALENT BOOKS -->

            <div
                class="resin-breakdown-card"
            >

                <div>

                    <div
                        class="resin-breakdown-name"
                    >
                        📚 Talent Books
                    </div>

                    <div
                        class="resin-breakdown-info"
                    >

                        ${resinFormatNumber(
                            result.talentRuns
                        )}
                        runs × 20 Resin

                        <br>

                        2 Teaching + 2 Guide baseline

                    </div>

                </div>

                <div
                    class="resin-breakdown-value"
                >
                    ${resinFormatNumber(
                        result.talentResin
                    )}
                    Resin
                </div>

            </div>


            <!-- CHARACTER BOSS -->

            <div
                class="resin-breakdown-card"
            >

                <div>

                    <div
                        class="resin-breakdown-name"
                    >
                        👹 Character Boss
                    </div>

                    <div
                        class="resin-breakdown-info"
                    >

                        ${resinFormatNumber(
                            result.bossRuns
                        )}
                        runs × 40 Resin

                        <br>

                        ${resinFormatNumber(
                            result.bossMaterials
                        )}
                        materials remaining

                        <br>

                        3 materials per run baseline

                    </div>

                </div>

                <div
                    class="resin-breakdown-value"
                >
                    ${resinFormatNumber(
                        result.bossResin
                    )}
                    Resin
                </div>

            </div>


            <!-- WEEKLY BOSS -->

            <div
                class="resin-breakdown-card"
            >

                <div>

                    <div
                        class="resin-breakdown-name"
                    >
                        🐉 Weekly Boss
                    </div>

                    <div
                        class="resin-breakdown-info"
                    >

                        ${resinFormatNumber(
                            result.weeklyRuns
                        )}
                        claims needed

                        <br>

                        ${resinFormatNumber(
                            result.weeklyMaterials
                        )}
                        materials remaining

                        <br>

                        2 materials per claim baseline

                        <br>

                        ${resinFormatNumber(
                            result.discountedWeeklyRuns
                        )}
                        discounted +

                        ${resinFormatNumber(
                            result.fullPriceWeeklyRuns
                        )}
                        full-price claims

                    </div>

                </div>

                <div
                    class="resin-breakdown-value"
                >
                    ${resinFormatNumber(
                        result.weeklyBossResin
                    )}
                    Resin
                </div>

            </div>

        </div>


        <div
            class="resin-info"
        >

            <strong>
                Current farming baselines:
            </strong>

            <br>

            💰 20 Resin → 61,000 Mora

            <br>

            📚 20 Resin → 2 Teaching + 2 Guide

            <br>

            👹 40 Resin → 3 Character Boss materials

            <br>

            🐉 Weekly Boss → 2 talent materials per claim

            <br><br>

            Inventory is automatically subtracted
            from the required materials.

            <br>

            Character Boss rewards can sometimes
            give 4 materials, but this calculator
            uses <strong>3 as the baseline</strong>.

            <br>

            Weekly Boss claims use
            <strong>30 Resin for the first 3 claims</strong>
            and <strong>60 Resin afterward</strong>.

            <br><br>

            Weekly Boss calculation uses
            <strong>2 materials per claim as the baseline</strong>.

        </div>

    `;

}


// ============================================================
// INVENTORY SIGNATURE
// ============================================================

function getInventoryResinSignature() {

    try {

        const saved =
            localStorage.getItem(
                RESIN_INVENTORY_STORAGE_KEY
            );

        if (!saved) {

            return "";

        }

        const inventory =
            JSON.parse(saved);

        if (
            !inventory ||
            typeof inventory !== "object" ||
            Array.isArray(inventory)
        ) {

            return "";

        }

        return Object.entries(
            inventory
        )

            .map(
                ([name, value]) => {

                    return (
                        `${normalizeResinMaterialName(name)}:${Number(value) || 0}`
                    );

                }
            )

            .sort()

            .join("|");

    }

    catch (error) {

        console.error(
            "Unable to read Inventory signature:",
            error
        );

        return "";

    }

}


// ============================================================
// CHANGE DETECTION
// ============================================================

let lastResinSignature = "";


function getResinSignature() {

    const materials =
        getAllResinMaterials();

    const materialSignature =
        materials

            .map(
                material =>
                    `${material.name}:${material.amount}`
            )

            .sort()

            .join("|");

    const inventorySignature =
        getInventoryResinSignature();

    return (

        materialSignature

        +

        "||INVENTORY||"

        +

        inventorySignature

    );

}


function checkResinChanges() {

    const signature =
        getResinSignature();

    if (
        signature ===
        lastResinSignature
    ) {

        return;

    }

    lastResinSignature =
        signature;

    renderResinCalculator();

}


// ============================================================
// INITIALIZE
// ============================================================

function initializeResinCalculator() {

    addResinStyles();

    createResinPanel();

    renderResinCalculator();

    setInterval(
        checkResinChanges,
        1000
    );

}


// ============================================================
// START
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeResinCalculator
    );

}

else {

    initializeResinCalculator();

}


// ============================================================
// RESIN CALCULATOR STYLES
// ============================================================

function addResinStyles() {

    if (
        document.getElementById(
            "resinCalculatorStyles"
        )
    ) {

        return;

    }

    const style =
        document.createElement("style");

    style.id =
        "resinCalculatorStyles";

    style.textContent = `

        /* ==================================================
           MAIN RESIN PANEL
           ================================================== */

        .resin-panel {

            margin-top: 30px;

            padding: 28px;

            background: #0d0f15;

            border: 1px solid #292d38;

            border-radius: 8px;

            color: #e8e8e8;

            box-sizing: border-box;

        }


        /* ==================================================
           HEADER
           ================================================== */

        .resin-header {

            display: flex;

            justify-content: space-between;

            align-items: flex-end;

            gap: 20px;

            padding-bottom: 20px;

            margin-bottom: 22px;

            border-bottom:
                1px solid #292d38;

        }


        .resin-label {

            margin: 0 0 6px;

            color: #d6b36a;

            font-size: 11px;

            font-weight: 700;

            letter-spacing: 2px;

        }


        .resin-title {

            margin: 0;

            color: #ffffff;

            font-size: 24px;

            font-weight: 600;

        }


        .resin-subtitle {

            color: #858995;

            font-size: 13px;

        }


        /* ==================================================
           EMPTY STATE
           ================================================== */

        .resin-empty {

            text-align: center;

            padding: 45px 20px;

            border:
                1px solid #292d38;

            border-radius: 7px;

            background: #10121a;

        }


        .resin-empty-icon {

            font-size: 35px;

            margin-bottom: 12px;

        }


        .resin-empty h3 {

            margin: 0 0 8px;

            color: #ffffff;

            font-size: 17px;

        }


        .resin-empty p {

            margin: 0;

            color: #858995;

            font-size: 13px;

        }


        /* ==================================================
           TOP STAT CARDS
           ================================================== */

        .resin-main-card {

            display: grid;

            grid-template-columns:
                repeat(4, minmax(0, 1fr));

            gap: 14px;

            margin-bottom: 28px;

        }


        .resin-stat {

            padding: 20px;

            min-height: 115px;

            background: #181b25;

            border:
                1px solid #292d38;

            border-radius: 7px;

            box-sizing: border-box;

        }


        .resin-stat:first-child {

            border-color:
                rgba(214, 179, 106, 0.45);

        }


        .resin-stat-label {

            margin-bottom: 10px;

            color: #8e929d;

            font-size: 11px;

            font-weight: 700;

            letter-spacing: 1.5px;

            text-transform: uppercase;

        }


        .resin-stat-value {

            color: #d6b36a;

            font-size: 28px;

            font-weight: 700;

            line-height: 1.1;

        }


        .resin-stat-note {

            margin-top: 8px;

            color: #858995;

            font-size: 12px;

        }


        /* ==================================================
           SECTION TITLE
           ================================================== */

        .resin-section-title {

            margin: 0 0 12px;

            color: #d6b36a;

            font-size: 11px;

            font-weight: 700;

            letter-spacing: 2px;

        }


        /* ==================================================
           BREAKDOWN
           ================================================== */

        .resin-breakdown {

            display: grid;

            grid-template-columns:
                repeat(4, minmax(0, 1fr));

            gap: 14px;

        }


        .resin-breakdown-card {

            display: flex;

            justify-content: space-between;

            align-items: center;

            gap: 15px;

            min-height: 100px;

            padding: 18px;

            background: #181b25;

            border:
                1px solid #292d38;

            border-radius: 7px;

            box-sizing: border-box;

            transition:
                border-color 0.2s ease,
                transform 0.2s ease;

        }


        .resin-breakdown-card:hover {

            border-color:
                rgba(214, 179, 106, 0.45);

            transform:
                translateY(-2px);

        }


        .resin-breakdown-name {

            margin-bottom: 8px;

            color: #ffffff;

            font-size: 14px;

            font-weight: 600;

        }


        .resin-breakdown-info {

            color: #858995;

            font-size: 12px;

            line-height: 1.7;

        }


        .resin-breakdown-value {

            flex-shrink: 0;

            color: #d6b36a;

            font-size: 16px;

            font-weight: 700;

            text-align: right;

            white-space: nowrap;

        }


        /* ==================================================
           INFORMATION BOX
           ================================================== */

        .resin-info {

            margin-top: 20px;

            padding: 17px 19px;

            background: #10121a;

            border:
                1px solid #292d38;

            border-left:
                2px solid #d6b36a;

            border-radius: 6px;

            color: #858995;

            font-size: 12px;

            line-height: 1.8;

        }


        .resin-info strong {

            color: #d6b36a;

        }


        /* ==================================================
           RESPONSIVE
           ================================================== */

        @media (max-width: 1200px) {

            .resin-main-card {

                grid-template-columns:
                    repeat(2, minmax(0, 1fr));

            }

            .resin-breakdown {

                grid-template-columns:
                    repeat(2, minmax(0, 1fr));

            }

        }


        @media (max-width: 900px) {

            .resin-main-card {

                grid-template-columns:
                    1fr;

            }


            .resin-breakdown {

                grid-template-columns:
                    1fr;

            }

        }


        @media (max-width: 600px) {

            .resin-panel {

                padding: 18px;

            }


            .resin-header {

                display: block;

            }


            .resin-subtitle {

                margin-top: 8px;

            }


            .resin-stat-value {

                font-size: 24px;

            }


            .resin-breakdown-card {

                align-items: flex-start;

            }


            .resin-breakdown-value {

                font-size: 14px;

            }

        }

    `;

    document.head.appendChild(style);

}