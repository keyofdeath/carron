/**
 * Created by Propriétaire on 01/04/2017.
 */
function Player(x, y, r, color_r, color_g, color_b, id) {
    // Postion x et y du player
    this.pos = createVector(x, y);
    this.r = r;
    this.color_r = color_r;
    this.color_g = color_g;
    this.color_b = color_b;
    this.id = id;
    this.pseudo = "";

    this.update = function(socket, dic_player) {
        var new_x, new_y, d;
        // on regarde que la boulle reste dans le canvas
        if(mouseX < this.r){
            new_x = this.r;
        }else if(mouseX > width - this.r){
            new_x = width - this.r;
        }else{
            new_x = mouseX;
        }

        if(mouseY < this.r){
            new_y = this.r;
        }else if(mouseY > height - this.r){
            new_y = height - this.r;
        }else{
            new_y = mouseY;
        }

        var newpos = createVector(new_x, new_y);// on set la nouvelle position de la boulle
        // deplassemnt fluide
        this.pos.lerp(newpos, 0.05);// Interpolation linéaire
        var data = {
            x: this.pos.x,
            y: this.pos.y
        };
        socket.emit("update", data);

    };

    this.colision = function(tab_enemy) {
        var direction, d, i;
        for (direction in tab_enemy){
            for(i = 0; i < tab_enemy[direction].length; ++i){
                d = p5.Vector.dist(this.pos, createVector(tab_enemy[direction][i].x, tab_enemy[direction][i].y));
                if (d < this.r + tab_enemy[direction][i].r) {
                    return true;
                }
            }
        }
        return false;
    };

    this.colision_with_player = function (dic_player) {

        for(player_id in dic_player){
            if(player_id != this.id){
                d = p5.Vector.dist(this.pos, createVector(dic_player[player_id].x, dic_player[player_id].y));
                if (d < this.r + dic_player[player_id].r){
                    return true
                }
            }
        }
        return false;
    };

    this.show = function() {
        fill(this.color_r, this.color_g, this.color_b);
        ellipse(this.pos.x, this.pos.y, this.r*2, this.r*2);
        if(this.pseudo !== ""){
            // var txtWidth = textWidth(this.pseudo);
            var taille = getSize(this.pseudo, this.r);
            // Si le user a mie que des espaces dans son pseudo
            if(taille > 0){
                textSize(taille);
                fill(0);
                text(this.pseudo, this.pos.x - this.r, this.pos.y);
                fill(this.color_r, this.color_g, this.color_b);
            }
        }
    }
}