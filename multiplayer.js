let me;
let shared;
let guests = [];
let room = "classroom";
let revisionRequested = false;
let articleRequested = false;
let marks = {};
let trails = [];
let lastPlayers = "";
let inkCombos = [
  ["FLUORESCENTYELLOW", "RISOFEDERALBLUE"],
  ["RED", "CORNFLOWER"],
  ["FLUORESCENTPINK", "TEAL"]
];

// https://antiboredom.github.io/p5.riso/
function makeInkCombos() {
  let seen = {};
  for (let i = 0; i < RISOCOLORS.length; i++) {
    let ink = RISOCOLORS[i];
    let rgb = ink.color[0] + "," + ink.color[1] + "," + ink.color[2];

    if (seen[rgb]) {
      continue;
    }
    if (ink.name == "WHITE" || ink.name == "CLEARMEDIUM") {
      continue;
    }

    seen[rgb] = true;
    for (let f = 0; f < 3; f++) {
      let fill = inkCombos[f][0];
      if (fill != ink.name && inkCombos[f][1] != ink.name) {
        inkCombos.push([fill, ink.name]);
      }
    }
  }
}

// p5.party ref
// https://p5party.org/examples/callbacks/
// https://p5party.org/examples/cursors/
// https://p5party.org/examples/idle_clicker/
function connectHunt() {
  let requestedRoom = getURLParams().room;
  // add ?room=something to the url to use a different room
  if (requestedRoom) {
    if (match(requestedRoom, "^[a-zA-Z0-9_-]{1,32}$")) {
      room = requestedRoom;
    }
  }

  partyConnect("wss://demoserver.p5party.org", "aditineti_wikihunt_v1", room, function () {
    partyToggleInfo(false);
    score.html("Connected. Loading your letter and the shared article…");

    partyLoadShared("article", { revision: 0 }, function (data) {
      shared = data;
      loadSharedArticle();
    });

    let alphabet = "abcdefghijklmnopqrstuvwxyz";
    let myId = floor(random(1000000000));
    let number = floor(random(alphabet.length));
    let myLetter = alphabet[number];
    // myLetter = "a"; // fixed letter test

    partyLoadMyShared({
      id: myId,
      letter: myLetter,
      combo: -1,
      colorOrder: -1,
      foundIds: [],
      total: 0,
      revision: 0,
      ready: false
    }, function (data) {
      me = data;
      // console.log("my letter is", me.letter);
      assignInkCombo();
      loadSharedArticle();
    });

    guests = partyLoadGuestShareds();
  });
}

function assignInkCombo() {
  if (!me) {
    return;
  }

  if (me.colorOrder < 0) {
    let order = 0;
    for (let p = 0; p < guests.length; p++) {
      if (guests[p].colorOrder >= order) {
        order = guests[p].colorOrder + 1;
      }
    }
    me.colorOrder = order;
  }

  let taken = {};
  let conflict = false;
  if (me.combo < 0) {
    conflict = true;
  }

  for (let p = 0; p < guests.length; p++) {
    let player = guests[p];
    if (player.id == me.id) {
      continue;
    }
    if (!(player.combo >= 0)) {
      continue;
    }

    taken[player.combo] = true;
    if (player.combo == me.combo) {
      if (player.colorOrder < me.colorOrder) {
        conflict = true;
      }
      if (player.colorOrder == me.colorOrder && player.id < me.id) {
        conflict = true;
      }
    }
  }

  if (conflict == true) {

    for (let i = 0; i <= guests.length; i++) {
      if (!taken[i]) {
        me.combo = i;
        // console.log("colour number", i);
        break;
      }
    }
    inkChanged = true;
  }
}

// https://www.mediawiki.org/wiki/API:Parsing_wikitext
function loadSharedArticle() {
  if (!shared) {
    return;
  }
  if (!me) {
    return;
  }
  if (articleRequested == true) {
    return;
  }

  let api = "https://en.wikipedia.org/w/api.php";
  let format = "&format=json&formatversion=2&origin=*";

  if (!shared.revision && revisionRequested == false) {
    revisionRequested = true;
    score.html("Choosing the shared Singapore article…");
    article.html("Loading Singapore from Wikipedia…");

    loadJSON(api + "?action=parse&page=Singapore&prop=revid" + format, function (data) {
      if (!data.parse) {
        articleError();
        return;
      }
      if (!data.parse.revid) {
        articleError();
        return;
      }
      if (!shared.revision) {
        shared.revision = data.parse.revid;
        // console.log("same page?", shared.revision);
      }
      loadSharedArticle();
    }, articleError);
  }

  if (shared.revision) {
    articleRequested = true;
    score.html("Your letter is " + me.letter + ". Loading Singapore…");
    article.html("Loading Singapore from Wikipedia…");
    loadJSON(api + "?action=parse&oldid=" + shared.revision + "&prop=text" + format, showArticle, articleError);
  }
}

function articleError() {
  score.html("The article couldn't load. Refresh to try again.");
  article.html("Couldn't load the article.");
}

function syncPlayers() {
  let signature = "";
  let players = "";

  for (let p = 0; p < guests.length; p++) {
    let player = guests[p];
    // check whether anything in the player list changed
    signature = signature + player.id + ":" + player.combo + ":" + player.ready + ":" + player.total + ":" + player.foundIds.length + ";";

    if (players != "") {
      players = players + " · ";
    }
    players = players + inkBadge(player) + player.letter + " " + player.foundIds.length + "/" + player.total;
    if (!player.ready) {
      players = players + " (loading)";
    }
  }

  if (signature == lastPlayers) {
    return;
  }
  lastPlayers = signature;
  trails = [];
  let view = article.position();

  for (let p = 0; p < guests.length; p++) {
    let player = guests[p];
    if (!player.ready) {
      continue;
    }
    if (player.revision != shared.revision) {
      continue;
    }
    if (!inkCombos[player.combo]) {
      continue;
    }

    let path = [];
    for (let i = 0; i < player.foundIds.length; i++) {
      let id = player.foundIds[i];
      if (!marks[id]) {
        let element = select("#" + id, article);
        if (!element) {
          continue;
        }
        marks[id] = new LetterTarget(element);
        marks[id].measure(view);
      }
      path.push(marks[id]);
    }

    let combo = inkCombos[player.combo];
    trails.push({ targets: path, fill: combo[0], stroke: combo[1] });
    // console.log("people here", guests.length);
  }

  inkChanged = true;
  updateScore(players);
}


function inkBadge(player) {
  let combo = inkCombos[player.combo];
  if (!combo) {
    return "";
  }

  let fillColor = color(getInk(combo[0]).channelColor);
  let strokeColor = color(getInk(combo[1]).channelColor);
  let badge = '<span style="display:inline-block;width:10px;height:10px;';
  badge = badge + 'border-radius:50%;vertical-align:middle;margin-right:5px;';
  badge = badge + 'background:' + fillColor + ';border:4px solid ' + strokeColor + ';"></span>';
  return badge;
}

function updateScore(players) {
  let message = "Room: " + room;
  message = message + " · Your letter: " + inkBadge(me) + "<b>" + me.letter + "</b>";
  message = message + " · Found " + found + " of " + total + ".";
  message = message + "<br> Hey, hey hey!!! Hunt your lowercase letter.";

  if (found == total) {
    message = "You found every " + me.letter + "! " + found + " of " + total + ". Room: " + room + ".";
  }

  score.html(message + "<br>Live hunts: " + players);
}
