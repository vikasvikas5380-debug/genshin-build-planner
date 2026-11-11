// ============================================================
// GENSHIN BUILD PLANNER - TALENT MATERIAL CALCULATOR
// ============================================================

const TALENT_API =
  "https://genshin-db-api.vercel.app/api/v5/talents";

const TALENT_MATERIAL_API =
  "https://genshin-db-api.vercel.app/api/v5/materials";

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

const talentMaterialImageCache = new Map();

// ============================================================
// MANUAL TALENT DATA FOR NEW 7.2 CHARACTERS
// ============================================================

const MANUAL_TALENT_DATA = {
  mitya: {
    costs: {
      lvl2: [
        { id: 202, name: "Mora", count: 12500 },
        { id: 104365, name: "Teachings of Charity", count: 3 },
        { id: 112149, name: "Chimeric Core", count: 6 }
      ],
      lvl3: [
        { id: 202, name: "Mora", count: 17500 },
        { id: 104366, name: "Guide to Charity", count: 2 },
        { id: 112150, name: "Symbiotic Chimeric Nucleus", count: 3 }
      ],
      lvl4: [
        { id: 202, name: "Mora", count: 25000 },
        { id: 104366, name: "Guide to Charity", count: 4 },
        { id: 112150, name: "Symbiotic Chimeric Nucleus", count: 4 }
      ],
      lvl5: [
        { id: 202, name: "Mora", count: 30000 },
        { id: 104366, name: "Guide to Charity", count: 6 },
        { id: 112150, name: "Symbiotic Chimeric Nucleus", count: 6 }
      ],
      lvl6: [
        { id: 202, name: "Mora", count: 37500 },
        { id: 104366, name: "Guide to Charity", count: 9 },
        { id: 112150, name: "Symbiotic Chimeric Nucleus", count: 9 }
      ],
      lvl7: [
        { id: 202, name: "Mora", count: 120000 },
        { id: 104367, name: "Philosophies of Charity", count: 4 },
        { id: 112151, name: "Prime Chimeric Nexus", count: 4 },
        { id: 113081, name: "Mask of the Virtuous Doctor", count: 1 }
      ],
      lvl8: [
        { id: 202, name: "Mora", count: 260000 },
        { id: 104367, name: "Philosophies of Charity", count: 6 },
        { id: 112151, name: "Prime Chimeric Nexus", count: 6 },
        { id: 113081, name: "Mask of the Virtuous Doctor", count: 1 }
      ],
      lvl9: [
        { id: 202, name: "Mora", count: 450000 },
        { id: 104367, name: "Philosophies of Charity", count: 12 },
        { id: 112151, name: "Prime Chimeric Nexus", count: 9 },
        { id: 113081, name: "Mask of the Virtuous Doctor", count: 2 }
      ],
      lvl10: [
        { id: 202, name: "Mora", count: 700000 },
        { id: 104367, name: "Philosophies of Charity", count: 16 },
        { id: 112151, name: "Prime Chimeric Nexus", count: 12 },
        { id: 113081, name: "Mask of the Virtuous Doctor", count: 2 },
        { id: 104319, name: "Crown of Insight", count: 1 }
      ]
    }
  },

  valeriy: {
    costs: {
      lvl2: [
        { id: 202, name: "Mora", count: 12500 },
        { id: 104371, name: "Teachings of Glory", count: 3 },
        { id: 112146, name: "Ethereal Glimmershard", count: 6 }
      ],
      lvl3: [
        { id: 202, name: "Mora", count: 17500 },
        { id: 104372, name: "Guide to Glory", count: 2 },
        { id: 112147, name: "Ethereal Crystal", count: 3 }
      ],
      lvl4: [
        { id: 202, name: "Mora", count: 25000 },
        { id: 104372, name: "Guide to Glory", count: 4 },
        { id: 112147, name: "Ethereal Crystal", count: 4 }
      ],
      lvl5: [
        { id: 202, name: "Mora", count: 30000 },
        { id: 104372, name: "Guide to Glory", count: 6 },
        { id: 112147, name: "Ethereal Crystal", count: 6 }
      ],
      lvl6: [
        { id: 202, name: "Mora", count: 37500 },
        { id: 104372, name: "Guide to Glory", count: 9 },
        { id: 112147, name: "Ethereal Crystal", count: 9 }
      ],
      lvl7: [
        { id: 202, name: "Mora", count: 120000 },
        { id: 104373, name: "Philosophies of Glory", count: 4 },
        { id: 112148, name: "Ethereal Crystalscale Stone", count: 4 },
        { id: 113087, name: "Counterfeit Resin", count: 1 }
      ],
      lvl8: [
        { id: 202, name: "Mora", count: 260000 },
        { id: 104373, name: "Philosophies of Glory", count: 6 },
        { id: 112148, name: "Ethereal Crystalscale Stone", count: 6 },
        { id: 113087, name: "Counterfeit Resin", count: 1 }
      ],
      lvl9: [
        { id: 202, name: "Mora", count: 450000 },
        { id: 104373, name: "Philosophies of Glory", count: 12 },
        { id: 112148, name: "Ethereal Crystalscale Stone", count: 9 },
        { id: 113087, name: "Counterfeit Resin", count: 2 }
      ],
      lvl10: [
        { id: 202, name: "Mora", count: 700000 },
        { id: 104373, name: "Philosophies of Glory", count: 16 },
        { id: 112148, name: "Ethereal Crystalscale Stone", count: 12 },
        { id: 113087, name: "Counterfeit Resin", count: 2 },
        { id: 104319, name: "Crown of Insight", count: 1 }
      ]
    }
  }
};

// ============================================================
// STYLES
// ============================================================

function addTalentStyles() {
  if (document.getElementById("talentFeatureStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "talentFeatureStyles";

  style.textContent = `
    .talent-results {
      margin-top: 25px;
      background: #10121a;
      border: 1px solid #292d38;
      border-radius: 7px;
      padding: 24px;
      color: #e8e8e8;
    }

    .talent-results-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #292d38;
    }

    .talent-results-label {
      margin: 0 0 6px;
      color: #d6b36a;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
    }

    .talent-results-title {
      margin: 0;
      color: #ffffff;
      font-size: 22px;
      font-weight: 600;
    }

    .talent-results-range {
      color: #d6b36a;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }

    .talent-total-title {
      margin: 0 0 15px;
      color: #d6b36a;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2px;
    }

    .talent-total-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 12px;
    }

    .talent-material-card {
      display: flex;
      align-items: center;
      gap: 13px;
      min-height: 70px;
      padding: 10px 13px;
      background: #181b25;
      border: 1px solid #292d38;
      border-radius: 6px;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }

    .talent-material-card:hover {
      border-color: #d6b36a;
      transform: translateY(-1px);
    }

    .talent-material-icon-wrapper {
      width: 48px;
      height: 48px;
      min-width: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f1118;
      border-radius: 6px;
      overflow: hidden;
    }

    .talent-material-icon {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }

    .talent-material-fallback {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #d6b36a;
      font-size: 20px;
    }

    .talent-material-info {
      flex: 1;
      min-width: 0;
    }

    .talent-material-name {
      color: #d8d8d8;
      font-size: 13px;
      line-height: 1.35;
    }

    .talent-material-count {
      margin-top: 5px;
      color: #d6b36a;
      font-size: 14px;
      font-weight: 700;
    }

    .talent-loading {
      padding: 30px 10px;
      text-align: center;
      color: #999da8;
      font-size: 14px;
    }

    .talent-error {
      padding: 18px;
      background: #241416;
      border: 1px solid #6b3030;
      border-radius: 6px;
      color: #e98d8d;
      font-size: 13px;
      line-height: 1.5;
    }

    .talent-empty {
      padding: 20px;
      color: #999da8;
      font-size: 13px;
      text-align: center;
      background: #181b25;
      border: 1px solid #292d38;
      border-radius: 6px;
    }

    @media (max-width: 700px) {
      .talent-results {
        padding: 18px;
      }

      .talent-results-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .talent-total-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

// ============================================================
// HELPERS
// ============================================================

function escapeTalentHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTalentNumber(value) {
  return Number(value).toLocaleString("en-IN");
}

function cleanTalentIconName(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/^https?:\/\/[^/]+\//i, "")
    .replace(/^.*\//, "")
    .replace(/\.png$/i, "");
}

// ============================================================
// MATERIAL IMAGE SOURCES
// ============================================================

function buildTalentImageSources(material, iconName) {
  const sources = [];

  const cleanName = cleanTalentIconName(iconName);

  if (cleanName) {
    sources.push(
      `https://gi.yatta.moe/assets/UI/${cleanName}.png`
    );

    sources.push(
      `https://api.ambr.top/assets/UI/${cleanName}.png`
    );

    sources.push(
      `https://enka.network/ui/${cleanName}.png`
    );
  }

  if (material && material.id != null) {
    const id = material.id;

    sources.push(
      `https://gi.yatta.moe/assets/UI/UI_ItemIcon_${id}.png`
    );

    sources.push(
      `https://api.ambr.top/assets/UI/UI_ItemIcon_${id}.png`
    );

    sources.push(
      `https://enka.network/ui/UI_ItemIcon_${id}.png`
    );
  }

  return [...new Set(sources)];
}

// ============================================================
// GET TALENT MATERIAL IMAGE SOURCES
// ============================================================

async function getTalentImageSources(material) {
  if (!material || !material.name) {
    return [];
  }

  const name = String(material.name).trim();

  if (!name) {
    return [];
  }

  if (talentMaterialImageCache.has(name)) {
    return talentMaterialImageCache.get(name);
  }

  let iconName = "";

  try {
    const url =
      `${TALENT_MATERIAL_API}` +
      `?query=${encodeURIComponent(name)}` +
      `&resultLanguage=english`;

    const response = await fetch(url);

    if (response.ok) {
      const responseText = await response.text();

      if (!responseText || !responseText.trim()) {
        throw new Error("Material API returned an empty response.");
      }

      const data = JSON.parse(responseText);

      let materialData = null;

      if (data && data.images) {
        materialData = data;
      } else if (data && data.result && data.result.images) {
        materialData = data.result;
      } else if (Array.isArray(data)) {
        materialData =
          data.find(item => item && item.images) || null;
      }

      iconName =
        materialData?.images?.nameicon ||
        materialData?.images?.filename_icon ||
        "";
    }
  } catch (error) {
    console.warn(
      `Icon metadata lookup failed for ${name}:`,
      error
    );
  }

  const sources = buildTalentImageSources(material, iconName);

  talentMaterialImageCache.set(name, sources);

  return sources;
}

// ============================================================
// RESOLVE ALL TALENT MATERIAL IMAGES
// ============================================================

async function resolveTalentMaterialImages(materials) {
  if (!Array.isArray(materials) || !materials.length) {
    return;
  }

  await Promise.all(
    materials.map(async material => {
      material.imageSources =
        await getTalentImageSources(material);
    })
  );
}

// ============================================================
// RESULT AREA
// ============================================================

function createTalentResultArea() {
  let area = document.getElementById("talentResults");

  if (area) {
    return area;
  }

  area = document.createElement("div");
  area.id = "talentResults";
  area.className = "talent-results";

  const ascensionArea =
    document.getElementById("ascensionResults");

  const button =
    document.getElementById("calculateMaterialsButton");

  if (ascensionArea) {
    ascensionArea.insertAdjacentElement("afterend", area);
  } else if (button) {
    button.insertAdjacentElement("afterend", area);
  }

  return area;
}

// ============================================================
// FETCH TALENT DATA
// ============================================================

async function fetchTalentData(
  characterName,
  displayName = characterName
) {
  const characterKey =
    String(characterName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const displayKey =
    String(displayName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  // Use manual data for the new characters.
  const manualData =
    MANUAL_TALENT_DATA[characterKey] ||
    MANUAL_TALENT_DATA[displayKey];

  if (manualData) {
    console.log(
      `Using manual talent data for ${displayName}`
    );

    return manualData;
  }

  const apiCharacterName =
    displayName || characterName;

  const url =
    `${TALENT_API}` +
    `?query=${encodeURIComponent(apiCharacterName)}` +
    `&resultLanguage=english`;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `Talent API returned HTTP ${response.status}.`
      );
    }

    // Read as text first to handle empty API responses safely.
    const responseText = await response.text();

    if (!responseText || !responseText.trim()) {
      throw new Error(
        "Talent API returned an empty response."
      );
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        "Talent API returned invalid JSON."
      );
    }

    if (data?.costs) {
      return data;
    }

    if (data?.result?.costs) {
      return data.result;
    }

    if (Array.isArray(data)) {
      const result = data.find(item => item?.costs);

      if (result) {
        return result;
      }
    }

    throw new Error(
      `No talent data was found for ${apiCharacterName}.`
    );

  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The talent API took too long to respond."
      );
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// GET TALENT LEVEL RANGE
// ============================================================

function getTalentLevelRange(fromId, toId) {
  return {
    from: Number(
      document.getElementById(fromId)?.value
    ),

    to: Number(
      document.getElementById(toId)?.value
    )
  };
}

// ============================================================
// ADD TALENT COSTS
// ============================================================

function addTalentCosts(totals, costs) {
  if (!costs) {
    return;
  }

  Object.values(costs).forEach(materials => {
    if (!Array.isArray(materials)) {
      return;
    }

    materials.forEach(material => {
      if (!material || !material.name) {
        return;
      }

      const key =
        material.id != null
          ? String(material.id)
          : material.name.toLowerCase();

      const count = Number(material.count) || 0;

      if (totals.has(key)) {
        totals.get(key).count += count;
      } else {
        totals.set(key, {
          id: material.id,
          name: material.name,
          count: count
        });
      }
    });
  });
}

// ============================================================
// GET COSTS FOR ONE TALENT
// ============================================================

function getCostsForTalentRange(
  talentData,
  fromLevel,
  toLevel
) {
  const totals = new Map();

  if (!talentData || !talentData.costs) {
    return totals;
  }

  for (
    let level = fromLevel + 1;
    level <= toLevel;
    level++
  ) {
    const costs =
      talentData.costs[`lvl${level}`];

    if (Array.isArray(costs)) {
      addTalentCosts(totals, {
        costs
      });
    }
  }

  return totals;
}

// ============================================================
// COMBINE THREE TALENTS
// ============================================================

function calculateCombinedTalentMaterials(
  talentData,
  ranges
) {
  const totals = new Map();

  ranges.forEach(range => {
    if (range.to <= range.from) {
      return;
    }

    const talentTotals =
      getCostsForTalentRange(
        talentData,
        range.from,
        range.to
      );

    talentTotals.forEach(material => {
      const key =
        material.id != null
          ? String(material.id)
          : material.name.toLowerCase();

      if (totals.has(key)) {
        totals.get(key).count += material.count;
      } else {
        totals.set(key, {
          id: material.id,
          name: material.name,
          count: material.count
        });
      }
    });
  });

  return [...totals.values()];
}


// ============================================================
// CREATE MATERIAL CARD
// ============================================================

function createTalentMaterialCard(material) {
  const card = document.createElement("div");

  card.className = "talent-material-card";

  const sources =
    Array.isArray(material.imageSources)
      ? material.imageSources
      : [];

  const firstSource = sources[0] || "";

  card.innerHTML = `
    <div class="talent-material-icon-wrapper">
      ${
        firstSource
          ? `
            <img
              class="talent-material-icon"
              src="${firstSource}"
              alt="${escapeTalentHtml(material.name)}"
              loading="lazy"
            >

            <div
              class="talent-material-fallback"
              style="display:none;"
            >
              ◆
            </div>
          `
          : `
            <div class="talent-material-fallback">
              ◆
            </div>
          `
      }
    </div>

    <div class="talent-material-info">
      <div class="talent-material-name">
        ${escapeTalentHtml(material.name)}
      </div>

      <div class="talent-material-count">
        ×${formatTalentNumber(material.count)}
      </div>
    </div>
  `;

  const image =
    card.querySelector(".talent-material-icon");

  if (image) {
    let index = 0;

    image.addEventListener("error", () => {
      index += 1;

      if (index < sources.length) {
        image.src = sources[index];
        return;
      }

      image.style.display = "none";

      const fallback =
        image.nextElementSibling;

      if (fallback) {
        fallback.style.display = "flex";
      }
    });
  }

  return card;
}

// ============================================================
// RENDER RESULTS
// ============================================================

async function renderTalentResults({
  characterName,
  ranges,
  materials
}) {
  const area = createTalentResultArea();

  area.innerHTML = `
    <div class="talent-loading">
      Loading material icons...
    </div>
  `;

  await resolveTalentMaterialImages(materials);

  const rangeText =
    ranges
      .map(
        range =>
          `${range.name} ${range.from} → ${range.to}`
      )
      .join("  •  ");

  area.innerHTML = `
    <div class="talent-results-header">
      <div>
        <p class="talent-results-label">
          TALENTS
        </p>

        <h3 class="talent-results-title">
          ${escapeTalentHtml(characterName)}
        </h3>
      </div>

      <div class="talent-results-range">
        ${escapeTalentHtml(rangeText)}
      </div>
    </div>

    <p class="talent-total-title">
      TOTAL TALENT MATERIALS
    </p>

    <div
      id="talentTotalGrid"
      class="talent-total-grid"
    ></div>
  `;

  const grid =
    document.getElementById("talentTotalGrid");

  materials.forEach(material => {
    grid.appendChild(
      createTalentMaterialCard(material)
    );
  });
}

// ============================================================
// MAIN CALCULATOR
// ============================================================

async function calculateTalentMaterials() {
  if (
    typeof selectedCharacterData === "undefined" ||
    !selectedCharacterData
  ) {
    console.error("No character selected.");
    return;
  }

  const ranges =
    TALENT_TYPES.map(talent => {
      const range =
        getTalentLevelRange(
          talent.fromId,
          talent.toId
        );

      return {
        name: talent.name,
        from: range.from,
        to: range.to
      };
    });

  const hasTalentUpgrade =
    ranges.some(
      range => range.to > range.from
    );

  const area = createTalentResultArea();

  if (!hasTalentUpgrade) {
    area.innerHTML = `
      <div class="talent-empty">
        No talent upgrades are required
        for the selected levels.
      </div>
    `;

    return;
  }

  area.innerHTML = `
    <div class="talent-loading">
      Calculating talent materials...
    </div>
  `;

  try {
    const talentLookupName =
      selectedCharacterData.id ||
      selectedCharacterData.name;

    const talentData =
      await fetchTalentData(
        talentLookupName,
        selectedCharacterData.name
      );

    if (!talentData || !talentData.costs) {
      throw new Error(
        "No talent cost data was found."
      );
    }

    const materials =
      calculateCombinedTalentMaterials(
        talentData,
        ranges
      );

    if (!materials.length) {
      throw new Error(
        "No talent materials were returned."
      );
    }

    materials.sort((a, b) => {
      if (Number(a.id) === 202) {
        return -1;
      }

      if (Number(b.id) === 202) {
        return 1;
      }

      return a.name.localeCompare(b.name);
    });

    await renderTalentResults({
      characterName: selectedCharacterData.name,
      ranges,
      materials
    });

  } catch (error) {
    console.error(
      "Talent calculation failed:",
      error
    );

    area.innerHTML = `
      <div class="talent-error">
        <strong>
          Unable to calculate talent materials.
        </strong>

        <br><br>

        ${escapeTalentHtml(
          error.message || "Unknown error."
        )}
      </div>
    `;
  }
}

// ============================================================
// INITIALIZE
// ============================================================

addTalentStyles();

const talentCalculateButton =
  document.getElementById(
    "calculateMaterialsButton"
  );

if (talentCalculateButton) {
  talentCalculateButton.addEventListener(
    "click",
    calculateTalentMaterials
  );
}