/**
 * Created by Propriétaire on 01/04/2017.
 */
// joueur que on joue
var player;
// joueur jouet par c'est amis
var dic_player = {};
// tableaut d'enemi
var tab_enemy ={};
// temps attente en miliseconde avent de commencer le jeu
var start_time;
// temps pri au demarage
var time;
// Passe a true quand c'est la fin du jeu
var endOfTheGame = false;
// Passe a true quand le joueur commence
var game_start = false;
// Socket pour la comunication
var socket;
// passe vrais quand l'initialisation a été faite
var init_do = false;
// numérod e vague
var wave_num = 1;
// player hit name
var playerLose = "";

function getSize(text, largeur){

    var nbSpace = (text.match(/\s/g) || []).length;
    return (largeur * 2) / (text.length - (nbSpace / 2)) * 1.5;
}

function update_dic_player() {

    for(player_id in dic_player){
        // se n'est pas le maime id
        if (dic_player[player_id].id != player.id){
            fill(dic_player[player_id].color_r, dic_player[player_id].color_g, dic_player[player_id].color_b);
            ellipse(dic_player[player_id].x,
                dic_player[player_id].y,
                dic_player[player_id].r*2,
                dic_player[player_id].r*2);
            // Si il a mie un pseudo
            if(dic_player[player_id].pseudo !== ""){
                // var txtWidth = textWidth(this.pseudo);
                var taille = getSize(dic_player[player_id].pseudo, dic_player[player_id].r);
                // Si le user a mie que des espaces dans son pseudo
                if(taille > 0){
                    textSize(taille);
                    fill(0);
                    text(dic_player[player_id].pseudo,
                        dic_player[player_id].x - dic_player[player_id].r,
                        dic_player[player_id].y);
                    fill(player.color_r, player.color_g, player.color_b);
                }
            }
        }else{
            // Mise a jour de la taille du joueur que on joue
            player.r = dic_player[player_id].r;
        }
    }
}

function update_tab_enemy() {

    for(direction in tab_enemy){
        for(var i = 0; i < tab_enemy[direction].length; ++i){

            fill(125);
            ellipse(tab_enemy[direction][i].x,
                tab_enemy[direction][i].y,
                tab_enemy[direction][i].r*2,
                tab_enemy[direction][i].r*2);
        }
    }
}

function reset_the_game() {

    endOfTheGame = false;
    game_start = false;
    document.getElementById("ready_button").innerHTML = "<button onclick='i_ready()'>je suis prêt</button>";
    document.getElementById("gameStatu").innerHTML = "Vous n'êtes pas prêt";

}

/**
 * Envoie au server que on est pres
 */
function i_ready() {
    document.getElementById("gameStatu").innerHTML = "Vous êtes prêt";
    document.getElementById("ready_button").innerHTML = "";
    player.pseudo = document.getElementById("pseudo").value;
    socket.emit("ready", player.pseudo);
}

function setup() {
    // versin local
    socket = io.connect('http://localhost:3000');
    // version online
    // socket = io.connect('http://51.255.196.228:3000');

    /**
     * Socket qui initialise le jeu
     */
    socket.on('start', function(start_data){
        dic_player = start_data.player_dico;
        tab_enemy = start_data.enemy_list;

        // on cree notre joueur en fonction de se que le server a envoyer
        player = new Player(start_data.new_player.x, start_data.new_player.y, start_data.new_player.r,
        start_data.new_player.color_r, start_data.new_player.color_g, start_data.new_player.color_b,
        start_data.new_player.id);
        createCanvas(start_data.canvas_width, start_data.canvas_height);
        // on cree le canvas c'est le server qui fix la taille
        start_time = start_data.start_time;
        init_do = true;
        // on cree le boutton pour que le joueur se sigane pres
        document.getElementById("ready_button").innerHTML = "<button onclick='i_ready()'>je suis prêt</button>";
        document.getElementById("gameStatu").innerHTML = "Vous n'êtes pas prêt";
    });

    /**
     * Socket de mise a jour du plateur
     */
    socket.on('heartbeat',
        function(data) {
            dic_player = data.player_dico;
            tab_enemy = data.enemy_list;
            wave_num = data.waveNum;

        }
    );

    /**
     * Socket pour signaler de début du jeu
     */
    socket.on('start_game',
        function(data) {
            game_start = true;
            document.getElementById("gameStatu").innerHTML = "C'est parti ! <br>" + data;
            // démars le compte a rebours
            time = millis();
        }
    );


    /**
     * Socket de la fin de la parti
     */
    socket.on('game_over',
        function(data) {
            endOfTheGame = true;
            playerLose = data;
            // on attend avent de reset le jeu cela laisse de temps de voir le msg game over
            setTimeout(reset_the_game, start_time);
        }
    );
}

function draw() {
    background(0);
    // Si l'initialisation n'a pas ete fait on attend
    if(! init_do){
        textSize(60);
        text("not init", width/2, height/2);
    }else if(! game_start) {
        textSize(50);
        text("Attente de tous les joueurs", (width/2) - 300, height/2);
        player.show();
        player.update(socket, dic_player);
        update_dic_player();
    }else{
        player.show();
        player.update(socket, dic_player);
        update_dic_player();
        // si c'est la fin du jeu
        if(endOfTheGame){
            textSize(60);
            text("GAME OVER", (width/2)-100, height/2);
            textSize(getSize(playerLose), width);
            text(playerLose, (width/2), (height/2) + 100);
        }else if(millis() - time >= start_time){
            // mise a jour des enemy
            update_tab_enemy();
            // Si il y a une colision c'est la fin du jeu
             if (player.colision(tab_enemy)){
                 endOfTheGame = true;
                 // on le signale au server qu'il y a une colision avec notre pseudo pour les autre joueur
                 socket.emit("colision", player.pseudo);
                 playerLose = player.pseudo;
                 // on attend avent de reset le jeu cela laisse de temps de voir le msg game over
                 setTimeout(reset_the_game, start_time);
             }
            textSize(60);
            text("GAME start " + wave_num, (width/2) - 300, height/2);

        }else{
            // on ecrit les segonde écouler
            textSize(60);
            // on converti le start_time en seconde est on le soustrai au temps ecouler converti en seconde
            text((Math.round(start_time/1000) - Math.round((millis() - time)/1000)) + "s", width/2, height/2);
        }
    }
}