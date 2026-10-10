/* =========================================
   GENSHIN BUILD PLANNER
========================================= */


/* =========================================
   LOCAL CHARACTER DATABASE
========================================= */

/*
   characters[] comes from characters.js.

   IMPORTANT:
   There is NO character-data API anymore.
   The local database controls:
   - Name
   - Element
   - Weapon
   - Rarity

   The API is used ONLY for character images.
*/

const IMAGE_API =
  "https://genshin.jmp.blue/characters";


/*
   Add image URL to every local character.
*/

/* =========================================
   MANUAL IMAGE OVERRIDES
========================================= */

const manualImages = {

  chasca:
    "https://genshin.jmp.blue/characters/chasca/card",

  citlali:
    "https://genshin.jmp.blue/characters/citlali/card",

  columbina:
    "https://genshin.jmp.blue/characters/columbina/card",

  durin:
    "https://genshin.jmp.blue/characters/durin/card",

  escoffier:
    "https://genshin.jmp.blue/characters/escoffier/card",

  flins:
    "https://genshin.jmp.blue/characters/flins/card",

  ineffa:
    "https://genshin.jmp.blue/characters/ineffa/card",

  "kaedehara-kazuha":
    "https://genshin.jmp.blue/characters/kazuha/card",

  "kamisato-ayaka":
    "https://genshin.jmp.blue/characters/ayaka/card",

  "kamisato-ayato":
    "https://genshin.jmp.blue/characters/ayato/card",

  lauma:
    "https://genshin.jmp.blue/characters/lauma/card",

  linnea:
    "https://genshin.jmp.blue/characters/linnea/card",

  lohen:
    "https://genshin.jmp.blue/characters/lohen/card",

  mavuika:
    "https://genshin.jmp.blue/characters/mavuika/card",

  nefer:
    "https://genshin.jmp.blue/characters/nefer/card",

  nicole:
    "https://genshin.jmp.blue/characters/nicole/card",

  odette:
    "https://genshin.jmp.blue/characters/odette/card",

  "raiden-shogun":
    "https://genshin.jmp.blue/characters/raiden-shogun/card",

  sandrone:
    "https://genshin.jmp.blue/characters/sandrone/card",

  "sangonomiya-kokomi":
    "https://genshin.jmp.blue/characters/kokomi/card",

  skirk:
    "https://genshin.jmp.blue/characters/skirk/card",

  traveler:
    "https://genshin.jmp.blue/characters/traveler/card",

  varesa:
    "https://genshin.jmp.blue/characters/varesa/card",

  varka:
    "https://genshin.jmp.blue/characters/varka/card",

  vesna:
    "https://genshin.jmp.blue/characters/vesna/card",

  vodyanitsa:
    "https://genshin.jmp.blue/characters/vodyanitsa/card",

  xilonen:
    "https://genshin.jmp.blue/characters/xilonen/card",

  zibai:
    "https://genshin.jmp.blue/characters/zibai/card",

  "yumemizuki-mizuki":
    "https://genshin.jmp.blue/characters/mizuki/card"

};


/* =========================================
   APPLY IMAGE URLS
========================================= */

characters.forEach(character => {

  character.image =
    manualImages[character.id] ||
    `${IMAGE_API}/${character.id}/card`;

});


/* =========================================
   MAIN DATA
========================================= */

let selectedCharacterData = null;

let activeElement = "All";

let activeRarity = "All";


/* =========================================
   DOM
========================================= */

const characterGrid =
  document.getElementById("characterGrid");

const searchInput =
  document.getElementById("searchInput");

const filterButtons =
  document.querySelectorAll(".filter-button");

const rarityFilterButtons =
  document.querySelectorAll(
    ".rarity-filter-button"
  );


const selectedCharacter =
  document.getElementById(
    "selectedCharacter"
  );

const selectedCharacterIcon =
  document.getElementById(
    "selectedCharacterIcon"
  );

const selectedCharacterName =
  document.getElementById(
    "selectedCharacterName"
  );

const selectedCharacterDetails =
  document.getElementById(
    "selectedCharacterDetails"
  );

const openCalculatorButton =
  document.getElementById(
    "openCalculatorButton"
  );


const calculatorEmpty =
  document.getElementById(
    "calculatorEmpty"
  );

const calculatorContent =
  document.getElementById(
    "calculatorContent"
  );

const buildCharacterIcon =
  document.getElementById(
    "buildCharacterIcon"
  );

const buildCharacterName =
  document.getElementById(
    "buildCharacterName"
  );

const buildCharacterDetails =
  document.getElementById(
    "buildCharacterDetails"
  );

const resetButton =
  document.getElementById(
    "resetButton"
  );

const calculateMaterialsButton =
  document.getElementById(
    "calculateMaterialsButton"
  );

const validationMessage =
  document.getElementById(
    "validationMessage"
  );


/* =========================================
   RANGE ELEMENTS
========================================= */


/* Character */

const levelFrom =
  document.getElementById(
    "levelFrom"
  );

const levelTo =
  document.getElementById(
    "levelTo"
  );

const levelFromValue =
  document.getElementById(
    "levelFromValue"
  );

const levelToValue =
  document.getElementById(
    "levelToValue"
  );


/* Normal Attack */

const normalAttackFrom =
  document.getElementById(
    "normalAttackFrom"
  );

const normalAttackTo =
  document.getElementById(
    "normalAttackTo"
  );

const normalAttackFromValue =
  document.getElementById(
    "normalAttackFromValue"
  );

const normalAttackToValue =
  document.getElementById(
    "normalAttackToValue"
  );


/* Skill */

const skillFrom =
  document.getElementById(
    "skillFrom"
  );

const skillTo =
  document.getElementById(
    "skillTo"
  );

const skillFromValue =
  document.getElementById(
    "skillFromValue"
  );

const skillToValue =
  document.getElementById(
    "skillToValue"
  );


/* Burst */

const burstFrom =
  document.getElementById(
    "burstFrom"
  );

const burstTo =
  document.getElementById(
    "burstTo"
  );

const burstFromValue =
  document.getElementById(
    "burstFromValue"
  );

const burstToValue =
  document.getElementById(
    "burstToValue"
  );


/* Summary */

const summaryLevel =
  document.getElementById(
    "summaryLevel"
  );

const summaryNormal =
  document.getElementById(
    "summaryNormal"
  );

const summarySkill =
  document.getElementById(
    "summarySkill"
  );

const summaryBurst =
  document.getElementById(
    "summaryBurst"
  );


/* =========================================
   NORMALIZE ELEMENT
========================================= */

function normalizeElement(element) {

  if (!element) {
    return "Unknown";
  }


  const value =
    String(element)
      .trim()
      .toLowerCase();


  const elementMap = {

    pyro: "Pyro",
    fire: "Pyro",

    hydro: "Hydro",
    water: "Hydro",

    electro: "Electro",
    electric: "Electro",

    dendro: "Dendro",
    grass: "Dendro",

    cryo: "Cryo",
    ice: "Cryo",

    anemo: "Anemo",
    wind: "Anemo",

    geo: "Geo",
    rock: "Geo"

  };


  return (
    elementMap[value] ||
    element
  );

}


/* =========================================
   NORMALIZE RARITY
========================================= */

function normalizeRarity(rarity) {

  const value =
    Number(rarity);


  if (
    value >= 5 &&
    value < 100
  ) {

    return 5;

  }


  if (
    value >= 4 &&
    value < 100
  ) {

    return 4;

  }


  if (value === 104) {

    return 4;

  }


  if (value === 105) {

    return 5;

  }


  return 4;

}


/* =========================================
   SLUGIFY
========================================= */

function slugify(name) {

  return String(name)
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

}


/* =========================================
   DISPLAY CHARACTERS
========================================= */

function displayCharacters() {

  const searchTerm =
    searchInput.value
      .toLowerCase()
      .trim();


  const filteredCharacters =
    characters.filter(
      character => {

        /*
          SEARCH
        */

        const matchesSearch =
          character.name
            .toLowerCase()
            .includes(searchTerm);


        /*
          ELEMENT
        */

        const matchesElement =
          activeElement === "All" ||
          normalizeElement(
            character.element
          ) === activeElement;


        /*
          RARITY
        */

        const matchesRarity =
          activeRarity === "All" ||
          Number(character.rarity) ===
            Number(activeRarity);


        return (
          matchesSearch &&
          matchesElement &&
          matchesRarity
        );

      }
    );


  characterGrid.innerHTML = "";


  /*
    NO RESULTS
  */

  if (
    filteredCharacters.length === 0
  ) {

    characterGrid.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          🔍
        </div>

        <h3>
          No characters found
        </h3>

        <p>
          Try another search,
          element or rarity.
        </p>

      </div>

    `;

    return;

  }


  /*
    CREATE CHARACTER CARDS
  */

  filteredCharacters.forEach(
    character => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "character-card";


      /*
        SELECTED STATE
      */

      if (
        selectedCharacterData &&
        selectedCharacterData.id ===
          character.id
      ) {

        card.classList.add(
          "selected"
        );

      }


      card.innerHTML = `

        <div class="character-image-container">

          <img
            src="${character.image}"
            alt="${character.name}"
            class="character-image"
            loading="lazy"
          >

        </div>

        <h3>
          ${character.name}
        </h3>

        <p>
          ${character.element}
          •
          ${character.weapon}
        </p>

        <p class="character-rarity">
          ${"★".repeat(character.rarity)}
        </p>

      `;


      /*
        IMAGE FALLBACK
      */

      const image =
        card.querySelector(
          ".character-image"
        );


      image.addEventListener(
        "error",
        () => {

          const container =
            card.querySelector(
              ".character-image-container"
            );


          container.innerHTML = `

            <div class="character-icon">
              ${character.name.charAt(0)}
            </div>

          `;

        }
      );


      /*
        SELECT CHARACTER
      */

      card.addEventListener(
        "click",
        () => {

          selectCharacter(
            character
          );

        }
      );


      characterGrid.appendChild(
        card
      );

    }
  );

}


/* =========================================
   SELECT CHARACTER
========================================= */

function selectCharacter(
  character
) {

  selectedCharacterData =
    character;


  /*
    Selected character panel
  */

  selectedCharacterIcon.innerHTML = `

    <img
      src="${character.image}"
      alt="${character.name}"
    >

  `;


  selectedCharacterName.textContent =
    character.name;


  selectedCharacterDetails.textContent =
    `${character.element} • ${character.weapon} • ${"★".repeat(character.rarity)}`;


  /*
    Calculator character
  */

  buildCharacterIcon.innerHTML = `

    <img
      src="${character.image}"
      alt="${character.name}"
    >

  `;


  buildCharacterName.textContent =
    character.name;


  buildCharacterDetails.textContent =
    `${character.element} • ${character.weapon}`;


  /*
    Show selected character
  */

  selectedCharacter.classList.add(
    "show"
  );


  /*
    Hide empty calculator
  */

  calculatorEmpty.style.display = "none";


  /*
    Show calculator
  */

  calculatorContent.classList.add(
    "show"
  );


  /*
    Reset build targets
  */

  resetBuildTargets();


  /*
    Refresh cards
  */

  displayCharacters();


  /*
    Scroll to calculator
  */

  document
    .getElementById("calculator")
    .scrollIntoView({
      behavior: "smooth"
    });

}


/* =========================================
   ELEMENT FILTER
========================================= */

filterButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        /*
          Remove active from
          all element buttons
        */

        filterButtons.forEach(
          btn => {

            btn.classList.remove(
              "active"
            );

          }
        );


        /*
          Activate clicked button
        */

        button.classList.add(
          "active"
        );


        /*
          Store selected element
        */

        activeElement =
          button.dataset.element;


        /*
          Refresh character cards
        */

        displayCharacters();

      }
    );

  }
);


/* =========================================
   RARITY FILTER
========================================= */

rarityFilterButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        /*
          Remove active from
          all rarity buttons
        */

        rarityFilterButtons.forEach(
          btn => {

            btn.classList.remove(
              "active"
            );

          }
        );


        /*
          Activate clicked button
        */

        button.classList.add(
          "active"
        );


        /*
          Store selected rarity
        */

        activeRarity =
          button.dataset.rarity;


        /*
          Refresh character cards
        */

        displayCharacters();

      }
    );

  }
);


/* =========================================
   SEARCH
========================================= */

searchInput.addEventListener(
  "input",
  displayCharacters
);


/* =========================================
   OPEN CALCULATOR
========================================= */

openCalculatorButton.addEventListener(
  "click",
  () => {

    document
      .getElementById("calculator")
      .scrollIntoView({
        behavior: "smooth"
      });

  }
);


/* =========================================
   RANGE VALIDATION
========================================= */

function keepRangeValid(
  fromInput,
  toInput
) {

  const from =
    Number(fromInput.value);

  const to =
    Number(toInput.value);


  /*
    From cannot be greater
    than To.
  */

  if (from > to) {

    if (
      document.activeElement ===
      fromInput
    ) {

      toInput.value =
        from;

    }

    else {

      fromInput.value =
        to;

    }

  }

}


/* =========================================
   UPDATE RANGE VALUES
========================================= */

function updateSliderValues() {

  /*
    Character level
  */

  keepRangeValid(
    levelFrom,
    levelTo
  );


  levelFromValue.textContent =
    levelFrom.value;

  levelToValue.textContent =
    levelTo.value;


  /*
    Normal Attack
  */

  keepRangeValid(
    normalAttackFrom,
    normalAttackTo
  );


  normalAttackFromValue.textContent =
    normalAttackFrom.value;

  normalAttackToValue.textContent =
    normalAttackTo.value;


  /*
    Skill
  */

  keepRangeValid(
    skillFrom,
    skillTo
  );


  skillFromValue.textContent =
    skillFrom.value;

  skillToValue.textContent =
    skillTo.value;


  /*
    Burst
  */

  keepRangeValid(
    burstFrom,
    burstTo
  );


  burstFromValue.textContent =
    burstFrom.value;

  burstToValue.textContent =
    burstTo.value;


  /*
    Update summary
  */

  updateBuildSummary();

}


/* =========================================
   BUILD SUMMARY
========================================= */

function updateBuildSummary() {

  summaryLevel.textContent =
    `${levelFrom.value} → ${levelTo.value}`;


  summaryNormal.textContent =
    `${normalAttackFrom.value} → ${normalAttackTo.value}`;


  summarySkill.textContent =
    `${skillFrom.value} → ${skillTo.value}`;


  summaryBurst.textContent =
    `${burstFrom.value} → ${burstTo.value}`;

}


/* =========================================
   RANGE EVENTS
========================================= */

const rangeInputs = [

  levelFrom,
  levelTo,

  normalAttackFrom,
  normalAttackTo,

  skillFrom,
  skillTo,

  burstFrom,
  burstTo

];


rangeInputs.forEach(
  input => {

    input.addEventListener(
      "input",
      updateSliderValues
    );

  }
);


/* =========================================
   RESET BUILD
========================================= */

function resetBuildTargets() {

  /*
    Character level
  */

  levelFrom.value = 1;
  levelTo.value = 90;


  /*
    Normal Attack
  */

  normalAttackFrom.value = 1;
  normalAttackTo.value = 10;


  /*
    Skill
  */

  skillFrom.value = 1;
  skillTo.value = 10;


  /*
    Burst
  */

  burstFrom.value = 1;
  burstTo.value = 10;


  /*
    Hide validation message
  */

  validationMessage.classList.remove(
    "show"
  );


  /*
    Update values
  */

  updateSliderValues();

}


/* =========================================
   RESET BUTTON
========================================= */

resetButton.addEventListener(
  "click",
  resetBuildTargets
);


/* =========================================
   CALCULATE MATERIALS
========================================= */

/*
   The real Calculate Materials button is handled by
   ascension.js. Keeping a second click handler here
   would create competing results.
*/


/* =========================================
   INITIALIZE
========================================= */

/*
   Display the local character database.
*/

displayCharacters();


/*
   Set default build targets.
*/

resetBuildTargets();