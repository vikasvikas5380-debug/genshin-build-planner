/* =========================================
   GENSHIN CHARACTER IMAGES
   ENKA NETWORK
========================================= */


/*
   Enka uses names such as:

   UI_AvatarIcon_Arlecchino.png
   UI_AvatarIcon_Furina.png
   UI_AvatarIcon_Kazuha.png

   This file makes ALL character cards
   use the same image source.
*/


const ENKA_IMAGE_API =
  "https://enka.network/ui/";


/* =========================================
   SPECIAL CHARACTER ICON NAMES
========================================= */

const CHARACTER_ICON_OVERRIDES = {

  /* =========================================
     CHARACTERS WITH DIFFERENT INTERNAL NAMES
  ========================================= */

  alhaitham:
    "Alhatham",

  amber:
    "Ambor",

  "arataki-itto":
    "Itto",

  baizhu:
    "Baizhuer",

  "hu-tao":
    "Hutao",

  jean:
    "Qin",

  kirara:
    "Momoka",

  "kujou-sara":
    "Sara",

  "kuki-shinobu":
    "Shinobu",

  raiden:
    "Raiden",

  "raiden-shogun": "Shougun",

  sandrone:
    "MarionetteNew",

  ororon:
    "Olorun",

  xianyun:
    "Liuyun",

  "yae-miko":
    "Yae",

  lynette:
    "Linette",

  "shikanoin-heizou":
    "Heizo",

  heizou:
    "Heizo",

  thoma:
    "Tohma",

  yanfei:
    "Feiyan",

  noelle:
    "Noel",

  "yun-jin":
    "Yunjin",

  "lan-yan":
    "Lanyan",

  lyney:
    "Liney",


  /* =========================================
     OTHER SPECIAL NAMES
  ========================================= */

  "kaedehara-kazuha":
    "Kazuha",

  "kamisato-ayaka":
    "Ayaka",

  "kamisato-ayato":
    "Ayato",

  "sangonomiya-kokomi":
    "Kokomi",

  "yumemizuki-mizuki":
    "Mizuki",

  "shikanoin-heizou":
    "Heizo",

  "kuki-shinobu":
    "Shinobu",

  "yae-miko":
    "Yae",

  xianyun:
    "Liuyun",

  "hu-tao":
    "Hutao",

  "xilonen":
    "Xilonen",

  skirk:
    "SkirkNew",

  mavuika:
    "Mavuika",

  ineffa:
    "Ineffa",

  flins:
    "Flins",

  escoffier:
    "Escoffier",

  durin:
    "Durin",

  columbina:
    "Columbina",

  citlali:
    "Citlali",

  chasca:
    "Chasca",

  varesa:
    "Varesa",

  varka:
    "Varka",

  vesna:
    "Vesna",

  vodyanitsa:
    "Vodyanitsa",

  zibai:
    "Zibai",

  lauma:
    "Lauma",

  linnea:
    "Linnea",

  lohen:
    "Lohen",

  nefer:
    "Nefer",

  nicole:
    "Nicole",

  odette:
    "Odette"

};

/* =========================================
   CONVERT ID → ENKA ICON NAME
========================================= */

function characterIdToIconName(id) {

  if (
    CHARACTER_ICON_OVERRIDES[id]
  ) {

    return CHARACTER_ICON_OVERRIDES[id];

  }


  /*
     Example:

     arlecchino
     ↓
     Arlecchino

     furina
     ↓
     Furina

     dainsleif
     ↓
     Dainsleif
  */

  return String(id)
    .split("-")
    .map(
      part =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join("");

}


/* =========================================
   CREATE ENKA IMAGE URL
========================================= */

function getEnkaCharacterImage(
  character
) {

  const iconName =
    characterIdToIconName(
      character.id
    );


  return (
    `${ENKA_IMAGE_API}` +
    `UI_AvatarIcon_${iconName}.png`
  );

}


/* =========================================
   APPLY TO ALL CHARACTERS
========================================= */

characters.forEach(
  character => {

    character.image =
      getEnkaCharacterImage(
        character
      );

  }
);


/* =========================================
   SPECIAL TRAVELER HANDLING
========================================= */

/*
   Traveler can represent Aether or Lumine.

   We're using Lumine here.
*/

const traveler =
  characters.find(
    character =>
      character.id === "traveler"
  );


if (traveler) {

  traveler.image =
    `${ENKA_IMAGE_API}` +
    "UI_AvatarIcon_PlayerGirl.png";

}


/* =========================================
   REFRESH CHARACTER GRID
========================================= */

if (
  typeof displayCharacters === "function"
) {

  displayCharacters();

}


/* =========================================
   DEBUG
========================================= */

console.log(
  `Using Enka images for ${characters.length} characters.`
);