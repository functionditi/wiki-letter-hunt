
class LetterTarget {
  constructor(element) {
    this.element = element;
    this.id = element.attribute("id");
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.diameter = 0;
    this.found = false;
  }

  measure(view) {
    let point = letterPosition(this.element);
    let size = this.element.size();

    this.x = point.x - view.x + article.elt.scrollLeft;
    this.y = point.y - view.y + article.elt.scrollTop;
    this.width = size.width;
    this.height = size.height;
    // console.log(this.id, this.x, this.y);

    if (this.width > this.height) {
      this.diameter = this.width + inkWeight + 6;
    } else {
      this.diameter = this.height + inkWeight + 6;
    }

    // this.diameter = 30;
    // this.diameter = 40;
  }

  touches(blockX, blockY) {
    if (this.found == true) {
      return false;
    }

    if (blockX >= this.x + this.width) {
      return false;
    }
    if (blockX + blockSize <= this.x) {
      return false;
    }
    if (blockY >= this.y + this.height) {
      return false;
    }
    if (blockY + blockSize <= this.y) {
      return false;
    }

    // console.log("touching", this.id);
    return true;
  }

  // https://antiboredom.github.io/p5.riso/
  show(cx, cy, circleInk, strokeInk) {

    // circleInk.rect(cx - 10, cy - 10, 20, 20);

    circleInk.circle(cx, cy, this.diameter);
    strokeInk.circle(cx, cy, this.diameter);
  }
}
