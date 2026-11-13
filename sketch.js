let article;
let score;
let targets = [];
let layoutChanged = true;
let inks = {};
let cursorFillInk;
let cursorStrokeInk;
let inkWeight = 10;
let inkChanged = true;
let lastScrollX = -1;
let lastScrollY = -1;
let lastTop = -1;
let found = 0;
let total = 0;


let x = 2;
let y = 60;
let vx = 0;
let vy = 0;
let blockSize = 20;
let ready = false;

// wikipedia referenc!!! https://thecodingtrain.com/challenges/75-wikipedia-api
// https://www.mediawiki.org/wiki/API:Action_API

function setup() {
  // console.log("starting??");
  pixelDensity(1);
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.position(0, 0, "fixed");
  canvas.style("pointer-events", "none");
  canvas.style("z-index", "2");
  canvas.style("mix-blend-mode", "multiply");

  makeInkCombos();

  score = createDiv("Connecting to the class hunt…");
  score.style("padding", "16px 24px");
  score.style("border-bottom", "1px solid #ddd");

  article = createDiv("Waiting for the shared Singapore article…");
  article.style("flex", "1");
  article.style("min-height", "0");
  article.style("overflow-y", "auto");
  article.style("padding", "24px");

  connectHunt();
}

function getInk(name) {
  if (!inks[name]) {
    inks[name] = new Riso(name);
  }
  return inks[name];
}

function showArticle(data) {
  if (!data.parse) {
    articleError();
    return;
  }
  if (typeof data.parse.text != "string") {
    articleError();
    return;
  }

  let page = data.parse.text;
  // console.log(page);
  let highlighted = "";
  let tag = "";
  let inTag = false;

  // let inStyle = false;
  // let inEntity = false;

  let inStyle = false;
  let inEntity = false;
  let id = 0;

  for (let i = 0; i < page.length; i++) {
    let letter = page[i];
    // console.log(i, letter, inTag);

    if (letter == "<") {
      inTag = true;
      tag = "";
    }
    if (inTag == true) {
      tag = tag + letter;
    }
    if (inTag == false && letter == "&") {
      inEntity = true;
    }

    if (inTag == true || inStyle == true || inEntity == true) {
      highlighted = highlighted + letter;
    } else {
      if (letter >= "a" && letter <= "z") {
        highlighted = highlighted + '<span class="letter-' + letter + '" id="letter-' + id + '">' + letter + '</span>';
        id = id + 1;
      } else {
        highlighted = highlighted + letter;
      }
    }

    if (letter == ";") {
      inEntity = false;
    }
    if (letter == ">") {
      inTag = false;
      if (match(tag, "^<(style|script)")) {
        inStyle = true;
      }
      if (match(tag, "^</(style|script)")) {
        inStyle = false;
      }
    }
  }

  // article.html(page.replace(/<[^>]*>/g, ""));

  article.html(highlighted);
  startGame();
}

function startGame() {
  found = 0;
  total = 0;
  targets = [];
  marks = {};
  inkChanged = true;

  let links = selectAll("a", article);
  for (let i = 0; i < links.length; i++) {
    links[i].style("color", links[i].style("color"));
    links[i].removeAttribute("href");
  }

  let spans = selectAll(".letter-" + me.letter, article);
  for (let i = 0; i < spans.length; i++) {
    let letter = spans[i];

    if (letter.width > 0 && letter.height > 0) {
      if (letter.style("visibility") != "hidden") {
        let target = new LetterTarget(letter);
        targets.push(target);
        marks[target.id] = target;
        total = total + 1;
      }
    }
  }

  let images = selectAll("img", article);
  for (let i = 0; i < images.length; i++) {
    images[i].elt.onload = function () {
      layoutChanged = true;
    };
  }

  x = 2;
  y = article.position().y + 2;
  vx = 0;
  vy = 0;
  layoutChanged = true;
  ready = true;
  me.revision = shared.revision;
  me.total = total;
  // console.log("how many letters", total);
  me.ready = true;
  updateScore("");
}

function draw() {
  clear();
  assignInkCombo();
  loadSharedArticle();

  if (ready == false) {
    return;
  }
  if (layoutChanged == true) {
    measureLetters();
  }
  syncPlayers();
  // https://p5js.org/reference/p5/deltaTime/
  let step = deltaTime;
  if (step > 40) {
    step = 40;
  }
  step = step / (1000 / 60);

  // if (keyIsDown(LEFT_ARROW)) { x = x - 3; }
  // if (keyIsDown(RIGHT_ARROW)) { x = x + 3; }
  // if (keyIsDown(UP_ARROW)) { y = y - 3; }
  // if (keyIsDown(DOWN_ARROW)) { y = y + 3; }

  if (keyIsDown(LEFT_ARROW)) {
    vx = vx - 0.25 * step;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    vx = vx + 0.25 * step;
  }
  if (keyIsDown(UP_ARROW)) {
    vy = vy - 0.25 * step;
  }
  if (keyIsDown(DOWN_ARROW)) {
    vy = vy + 0.25 * step;
  }

  // vx = vx * 0.8; // 
  vx = vx * pow(0.94, step);
  vy = vy * pow(0.94, step);
  x = x + vx * step;
  y = y + vy * step;
  // console.log("x y", x, y);
  // console.log(vx, vy); 

  let view = article.position();
  let right = view.x + article.elt.clientWidth;
  let bottom = view.y + article.elt.clientHeight;
  let scrollX = article.elt.scrollLeft;
  let scrollY = article.elt.scrollTop;
  if (x < view.x + 40 && vx < 0) {
    article.elt.scrollLeft = article.elt.scrollLeft + vx * step;
  }
  if (x + blockSize > right - 40 && vx > 0) {
    article.elt.scrollLeft = article.elt.scrollLeft + vx * step;
  }
  if (y < view.y + 40 && vy < 0) {
    article.elt.scrollTop = article.elt.scrollTop + vy * step;
  }
  if (y + blockSize > bottom - 40 && vy > 0) {
    article.elt.scrollTop = article.elt.scrollTop + vy * step;
  }

  x = x - (article.elt.scrollLeft - scrollX);
  y = y - (article.elt.scrollTop - scrollY);

  if (x < view.x || x + blockSize > right) {
    vx = 0;
  }
  if (y < view.y || y + blockSize > bottom) {
    vy = 0;
  }
  x = constrain(x, view.x, max(view.x, right - blockSize));
  y = constrain(y, view.y, max(view.y, bottom - blockSize));

  let blockX = x - view.x + article.elt.scrollLeft;
  let blockY = y - view.y + article.elt.scrollTop;

  for (let i = 0; i < targets.length; i++) {
    let target = targets[i];
    if (target.touches(blockX, blockY)) {
      target.found = true;
      me.foundIds = concat(me.foundIds, [target.id]);
      inkChanged = true;
      found = found + 1;
      // console.log("got one!!", target.id, found);
    }
  }

  drawFound(view, right, bottom);

  // rect(x, y, blockSize, blockSize);
}

function drawCursor() {
  let combo = inkCombos[me.combo];

  if (!cursorFillInk) {
    cursorFillInk = new Riso(combo[1]);
    cursorStrokeInk = new Riso(combo[0]);
  }
  cursorFillInk.clear();
  cursorStrokeInk.clear();

  cursorFillInk.channelColor = getInk(combo[1]).channelColor;
  cursorStrokeInk.channelColor = getInk(combo[0]).channelColor;
  cursorFillInk.channelName = combo[1];
  cursorStrokeInk.channelName = combo[0];

  let cx = x + blockSize / 2;
  let cy = y + blockSize / 2;
  let diameter = blockSize + inkWeight + 6;
  // console.log("cursor colours", combo);

  cursorFillInk.noStroke();
  cursorFillInk.fill(200);
  cursorFillInk.circle(cx, cy, diameter);
  cursorStrokeInk.noFill();
  cursorStrokeInk.stroke(255);
  cursorStrokeInk.strokeWeight(inkWeight);
  cursorStrokeInk.circle(cx, cy, diameter);
}

// https://antiboredom.github.io/p5.riso/
function drawFound(view, right, bottom) {
  let scrollX = article.elt.scrollLeft;
  let scrollY = article.elt.scrollTop;
  let redrawInk = false;

  if (inkChanged == true) {
    redrawInk = true;
  }
  if (scrollX != lastScrollX || scrollY != lastScrollY) {
    redrawInk = true;
  }
  if (view.y != lastTop) {
    redrawInk = true;
  }

  if (redrawInk == true) {
    clearRiso();

    for (let p = 0; p < trails.length; p++) {
      let trail = trails[p];
      let path = trail.targets;
      let circleInk = getInk(trail.fill);
      let strokeInk = getInk(trail.stroke);
      circleInk.noStroke();
      circleInk.fill(200);
      strokeInk.noFill();
      strokeInk.stroke(255);
      strokeInk.strokeWeight(inkWeight);

      for (let i = 0; i < path.length; i++) {
        let target = path[i];
        let cx = view.x + target.x + target.width / 2 - scrollX;
        let cy = view.y + target.y + target.height / 2 - scrollY;
        let radius = target.diameter / 2 + inkWeight / 2;

        if (i > 0) {
          let previous = path[i - 1];
          let px = view.x + previous.x + previous.width / 2 - scrollX;
          let py = view.y + previous.y + previous.height / 2 - scrollY;

          let lineVisible = true;
          if (max(px, cx) + inkWeight / 2 < view.x) {
            lineVisible = false;
          }
          if (min(px, cx) - inkWeight / 2 > right) {
            lineVisible = false;
          }
          if (max(py, cy) + inkWeight / 2 < view.y) {
            lineVisible = false;
          }
          if (min(py, cy) - inkWeight / 2 > bottom) {
            lineVisible = false;
          }

          if (lineVisible == true) {

            // strokeInk.line(px, py, cx, cy);

            let length = dist(px, py, cx, cy);
            if (length > (previous.diameter + target.diameter) / 2) {
              let dx = (cx - px) / length;
              let dy = (cy - py) / length;
              let startX = px + dx * previous.diameter / 2;
              let startY = py + dy * previous.diameter / 2;
              let endX = cx - dx * target.diameter / 2;
              let endY = cy - dy * target.diameter / 2;
              strokeInk.line(startX, startY, endX, endY);
            }
          }
        }

        let circleVisible = true;
        if (cx + radius < view.x || cx - radius > right) {
          circleVisible = false;
        }
        if (cy + radius < view.y || cy - radius > bottom) {
          circleVisible = false;
        }
        if (circleVisible == true) {
          target.show(cx, cy, circleInk, strokeInk);
        }
      }
    }

    lastScrollX = scrollX;
    lastScrollY = scrollY;
    lastTop = view.y;
    inkChanged = false;
  }

  drawCursor();

  // only draw the ink inside the article area
  // https://p5js.org/reference/p5/beginClip/
  push();
  noStroke();
  fill(255);
  beginClip();
  rect(view.x, view.y, right - view.x, bottom - view.y);
  endClip();
  drawRiso();
  pop();
}

function measureLetters() {
  let view = article.position();
  let ids = Object.keys(marks);
  for (let i = 0; i < ids.length; i++) {
    let id = ids[i];
    marks[id].measure(view);
  }
  layoutChanged = false;
  inkChanged = true;
}

function letterPosition(letter) {
  let point = letter.position();
  let parent = letter.elt.offsetParent;
  while (parent) {
    point.x = point.x + parent.offsetLeft + parent.clientLeft;
    point.y = point.y + parent.offsetTop + parent.clientTop;
    parent = parent.offsetParent;
  }
  point.x = point.x - article.elt.scrollLeft;
  point.y = point.y - article.elt.scrollTop;
  return point;
}

function keyPressed() {

  switch (keyCode) {
    case LEFT_ARROW:
      return false;
    case RIGHT_ARROW:
      return false;
    case UP_ARROW:
      return false;
    case DOWN_ARROW:
      return false;
    default:
      break;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  let names = Object.keys(inks);
  for (let i = 0; i < names.length; i++) {
    let name = names[i];
    inks[name].resizeCanvas(windowWidth, windowHeight);
  }
  if (cursorFillInk) {
    cursorFillInk.resizeCanvas(windowWidth, windowHeight);
    cursorStrokeInk.resizeCanvas(windowWidth, windowHeight);
  }
  layoutChanged = true;
}
