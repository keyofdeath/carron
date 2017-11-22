/**
 * Created by Propriétaire on 01/04/2017.
 */
function Enemy(x, y, r, speed){

    this.pos = createVector(x, y);
    this.r = r;
    this.speed = speed;


    this.update = function (x_incr, y_incr) {
        this.pos = createVector(this.pos.x + x_incr, this.pos.y + y_incr);
    };

    this.show = function() {
        fill(125);
        ellipse(this.pos.x, this.pos.y, this.r*2, this.r*2);
    }

}