const https = require('https');

const blob = `
https://www.moxfield.com/decks/Y2v1HjkBmE22iiZIWVpr5w
https://www.moxfield.com/decks/u5L4FEUQdkuSHyzrNeLCJg
`;

const decklists = blob.split('\n');

// GET https://api2.moxfield.com/v3/decks/all/:deckHash
// res json data

/* 
  cards (count): >= 100
  quantity: 1 except basics
  pointsMax: 10
*/

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

// const criteria = {
//   minCount: 100,
//   pointsMax: 10,
//   nonbasicCount: 1,
// };

// check sticker/attactions >= 10
function verifyMoxfield(blob) {
  try {
    const cards = blob.boards.mainboard.cards;
    const output = {
      nonbasicDuplicates: [],
      bannedCards: [],
      count: 0,
      points: 0,
      isInvalid: false
    };

    for (const o of Object.values(cards)) {
      const card = o.card;

      output.count += o.quantity;

      if (!/^Basic/.test(card.type_line) && (o.quantity > 1)) {
        output.nonbasicDuplicates.push(card.name);
      }
      
      if (card.legalities.vintage === 'banned') {
        output.bannedCards.push(card.name);
      }
      
      if (pointsList[card.name]) {
        output.points += pointsList[card.name];
      }
    }

    if (
      (output.count < 100) ||
      (output.points > 10) ||
      (output.nonbasicDuplicates.length > 0) ||
      (output.bannedCards.length > 0)
    ) {
      output.isInvalid = true;
    }

    return output;
  } catch (err) {
    throw Error(err.message);
  }
}

function makeMoxfieldReq(id) {
  https.get(`https://api2.moxfield.com/v3/decks/all/${id}`, (res) => {
    let data = "";

    // A chunk of data has been recieved.
    res.on("data", chunk => {
      data += chunk;
    });

    // The whole resonse has been received. Print out the result.
    res.on("end", () => {
      const output = verifyMoxfield(JSON.parse(data));
      console.log(output);
      return output;
    });
  }).on("error", err => {
    console.log("Error: " + err.message);
  });
}

function rateLimit(delay, func, args) {
  return new Promise(async (resolve) => {
    const output = await func(args);
    console.log('moving on to timer'); //shit
    setTimeout(() => {
      resolve(output);
    }, delay);
  });
}

// rate limited sequential https requests
async function processLinks (links) {
  const limit = 10000;
  const moxfieldIDs = [];
  const output = [];

  for (const link of links) {
    if (/moxfield/.test(link)) {
      moxfieldIDs.push(link.match(/(?<=https:\/\/www\.moxfield\.com\/decks\/)\w+/)[0]);
    }
  }

  for (let i = 0; i < moxfieldIDs.length; i++) {
    let res;
    if (i === moxfieldIDs.length - 1) {
      res = await rateLimit(0, makeMoxfieldReq, moxfieldIDs[i]);
    } else {
      res = await rateLimit(limit, makeMoxfieldReq, moxfieldIDs[i]);
    }
    output.push(res);
  }

  console.log(output);
}

processLinks(decklists);


// async function f1() {
//   const ids = ['Y2v1HjkBmE22iiZIWVpr5w', 'u5L4FEUQdkuSHyzrNeLCJg'];
//   for (let i = 0; i < ids.length; i++) {
//     if (i === ids.length - 1) {
//       await rateLimit(0, makeMoxfieldReq, ids[i]);
//     } else await rateLimit(10000, makeMoxfieldReq, ids[i]);
//   }
// }

// f1();

