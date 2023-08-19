const https = require('https');


const blob = `hey_kelvin	https://www.moxfield.com/decks/u5L4FEUQdkuSHyzrNeLCJg
kelvin_2	https://www.moxfield.com/decks/Y2v1HjkBmE22iiZIWVpr5w
canadianhighlanderdatabase	https://tappedout.net/mtg-decks/tezzeret-stax-nov-23rd-2019/`;

// const blob = `canadianhighlanderdatabase	https://tappedout.net/mtg-decks/tezzeret-stax-nov-23rd-2019/`;
// const blob = `hey_kelvin	https://www.moxfield.com/decks/u5L4FEUQdkuSHyzrNeLCJg`;
//mr_kelvin	https://www.moxfield.com/decks/CB_Bu5KnF06CgCShdZNNqA


// GET https://api2.moxfield.com/v3/decks/all/:deckHash
// res json data

const pointsList = {
  'Ancestral Recall': 7,
  'Black Lotus': 7,
  'Thassa\'s Oracle': 7,
  'Time Vault': 7,
  'Time Walk': 7,
  'Flash': 5,
  'Mana Crypt': 5,
  'Demonic Tutor': 4,
  'Sol Ring': 4,
  'Mox Pearl': 3,
  'Mox Sapphire': 3,
  'Mox Jet': 3,
  'Mox Ruby': 3,
  'Mox Emerald': 3,
  'Natural Order': 3,
  'Spellseeker': 3,
  'Strip Mine': 3,
  'Tinker': 3,
  'Underworld Breach': 3,
  'Gifts Ungiven': 2,
  'Umezawa\'s Jitte': 2,
  'Vampiric Tutor': 2,
  'Birthing Pod': 1,
  'Crop Rotation': 1,
  'Dig Through Time': 1,
  'Imperial Seal': 1,
  'Intuition': 1,
  'Mana Drain': 1,
  'Mana Vault': 1,
  'Merchant Scroll': 1,
  'Mystical Tutor': 1,
  'Price of Progress': 1,
  'Survival of the Fittest': 1,
  'Tainted Pact': 1,
  'Tolarian Academy': 1,
  'Transmute Artifact': 1,
  'Treasure Cruise': 1,
  'True-Name Nemesis': 1,
  'Wishclaw Talisman': 1,
  'Yawgmoth\s Will': 1,
};

const vintageBannedList = new Set([
  'Adriana\'s Valor',
  'Advantageous Proclamation',
  'Amulet of Quoz',
  'Assemble the Rank and Vile',
  'Backup Plan',
  'Brago\'s Favor',
  'Bronze Tablet',
  'Chaos Orb',
  'Cleanse',
  'Contract from Below',
  'Crusade',
  'Darkpact',
  'Demonic Attorney',
  'Double Stroke',
  'Echoing Boom',
  'Emissary\'s Ploy',
  'Falling Star',
  'Hired Heist',
  'Hold the Perimeter',
  'Hymn of the Wilds',
  'Immediate Action',
  'Imprison',
  'Incendiary Dissent',
  'Invoke Prejudice',
  'Iterative Analysis',
  'Jeweled Bird',
  'Jihad',
  'Muzzio\'s Preparations',
  'Natural Unity',
  'Power Play',
  'Pradesh Gypsies',
  'Rebirth',
  'Secrets of Paradise',
  'Secret Summoning',
  'Sentinel Dispatch',
  'Shahrazad',
  'Sovereign\'s Realm',
  'Stone-Throwing Devils',
  'Summoner\'s Bond',
  'Tempest Efreet',
  'Timmerian Fiends',
  'Unexpected Potential',
  'Weight Advantage',
  'Worldknit'
]);

const basics = new Set([
  'Plains',
  'Island',
  'Swamp',
  'Mountain',
  'Forest',
  'Snow-Covered Plains',
  'Snow-Covered Island',
  'Snow-Covered Swamp',
  'Snow-Covered Mountain',
  'Snow-Covered Forest',
  'Wastes'
]);

function parseSheets(blob) {
  const lines = blob.split('\n');
  const map = {};
  const reverseMap = {};

  for (const l of lines) {
    const [user, deck] = l.split(/[\s\t]/);
    map[user] = deck;
    reverseMap[deck] = user;
  }

  return [map, reverseMap];
}

function checkCardLegality(card, quantity, output) {
  output.count += quantity;

  if (!basics.has(card) && quantity > 1) {
    output.nonbasicDuplicates.push(card);
  }

  if (vintageBannedList.has(card)) {
    output.bannedCards.push(card);
  }

  if (pointsList[card]) {
    output.pointedCards.push(card);
    output.points += pointsList[card];
  }
}

function checkDeckLegality(output) {
  if (
    (output.count < 100) ||
    (output.points > 10) ||
    (output.nonbasicDuplicates.length > 0) ||
    (output.bannedCards.length > 0) ||
    (output.stickerDuplicates.length > 0) ||
    ((output.stickerCount > 0) && (output.stickerCount < 10))
  ) {
    output.isInvalid = true;
  }
}

function verifyMoxfield(blob) {
  try {
    const cards = blob.boards.mainboard.cards;
    const output = {
      name: blob.name,
      nonbasicDuplicates: [],
      bannedCards: [],
      stickerDuplicates: [],
      pointedCards: [],
      count: 0,
      points: 0,
      stickerCount: 0,
      isInvalid: false
    };

    for (const o of Object.values(cards)) {
      checkCardLegality(o.card.name, o.quantity, output);
    }

    if (blob.boards.stickers.count > 0) {
      for (const sticker of Object.values(blob.boards.stickers.cards)) {
        output.stickerCount += sticker.quantity;

        if (sticker.quantity > 1) {
          output.stickerDuplicates.push(sticker.card.name);
        }
      }
    }

    checkDeckLegality(output);

    return output;
  } catch (err) {
    throw Error(err.message);
  }
}

// https://tappedout.net/api/collection:deck/proliferate-superfriends-mar-18th-2020/data/?cb=1619568353&cat=type
// I think it uses a unix timestamp of when it was last updated in the api call... last_update_epoch
// oh, the whole deck is in a textarea element. that makes things easier
function verifyTappedout(xml) {
  const deckRegex = /(?<=id="mtga-textarea">)[\w\s\(\)',-]+(?=\n)/;
  const decklist = xml.match(deckRegex)[0];

  const nameRegex = /(?<=<title>)[\w\s\(\)',-\.]+(?=<\/title>)/;
  const name = xml.match(nameRegex)[0];
  const output = {
    name: name,
    nonbasicDuplicates: [],
    bannedCards: [],
    stickerDuplicates: [],
    pointedCards: [],
    count: 0,
    points: 0,
    stickerCount: 0,
    isInvalid: false
  };

  for (const line of decklist.split('\n')) {
    if (line.length > 0) {
      const count = Number(line.split(' ')[0]);
      const card = line.match(/(?<=\d\s).+(?=\s\()/)[0];
  
      checkCardLegality(card, count, output);
    }
  }

  checkDeckLegality(output);
  return output;
}

async function makeReq({ url, parser, type }) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
  
      // A chunk of data has been recieved.
      res.on("data", chunk => {
        data += chunk;
      });
  
      // The whole resonse has been received. Print out the result.
      res.on("end", () => {
        let output;
        if (type === 'JSON') {
          output = parser(JSON.parse(data));
        } else if (type === 'XML') {
          output = parser(data);
        }
        resolve(output);
      });
    }).on("error", err => {
      console.log("Error: " + err.message);
    });
  });
}

function rateLimit(delay, func, args) {
  return new Promise(async (resolve) => {
    const output = await func(args);
    setTimeout(() => {
      resolve(output);
    }, delay);
  });
}

// rate limited sequential https requests
async function processLinks(map, reverseMap) {
  const limit = 10000;
  const moxfieldIDs = [];
  const tappedoutLinks = [];
  const output = {};
  // const users = Object.keys(map);
  const links = Object.values(map);
  
  for (const link of links) {
    if (/moxfield/.test(link)) {
      moxfieldIDs.push(link.match(/(?<=https:\/\/www\.moxfield\.com\/decks\/)\w+/)[0]);
    } else if (/tappedout/.test(link)) {
      tappedoutLinks.push(link);
    }
  }

  for (let i = 0; i < moxfieldIDs.length; i++) {
    let res;
    if (i === moxfieldIDs.length - 1) {
      res = await rateLimit(0, makeReq, { url: `https://api2.moxfield.com/v3/decks/all/${moxfieldIDs[i]}`, parser: verifyMoxfield, type: 'JSON' });
    } else {
      res = await rateLimit(limit, makeReq, { url: `https://api2.moxfield.com/v3/decks/all/${moxfieldIDs[i]}`, parser: verifyMoxfield, type: 'JSON' });
    }
    output[reverseMap[`https://www.moxfield.com/decks/${moxfieldIDs[i]}`]] = res;
  }

  for (let j = 0; j < tappedoutLinks.length; j++) {
    if (j === tappedoutLinks.length - 1) {
      res = await rateLimit(0, makeReq, { url: tappedoutLinks[j], parser: verifyTappedout, type: 'XML' });
    } else {
      res = await rateLimit(10000, makeReq, { url: tappedoutLinks[j], parser: verifyTappedout, type: 'XML' });
    }
    output[reverseMap[tappedoutLinks[j]]] = res;
  }

  console.log(output);
}

processLinks(...parseSheets(blob));

async function testTappedout() {
  const tappedoutTest = await rateLimit(0, makeReq, { url: 'https://tappedout.net/mtg-decks/tezzeret-stax-nov-23rd-2019/', parser: verifyTappedout, type: 'XML' });
  console.log(tappedoutTest);
}

// testTappedout();
