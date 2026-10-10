// ============================================================
// GENSHIN BUILD PLANNER - CHARACTER ASCENSION CALCULATOR
// ============================================================

const ASCENSION_API =
  "https://genshin-db-api.vercel.app/api/v5/characters";

const ASCENSION_MATERIAL_API =
  "https://genshin-db-api.vercel.app/api/v5/materials";

const ASCENSION_STAGES = [
  { key: "ascend1", unlockLevel: 20 },
  { key: "ascend2", unlockLevel: 40 },
  { key: "ascend3", unlockLevel: 50 },
  { key: "ascend4", unlockLevel: 60 },
  { key: "ascend5", unlockLevel: 70 },
  { key: "ascend6", unlockLevel: 80 }
];

const ascensionMaterialImageCache = new Map();


// ============================================================
// STYLES
// ============================================================

function addAscensionStyles() {

  if (
    document.getElementById(
      "ascensionFeatureStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "ascensionFeatureStyles";

  style.textContent = `

    .ascension-results {

      margin-top: 25px;

      background: #10121a;

      border: 1px solid #292d38;

      border-radius: 7px;

      padding: 24px;

      color: #e8e8e8;

    }


    .ascension-results-header {

      display: flex;

      justify-content: space-between;

      align-items: flex-end;

      gap: 20px;

      margin-bottom: 24px;

      padding-bottom: 18px;

      border-bottom: 1px solid #292d38;

    }


    .ascension-results-label {

      margin: 0 0 6px;

      color: #d6b36a;

      font-size: 11px;

      font-weight: 700;

      letter-spacing: 2px;

    }


    .ascension-results-title {

      margin: 0;

      color: #ffffff;

      font-size: 22px;

      font-weight: 600;

    }


    .ascension-results-range {

      color: #d6b36a;

      font-size: 14px;

      font-weight: 600;

      white-space: nowrap;

    }


    .ascension-total-title {

      margin: 0 0 15px;

      color: #d6b36a;

      font-size: 12px;

      font-weight: 700;

      letter-spacing: 2px;

    }


    .ascension-total-grid {

      display: grid;

      grid-template-columns:
        repeat(auto-fill, minmax(230px, 1fr));

      gap: 12px;

    }


    .ascension-material-card {

      display: flex;

      align-items: center;

      gap: 13px;

      min-height: 70px;

      padding: 10px 13px;

      background: #181b25;

      border: 1px solid #292d38;

      border-radius: 6px;

      transition:
        border-color 0.2s ease,
        transform 0.2s ease;

    }


    .ascension-material-card:hover {

      border-color: #d6b36a;

      transform: translateY(-1px);

    }


    .ascension-material-icon-wrapper {

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


    .ascension-material-icon {

      width: 48px;

      height: 48px;

      object-fit: contain;

    }


    .ascension-material-fallback {

      width: 48px;

      height: 48px;

      display: flex;

      align-items: center;

      justify-content: center;

      color: #d6b36a;

      font-size: 20px;

    }


    .ascension-material-info {

      flex: 1;

      min-width: 0;

    }


    .ascension-material-name {

      color: #d8d8d8;

      font-size: 13px;

      line-height: 1.35;

    }


    .ascension-material-count {

      margin-top: 5px;

      color: #d6b36a;

      font-size: 14px;

      font-weight: 700;

    }


    .ascension-loading {

      padding: 30px 10px;

      text-align: center;

      color: #999da8;

      font-size: 14px;

    }


    .ascension-error {

      padding: 18px;

      background: #241416;

      border: 1px solid #6b3030;

      border-radius: 6px;

      color: #e98d8d;

      font-size: 13px;

      line-height: 1.5;

    }


    .ascension-empty {

      padding: 20px;

      color: #999da8;

      font-size: 13px;

      text-align: center;

      background: #181b25;

      border: 1px solid #292d38;

      border-radius: 6px;

    }


    @media (max-width: 700px) {

      .ascension-results {

        padding: 18px;

      }


      .ascension-results-header {

        align-items: flex-start;

        flex-direction: column;

      }


      .ascension-total-grid {

        grid-template-columns: 1fr;

      }

    }

  `;

  document.head.appendChild(style);
}


// ============================================================
// HELPERS
// ============================================================

function escapeAscensionHtml(value) {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}


function formatAscensionNumber(value) {

  return Number(value)
    .toLocaleString("en-IN");

}


function cleanAscensionIconName(value) {

  if (!value) {

    return "";

  }

  return String(value)

    .replace(
      /^https?:\/\/[^/]+\//i,
      ""
    )

    .replace(/^.*\//, "")

    .replace(/\.png$/i, "");

}


// ============================================================
// MATERIAL IMAGE SOURCES
// ============================================================

function buildAscensionImageSources(
  material,
  iconName
) {

  const sources = [];

  const cleanName =
    cleanAscensionIconName(
      iconName
    );


  // ----------------------------------------------------------
  // Exact icon filename from genshin-db
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // Numeric ID fallback
  // ----------------------------------------------------------

  if (
    material &&
    material.id != null
  ) {

    const id =
      material.id;


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


  return [
    ...new Set(sources)
  ];

}


// ============================================================
// GET MATERIAL IMAGE SOURCES
// ============================================================

async function getAscensionImageSources(
  material
) {

  if (
    !material ||
    !material.name
  ) {

    return [];

  }


  const name =
    String(material.name)
      .trim();


  if (!name) {

    return [];

  }


  if (
    ascensionMaterialImageCache.has(
      name
    )
  ) {

    return ascensionMaterialImageCache.get(
      name
    );

  }


  let iconName = "";


  try {

    const url =
      `${ASCENSION_MATERIAL_API}` +
      `?query=${encodeURIComponent(name)}` +
      `&resultLanguage=english`;


    const response =
      await fetch(url);


    if (response.ok) {

      const data =
        await response.json();


      let materialData = null;


      if (
        data &&
        data.images
      ) {

        materialData =
          data;

      }

      else if (
        data &&
        data.result &&
        data.result.images
      ) {

        materialData =
          data.result;

      }

      else if (
        Array.isArray(data)
      ) {

        materialData =
          data.find(
            item =>
              item &&
              item.images
          ) || null;

      }


      /*
        genshin-db material data uses
        images.nameicon for the actual
        Genshin item icon name.
      */

      iconName =
        materialData?.images?.nameicon ||
        materialData?.images?.filename_icon ||
        "";

    }

  }

  catch (error) {

    console.warn(
      `Icon metadata lookup failed for ${name}:`,
      error
    );

  }


  const sources =
    buildAscensionImageSources(
      material,
      iconName
    );


  ascensionMaterialImageCache.set(
    name,
    sources
  );


  return sources;

}


// ============================================================
// RESOLVE ALL MATERIAL IMAGES
// ============================================================

async function resolveAscensionMaterialImages(
  materials
) {

  await Promise.all(

    materials.map(
      async material => {

        material.imageSources =
          await getAscensionImageSources(
            material
          );

      }
    )

  );

}


// ============================================================
// CREATE RESULT AREA
// ============================================================

function createAscensionResultArea() {

  let area =
    document.getElementById(
      "ascensionResults"
    );


  if (area) {

    return area;

  }


  area =
    document.createElement("div");


  area.id =
    "ascensionResults";


  area.className =
    "ascension-results";


  const button =
    document.getElementById(
      "calculateMaterialsButton"
    );


  if (button) {

    button.insertAdjacentElement(
      "afterend",
      area
    );

  }


  return area;

}


// ============================================================
// REQUIRED ASCENSION STAGES
// ============================================================

function getRequiredAscensionStages(
  fromLevel,
  toLevel
) {

  return ASCENSION_STAGES.filter(
    stage =>

      fromLevel <
        stage.unlockLevel &&

      toLevel >=
        stage.unlockLevel
  );

}


// ============================================================
// SUM MATERIALS
// ============================================================

function sumAscensionMaterials(
  stages,
  costs
) {

  const totals =
    new Map();


  stages.forEach(
    stage => {

      const materials =
        costs?.[stage.key];


      if (
        !Array.isArray(materials)
      ) {

        return;

      }


      materials.forEach(
        material => {

          if (
            !material ||
            !material.name
          ) {

            return;

          }


          const key =
            material.id != null
              ? String(material.id)
              : material.name
                  .toLowerCase();


          const count =
            Number(material.count) || 0;


          if (
            totals.has(key)
          ) {

            totals.get(key).count +=
              count;

          }

          else {

            totals.set(
              key,
              {
                id:
                  material.id,

                name:
                  material.name,

                count:
                  count
              }
            );

          }

        }
      );

    }
  );


  return [
    ...totals.values()
  ];

}


// ============================================================
// API RESPONSE
// ============================================================

function getAscensionCharacterData(
  data
) {

  if (
    data &&
    data.costs
  ) {

    return data;

  }


  if (
    data &&
    data.result &&
    data.result.costs
  ) {

    return data.result;

  }


  if (
    Array.isArray(data)
  ) {

    return (
      data.find(
        item =>
          item &&
          item.costs
      ) || null
    );

  }


  return null;

}


// ============================================================
// FETCH CHARACTER DATA
// ============================================================

async function fetchAscensionCharacterData(
  characterName
) {

  const url =
    `${ASCENSION_API}` +
    `?query=${encodeURIComponent(characterName)}` +
    `&resultLanguage=english`;


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      15000
    );


  try {

    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `API returned HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    return getAscensionCharacterData(
      data
    );

  }

  catch (error) {

    if (
      error.name ===
      "AbortError"
    ) {

      throw new Error(
        "The material API took too long to respond."
      );

    }


    throw error;

  }

  finally {

    clearTimeout(timeout);

  }

}


// ============================================================
// CREATE MATERIAL CARD
// ============================================================

function createAscensionMaterialCard(
  material
) {

  const card =
    document.createElement("div");


  card.className =
    "ascension-material-card";


  const sources =
    Array.isArray(
      material.imageSources
    )
      ? material.imageSources
      : [];


  const firstSource =
    sources[0] || "";


  card.innerHTML = `

    <div
      class="ascension-material-icon-wrapper"
    >

      ${
        firstSource

          ? `

            <img
              class="ascension-material-icon"
              src="${firstSource}"
              alt="${escapeAscensionHtml(
                material.name
              )}"
              loading="lazy"
            >

            <div
              class="ascension-material-fallback"
              style="display:none;"
            >
              ◆
            </div>

          `

          : `

            <div
              class="ascension-material-fallback"
            >
              ◆
            </div>

          `
      }

    </div>


    <div
      class="ascension-material-info"
    >

      <div
        class="ascension-material-name"
      >
        ${escapeAscensionHtml(
          material.name
        )}
      </div>


      <div
        class="ascension-material-count"
      >
        ×${formatAscensionNumber(
          material.count
        )}
      </div>

    </div>

  `;


  const image =
    card.querySelector(
      ".ascension-material-icon"
    );


  if (image) {

    let index = 0;


    image.addEventListener(
      "error",
      () => {

        index += 1;


        if (
          index <
          sources.length
        ) {

          image.src =
            sources[index];

          return;

        }


        image.style.display =
          "none";


        const fallback =
          image.nextElementSibling;


        if (fallback) {

          fallback.style.display =
            "flex";

        }

      }
    );

  }


  return card;

}


// ============================================================
// RENDER RESULTS
// ============================================================

async function renderAscensionResults({
  characterName,
  fromLevel,
  toLevel,
  materials
}) {

  const area =
    createAscensionResultArea();


  area.innerHTML = `

    <div
      class="ascension-loading"
    >
      Loading material icons...
    </div>

  `;


  await resolveAscensionMaterialImages(
    materials
  );


  area.innerHTML = `

    <div
      class="ascension-results-header"
    >

      <div>

        <p
          class="ascension-results-label"
        >
          ASCENSION
        </p>


        <h3
          class="ascension-results-title"
        >
          ${escapeAscensionHtml(
            characterName
          )}
        </h3>

      </div>


      <div
        class="ascension-results-range"
      >
        Level ${fromLevel} → ${toLevel}
      </div>

    </div>


    <p
      class="ascension-total-title"
    >
      TOTAL ASCENSION MATERIALS
    </p>


    <div
      id="ascensionTotalGrid"
      class="ascension-total-grid"
    ></div>

  `;


  const grid =
    document.getElementById(
      "ascensionTotalGrid"
    );


  materials.forEach(
    material => {

      grid.appendChild(
        createAscensionMaterialCard(
          material
        )
      );

    }
  );

}


// ============================================================
// MAIN CALCULATOR
// ============================================================

async function calculateCharacterAscensionMaterials() {

  if (
    typeof selectedCharacterData ===
      "undefined" ||
    !selectedCharacterData
  ) {

    console.error(
      "No character selected."
    );

    return;

  }


  const fromLevel =
    Number(
      document.getElementById(
        "levelFrom"
      )?.value
    );


  const toLevel =
    Number(
      document.getElementById(
        "levelTo"
      )?.value
    );


  const area =
    createAscensionResultArea();


  if (
    !Number.isFinite(fromLevel) ||
    !Number.isFinite(toLevel)
  ) {

    area.innerHTML = `

      <div
        class="ascension-error"
      >
        Invalid level values.
      </div>

    `;

    return;

  }


  if (
    toLevel <= fromLevel
  ) {

    area.innerHTML = `

      <div
        class="ascension-error"
      >
        Target level must be higher than
        the current level.
      </div>

    `;

    return;

  }


  const stages =
    getRequiredAscensionStages(
      fromLevel,
      toLevel
    );


  if (
    !stages.length
  ) {

    area.innerHTML = `

      <div
        class="ascension-empty"
      >
        No character ascension is required
        between Level ${fromLevel}
        and Level ${toLevel}.
      </div>

    `;

    return;

  }


  area.innerHTML = `

    <div
      class="ascension-loading"
    >
      Calculating ascension materials...
    </div>

  `;


  try {

    const characterData =
      await fetchAscensionCharacterData(
        selectedCharacterData.name
      );


    if (
      !characterData ||
      !characterData.costs
    ) {

      throw new Error(
        "No ascension data was found for this character."
      );

    }


    const materials =
      sumAscensionMaterials(
        stages,
        characterData.costs
      );


    if (
      !materials.length
    ) {

      throw new Error(
        "No ascension materials were returned by the API."
      );

    }


    materials.sort(
      (a, b) => {

        if (
          Number(a.id) === 202
        ) {

          return -1;

        }


        if (
          Number(b.id) === 202
        ) {

          return 1;

        }


        return a.name.localeCompare(
          b.name
        );

      }
    );


    await renderAscensionResults({

      characterName:
        selectedCharacterData.name,

      fromLevel,

      toLevel,

      materials

    });

  }

  catch (error) {

    console.error(
      "Ascension calculation failed:",
      error
    );


    area.innerHTML = `

      <div
        class="ascension-error"
      >

        <strong>
          Unable to calculate materials.
        </strong>

        <br><br>

        ${escapeAscensionHtml(
          error.message ||
          "Unknown error."
        )}

      </div>

    `;

  }

}


// ============================================================
// INITIALIZE
// ============================================================

addAscensionStyles();


const ascensionCalculateButton =
  document.getElementById(
    "calculateMaterialsButton"
  );


if (
  ascensionCalculateButton
) {

  ascensionCalculateButton.addEventListener(
    "click",
    calculateCharacterAscensionMaterials
  );

}

else {

  console.error(
    "Calculate Materials button was not found."
  );

}