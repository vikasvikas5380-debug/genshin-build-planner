// ============================================================
// GENSHIN BUILD PLANNER
// INVENTORY SYSTEM
// MongoDB + localStorage mirror
// ============================================================

const INVENTORY_STORAGE_KEY =
    "genshinBuildPlannerInventory";

const INVENTORY_API_URL =
    "http://localhost:3000/api/inventory";

let inventoryMaterials = [];

let lastInventorySignature = "";

let inventoryStorage = {};


// ============================================================
// STORAGE
// ============================================================

function getInventoryStorage() {

    return inventoryStorage;

}


function saveInventoryStorage(data) {

    inventoryStorage = {
        ...data
    };

    // Keep localStorage as a mirror.
    // Resin currently reads the inventory from here.

    try {

        localStorage.setItem(
            INVENTORY_STORAGE_KEY,
            JSON.stringify(
                inventoryStorage
            )
        );

    }

    catch (error) {

        console.error(
            "Unable to update localStorage mirror:",
            error
        );

    }

    // Save to MongoDB.

    saveInventoryToMongo(
        inventoryStorage
    );

}


// ============================================================
// LOAD INVENTORY FROM LOCAL STORAGE
// ============================================================

function loadInventoryFromLocalStorage() {

    try {

        const saved =
            localStorage.getItem(
                INVENTORY_STORAGE_KEY
            );

        if (!saved) {

            inventoryStorage = {};

            return;

        }

        const parsed =
            JSON.parse(saved);

        if (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
        ) {

            inventoryStorage =
                parsed;

        }

        else {

            inventoryStorage = {};

        }

    }

    catch (error) {

        console.error(
            "Inventory localStorage error:",
            error
        );

        inventoryStorage = {};

    }

}


// ============================================================
// LOAD INVENTORY FROM MONGODB
// ============================================================

async function loadInventoryFromMongo() {

    try {

        const response =
            await fetch(
                INVENTORY_API_URL
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data =
            await response.json();

        if (
            !data.success ||
            !data.inventory
        ) {

            console.warn(
                "MongoDB returned no inventory."
            );

            return;

        }

        inventoryStorage =
            data.inventory || {};


        // Update localStorage mirror.

        localStorage.setItem(
            INVENTORY_STORAGE_KEY,
            JSON.stringify(
                inventoryStorage
            )
        );


        lastInventorySignature = "";


        refreshInventory();


        // Tell Resin to recalculate
        // on its next check.

        console.log(
            "Inventory loaded from MongoDB."
        );

    }

    catch (error) {

        console.warn(
            "MongoDB inventory unavailable. Using local inventory.",
            error
        );

    }

}


// ============================================================
// SAVE INVENTORY TO MONGODB
// ============================================================

async function saveInventoryToMongo(
    data
) {

    try {

        const response =
            await fetch(
                INVENTORY_API_URL,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            materials:
                                data

                        })

                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Unable to save inventory."
            );

        }


        console.log(
            "Inventory saved to MongoDB."
        );

    }

    catch (error) {

        console.warn(
            "MongoDB save failed. Local inventory is still preserved.",
            error
        );

    }

}


// ============================================================
// HELPERS
// ============================================================

function inventoryKey(name) {

    return String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

}


function formatNumber(number) {

    return Number(number)
        .toLocaleString("en-IN");

}


function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// OWNED MATERIALS
// ============================================================

function getOwned(name) {

    const value =
        Number(
            inventoryStorage[
                inventoryKey(name)
            ]
        );


    if (
        !Number.isFinite(value) ||
        value < 0
    ) {

        return 0;

    }


    return Math.floor(
        value
    );

}


// ============================================================
// SAVE ONE MATERIAL
// ============================================================

function saveOwned(
    name,
    value
) {

    const key =
        inventoryKey(name);


    const amount =
        Math.max(
            0,
            Math.floor(
                Number(value) || 0
            )
        );


    inventoryStorage[key] =
        amount;


    // Save local mirror immediately.

    try {

        localStorage.setItem(
            INVENTORY_STORAGE_KEY,
            JSON.stringify(
                inventoryStorage
            )
        );

    }

    catch (error) {

        console.error(
            "Unable to save local inventory:",
            error
        );

    }


    // Save complete inventory to MongoDB.

    saveInventoryToMongo(
        inventoryStorage
    );

}


// ============================================================
// STYLES
// ============================================================

function addInventoryStyles() {

    if (
        document.getElementById(
            "inventoryStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "inventoryStyles";


    style.textContent = `

        .inventory-panel {

            margin-top: 20px;

            padding: 24px;

            background: #10121a;

            border: 1px solid #292d38;

            border-radius: 7px;

        }


        .inventory-panel-header {

            display: flex;

            justify-content: space-between;

            align-items: flex-end;

            gap: 20px;

            padding-bottom: 18px;

            margin-bottom: 22px;

            border-bottom:
                1px solid #292d38;

        }


        .inventory-panel-label {

            margin: 0 0 6px;

            color: #d6b36a;

            font-size: 11px;

            font-weight: 700;

            letter-spacing: 2px;

        }


        .inventory-panel-title {

            margin: 0;

            color: #ffffff;

            font-size: 22px;

        }


        .inventory-panel-info {

            color: #777b87;

            font-size: 12px;

        }


        .inventory-summary {

            display: grid;

            grid-template-columns:
                repeat(3, 1fr);

            gap: 12px;

            margin-bottom: 22px;

        }


        .inventory-summary-card {

            padding: 15px;

            background: #181b25;

            border: 1px solid #292d38;

            border-radius: 6px;

        }


        .inventory-summary-label {

            color: #777b87;

            font-size: 10px;

            letter-spacing: 1px;

            text-transform: uppercase;

        }


        .inventory-summary-value {

            margin-top: 5px;

            color: #d6b36a;

            font-size: 20px;

            font-weight: 700;

        }


        .inventory-controls {

            display: flex;

            justify-content: space-between;

            align-items: center;

            gap: 15px;

            margin-bottom: 18px;

        }


        .inventory-search {

            width: 100%;

            max-width: 450px;

            height: 42px;

            padding: 0 14px;

            background: #151821;

            border: 1px solid #303440;

            border-radius: 6px;

            color: #ffffff;

            outline: none;

        }


        .inventory-search:focus {

            border-color: #d6b36a;

        }


        .inventory-reset-button {

            height: 42px;

            padding: 0 16px;

            background: transparent;

            border: 1px solid #303440;

            border-radius: 6px;

            color: #999da8;

            cursor: pointer;

        }


        .inventory-reset-button:hover {

            color: #d6b36a;

            border-color: #d6b36a;

        }


        .inventory-table-wrapper {

            width: 100%;

            overflow-x: auto;

        }


        .inventory-table {

            width: 100%;

            min-width: 650px;

            border-collapse: collapse;

        }


        .inventory-table th {

            padding: 12px;

            text-align: left;

            color: #777b87;

            font-size: 10px;

            letter-spacing: 1.5px;

            border-bottom:
                1px solid #292d38;

        }


        .inventory-table td {

            padding: 12px;

            border-bottom:
                1px solid #222631;

        }


        .inventory-material {

            display: flex;

            align-items: center;

            gap: 12px;

        }


        .inventory-material-icon {

            width: 44px;

            height: 44px;

            min-width: 44px;

            display: flex;

            align-items: center;

            justify-content: center;

            background: #0f1118;

            border-radius: 6px;

            overflow: hidden;

        }


        .inventory-material-icon img {

            width: 44px;

            height: 44px;

            object-fit: contain;

        }


        .inventory-material-name {

            color: #e0e0e0;

            font-size: 13px;

        }


        .inventory-required {

            color: #e0e0e0;

            font-weight: 600;

        }


        .inventory-owned-input {

            width: 130px;

            height: 40px;

            box-sizing: border-box;

            padding: 0 12px;

            background: #0d0f15;

            border: 1px solid #444955;

            border-radius: 5px;

            color: #ffffff;

            font-size: 14px;

            outline: none;

            cursor: text;

            pointer-events: auto;

            user-select: text;

        }


        .inventory-owned-input:focus {

            border-color: #d6b36a;

            box-shadow:
                0 0 0 1px #d6b36a;

        }


        .inventory-remaining {

            font-weight: 700;

        }


        .inventory-remaining.needed {

            color: #d6b36a;

        }


        .inventory-remaining.complete {

            color: #78c091;

        }


        .inventory-empty {

            padding: 45px 20px;

            text-align: center;

            background: #181b25;

            border: 1px dashed #303440;

            border-radius: 6px;

            color: #777b87;

        }


        .inventory-empty h3 {

            margin: 8px 0;

            color: #dddddd;

        }


        .inventory-empty p {

            font-size: 12px;

        }


        @media (max-width: 700px) {

            .inventory-summary {

                grid-template-columns: 1fr;

            }


            .inventory-panel-header {

                align-items: flex-start;

                flex-direction: column;

            }


            .inventory-controls {

                flex-direction: column;

                align-items: stretch;

            }


            .inventory-search {

                max-width: none;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


// ============================================================
// CREATE INVENTORY PANEL
// ============================================================

function createInventoryPanel() {

    const existing =
        document.getElementById(
            "inventoryPanel"
        );


    if (existing) {

        return existing;

    }


    const placeholder =
        document.querySelector(
            ".inventory-placeholder"
        );


    if (!placeholder) {

        console.error(
            "Inventory placeholder not found."
        );

        return null;

    }


    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "inventoryPanel";


    panel.className =
        "inventory-panel";


    panel.innerHTML = `

        <div
            class="inventory-panel-header"
        >

            <div>

                <p
                    class="inventory-panel-label"
                >
                    MATERIAL MANAGEMENT
                </p>

                <h3
                    class="inventory-panel-title"
                >
                    Your Inventory
                </h3>

            </div>

            <div
                id="inventoryPanelInfo"
                class="inventory-panel-info"
            >
                MongoDB inventory
            </div>

        </div>


        <div
            class="inventory-summary"
        >

            <div
                class="inventory-summary-card"
            >

                <div
                    class="inventory-summary-label"
                >
                    Materials
                </div>

                <div
                    id="inventoryMaterialCount"
                    class="inventory-summary-value"
                >
                    0
                </div>

            </div>


            <div
                class="inventory-summary-card"
            >

                <div
                    class="inventory-summary-label"
                >
                    Fully Owned
                </div>

                <div
                    id="inventoryCompleteCount"
                    class="inventory-summary-value"
                >
                    0
                </div>

            </div>


            <div
                class="inventory-summary-card"
            >

                <div
                    class="inventory-summary-label"
                >
                    Still Needed
                </div>

                <div
                    id="inventoryNeededCount"
                    class="inventory-summary-value"
                >
                    0
                </div>

            </div>

        </div>


        <div
            class="inventory-controls"
        >

            <input
                id="inventorySearch"
                class="inventory-search"
                type="text"
                placeholder="Search material..."
            >


            <button
                id="inventoryResetButton"
                class="inventory-reset-button"
                type="button"
            >
                Reset Inventory
            </button>

        </div>


        <div
            id="inventoryContent"
        >

            <div
                class="inventory-empty"
            >

                <div>
                    🎒
                </div>

                <h3>
                    No materials yet
                </h3>

                <p>
                    Calculate a character build first.
                </p>

            </div>

        </div>

    `;


    placeholder.replaceWith(
        panel
    );


    return panel;

}


// ============================================================
// GET ASCENSION MATERIALS
// ============================================================

function getAscensionMaterials() {

    const cards =
        document.querySelectorAll(
            "#ascensionTotalGrid .ascension-material-card"
        );


    const materials = [];


    cards.forEach(
        card => {

            const name =
                card.querySelector(
                    ".ascension-material-name"
                );


            const count =
                card.querySelector(
                    ".ascension-material-count"
                );


            const image =
                card.querySelector(
                    ".ascension-material-icon"
                );


            if (
                !name ||
                !count
            ) {

                return;

            }


            const materialName =
                name.textContent.trim();


            const required =
                Number(
                    count.textContent
                        .replace(
                            /[^0-9]/g,
                            ""
                        )
                );


            if (
                !materialName ||
                !Number.isFinite(required)
            ) {

                return;

            }


            materials.push({

                name:
                    materialName,

                required,

                image:
                    image?.src || ""

            });

        }
    );


    return materials;

}


// ============================================================
// GET TALENT MATERIALS
// ============================================================

function getTalentMaterials() {

    const cards =
        document.querySelectorAll(
            "#talentTotalGrid .talent-material-card"
        );


    const materials = [];


    cards.forEach(
        card => {

            const name =
                card.querySelector(
                    ".talent-material-name"
                );


            const count =
                card.querySelector(
                    ".talent-material-count"
                );


            const image =
                card.querySelector(
                    ".talent-material-icon"
                );


            if (
                !name ||
                !count
            ) {

                return;

            }


            const materialName =
                name.textContent.trim();


            const required =
                Number(
                    count.textContent
                        .replace(
                            /[^0-9]/g,
                            ""
                        )
                );


            if (
                !materialName ||
                !Number.isFinite(required)
            ) {

                return;

            }


            materials.push({

                name:
                    materialName,

                required,

                image:
                    image?.src || ""

            });

        }
    );


    return materials;

}


// ============================================================
// BUILD INVENTORY LIST
// ============================================================

function buildInventoryList() {

    const materials = [

        ...getAscensionMaterials(),

        ...getTalentMaterials()

    ];


    const map =
        new Map();


    materials.forEach(
        material => {

            const key =
                inventoryKey(
                    material.name
                );


            if (
                map.has(key)
            ) {

                const existing =
                    map.get(key);


                existing.required +=
                    material.required;


                if (
                    !existing.image &&
                    material.image
                ) {

                    existing.image =
                        material.image;

                }

            }

            else {

                map.set(
                    key,
                    {

                        name:
                            material.name,

                        required:
                            material.required,

                        image:
                            material.image || ""

                    }
                );

            }

        }
    );


    return Array.from(
        map.values()
    );

}


// ============================================================
// SIGNATURE
// ============================================================

function getInventorySignature(
    materials
) {

    return materials

        .map(
            material =>
                `${material.name}:${material.required}`
        )

        .sort()

        .join("|");

}


// ============================================================
// REFRESH INVENTORY
// ============================================================

function refreshInventory() {

    const materials =
        buildInventoryList();


    const signature =
        getInventorySignature(
            materials
        );


    if (
        signature ===
        lastInventorySignature
    ) {

        updateSummary();

        return;

    }


    lastInventorySignature =
        signature;


    inventoryMaterials =
        materials;


    renderInventory();

}


// ============================================================
// RENDER INVENTORY
// ============================================================

function renderInventory() {

    const content =
        document.getElementById(
            "inventoryContent"
        );


    if (!content) {

        return;

    }


    if (
        inventoryMaterials.length === 0
    ) {

        content.innerHTML = `

            <div
                class="inventory-empty"
            >

                <div>
                    🎒
                </div>

                <h3>
                    No materials yet
                </h3>

                <p>
                    Calculate a character build first.
                </p>

            </div>

        `;


        updateSummary();

        return;

    }


    let html = `

        <div
            class="inventory-table-wrapper"
        >

            <table
                class="inventory-table"
            >

                <thead>

                    <tr>

                        <th>
                            MATERIAL
                        </th>

                        <th>
                            REQUIRED
                        </th>

                        <th>
                            OWNED
                        </th>

                        <th>
                            REMAINING
                        </th>

                    </tr>

                </thead>

                <tbody>

    `;


    inventoryMaterials.forEach(
        material => {

            const owned =
                getOwned(
                    material.name
                );


            const remaining =
                Math.max(
                    material.required -
                    owned,
                    0
                );


            html += `

                <tr
                    data-material="${escapeHTML(
                        inventoryKey(
                            material.name
                        )
                    )}"
                >

                    <td>

                        <div
                            class="inventory-material"
                        >

                            <div
                                class="inventory-material-icon"
                            >

                                ${
                                    material.image

                                    ? `

                                        <img
                                            src="${escapeHTML(
                                                material.image
                                            )}"
                                            alt="${escapeHTML(
                                                material.name
                                            )}"
                                            loading="lazy"
                                        >

                                      `

                                    : "◆"
                                }

                            </div>


                            <div
                                class="inventory-material-name"
                            >

                                ${escapeHTML(
                                    material.name
                                )}

                            </div>

                        </div>

                    </td>


                    <td>

                        <span
                            class="inventory-required"
                        >

                            ×${formatNumber(
                                material.required
                            )}

                        </span>

                    </td>


                    <td>

                        <input
                            type="text"
                            inputmode="numeric"
                            autocomplete="off"
                            class="inventory-owned-input"
                            value="${owned}"
                            data-material="${escapeHTML(
                                material.name
                            )}"
                        >

                    </td>


                    <td>

                        <span
                            class="inventory-remaining ${
                                remaining === 0
                                    ? "complete"
                                    : "needed"
                            }"
                        >

                            ${
                                remaining === 0

                                    ? "✓ Complete"

                                    : `×${formatNumber(
                                        remaining
                                    )}`

                            }

                        </span>

                    </td>

                </tr>

            `;

        }
    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    content.innerHTML =
        html;


    attachInventoryInputs();

    updateSummary();

    applyInventorySearch();

}


// ============================================================
// INPUT EVENTS
// ============================================================

function attachInventoryInputs() {

    const inputs =
        document.querySelectorAll(
            ".inventory-owned-input"
        );


    inputs.forEach(
        input => {

            input.addEventListener(
                "blur",
                function () {

                    let value =
                        this.value.replace(
                            /[^0-9]/g,
                            ""
                        );


                    if (
                        value === ""
                    ) {

                        value = "0";

                    }


                    value =
                        parseInt(
                            value,
                            10
                        ) || 0;


                    this.value =
                        value;


                    saveOwned(
                        this.dataset.material,
                        value
                    );


                    updateInventoryRow(
                        this
                    );


                    updateSummary();

                }
            );


            input.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        this.blur();

                    }

                }
            );

        }
    );

}


// ============================================================
// UPDATE ROW
// ============================================================

function updateInventoryRow(
    input
) {

    const row =
        input.closest(
            "tr"
        );


    if (!row) {

        return;

    }


    const name =
        input.dataset.material;


    const material =
        inventoryMaterials.find(
            item =>
                inventoryKey(
                    item.name
                ) ===
                inventoryKey(
                    name
                )
        );


    if (!material) {

        return;

    }


    const owned =
        parseInt(
            input.value,
            10
        ) || 0;


    const remaining =
        Math.max(
            material.required -
            owned,
            0
        );


    const element =
        row.querySelector(
            ".inventory-remaining"
        );


    if (!element) {

        return;

    }


    if (
        remaining === 0
    ) {

        element.textContent =
            "✓ Complete";


        element.className =
            "inventory-remaining complete";

    }

    else {

        element.textContent =
            `×${formatNumber(
                remaining
            )}`;


        element.className =
            "inventory-remaining needed";

    }

}


// ============================================================
// SUMMARY
// ============================================================

function updateSummary() {

    const total =
        document.getElementById(
            "inventoryMaterialCount"
        );


    const complete =
        document.getElementById(
            "inventoryCompleteCount"
        );


    const needed =
        document.getElementById(
            "inventoryNeededCount"
        );


    let completeCount = 0;

    let neededCount = 0;


    inventoryMaterials.forEach(
        material => {

            const owned =
                getOwned(
                    material.name
                );


            if (
                owned >=
                material.required
            ) {

                completeCount++;

            }

            else {

                neededCount++;

            }

        }
    );


    if (total) {

        total.textContent =
            inventoryMaterials.length;

    }


    if (complete) {

        complete.textContent =
            completeCount;

    }


    if (needed) {

        needed.textContent =
            neededCount;

    }

}


// ============================================================
// SEARCH
// ============================================================

function applyInventorySearch() {

    const search =
        document.getElementById(
            "inventorySearch"
        );


    if (!search) {

        return;

    }


    const query =
        search.value
            .trim()
            .toLowerCase();


    const rows =
        document.querySelectorAll(
            ".inventory-table tbody tr"
        );


    rows.forEach(
        row => {

            const material =
                row.dataset.material ||
                "";


            row.style.display =
                !query ||
                material.includes(
                    query
                )

                    ? ""

                    : "none";

        }
    );

}


// ============================================================
// RESET INVENTORY
// ============================================================

async function resetInventory() {

    if (
        !confirm(
            "Reset all inventory amounts?"
        )
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                INVENTORY_API_URL,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        console.log(
            "MongoDB inventory reset."
        );

    }

    catch (error) {

        console.warn(
            "MongoDB reset failed:",
            error
        );

    }


    // Clear local mirror too.

    inventoryStorage = {};

    localStorage.removeItem(
        INVENTORY_STORAGE_KEY
    );


    lastInventorySignature =
        "";


    refreshInventory();

}


// ============================================================
// CONTROLS
// ============================================================

function setupInventoryControls() {

    const search =
        document.getElementById(
            "inventorySearch"
        );


    if (search) {

        search.addEventListener(
            "input",
            applyInventorySearch
        );

    }


    const reset =
        document.getElementById(
            "inventoryResetButton"
        );


    if (reset) {

        reset.addEventListener(
            "click",
            resetInventory
        );

    }

}


// ============================================================
// CHECK FOR NEW CALCULATIONS
// ============================================================

function checkForMaterialChanges() {

    refreshInventory();

}


// ============================================================
// INITIALIZE
// ============================================================

function initializeInventory() {

    addInventoryStyles();

    createInventoryPanel();

    setupInventoryControls();


    /*
        First load the local mirror.

        This means the inventory can appear
        immediately without waiting for MongoDB.
    */

    loadInventoryFromLocalStorage();

    refreshInventory();


    /*
        Then load the authoritative inventory
        from MongoDB.
    */

    loadInventoryFromMongo();


    /*
        Check once per second.

        This catches new Ascension/Talent
        calculations without using MutationObserver.

        This also keeps Resin synchronized.
    */

    setInterval(
        checkForMaterialChanges,
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
        initializeInventory
    );

}

else {

    initializeInventory();

}