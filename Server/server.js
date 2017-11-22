/**
 * Created by Propriétaire on 01/04/2017.
 */


/**
 * TODO Finir la doc string
 */

var fs = require('fs');
// Lib pour uploader le fichier json
var formidable = require('formidable');
// Using express: http://expressjs.com/
var express = require('express');
// Create the app
var app = express();
// Set up the server
// process.env.PORT is related to deploying on heroku
var server = app.listen(process.env.PORT || 3000, listen);
// WebSocket Portion
// WebSockets work with the HTTP server
var io = require('socket.io')(server);

//                              _________
//_____________________________/CONSTANTE\_________________________________
var width = 600;

var height = 600;
// temps attente en miliseconde avent de commencer le jeu
var start_time = 4000;
var nb_player_ready = 0;
var board = new Board();
var hearthBeatSpeed = 10;


var MaxEnemySpeed = 10;
var MaxEnemyNB = 10;
var MaxEnemyR = width;

var MinEnemySpeed = 1;
var MinEnemyNB = 0;
var MinEnemyR = 1;

var MaxPlayerR = width;
var MinPlayerR = 1;

var MinTime = 1000;

var MaxWave = 50;

//                              ________________
//_____________________________/GESTION DU BOARD\_________________________________

function dicLength(dic) {
    var count = 0;
    for (var i in dic) {
        if (dic.hasOwnProperty(i)) {
            count++;
        }
    }
    return count;
}

/**
 * Class Board
 * @constructor
 */
function Board(){

    // Temps écouler depuis le début de la vague (en mms)
    this.spend_time = 0;
    // vague numéro
    this.wave_num = 1;
    // Liste d'enemi su le board north cela veut dire que les ennemie vont ver le nord
    this.enemy = {"north":[], "east":[], "west":[], "south":[]};
    // Passe a true quand c'est la fin du jeu
    this.endOfTheGame = false;
    // Dictionaire de joueur la clef est id du jouer sois l'id du soket
    this.player_dic = {};
    // data sur les vagues
    this.start_nb_enemy_min = 0;
    this.start_nb_enemy_max = 1;
    this.speed_enemy_min = 1;
    this.speed_enemy_max = 4;
    this.enemy_r = 50;
    this.player_r = 50;
    this.nbWave = 1;
    this.waveFileType = "test";
    this.gameStart = false;

    /**
     * Mise a jour des enemy. Cette méthode fait aussi la traznsition de vague
     */
    this.updateEnemy = function () {
        var temp;
        if(! this.gameStart){
            return;
        }
        this.spend_time += hearthBeatSpeed;
        // fin de la vague on regarde que si c'est la derrnière vuage on la continue eviter les bug
        if (this.spend_time >= this.waveFile["wave"+this.wave_num]["time"] && this.wave_num + 1 <= this.nbWave){
            this.wave_num += 1;
            this.spend_time = 0;
            var waveData = this.waveFile["wave"+this.wave_num];
            this.start_nb_enemy_min = waveData["nbMin"];
            this.start_nb_enemy_max = waveData["nbMax"];
            if (this.start_nb_enemy_min > this.start_nb_enemy_max){
                temp = this.start_nb_enemy_max;
                this.start_nb_enemy_max = this.start_nb_enemy_min;
                this.start_nb_enemy_min = temp;
            }
            this.speed_enemy_min = waveData["speedMin"];
            this.speed_enemy_max = waveData["speedMax"];
            if (this.speed_enemy_min > this.speed_enemy_max){
                temp = this.speed_enemy_max;
                this.speed_enemy_max = this.speed_enemy_min;
                this.speed_enemy_min = temp;
            }
            this.enemy_r = waveData["enemyR"];
            this.player_r = waveData["playerR"];
            // on reset les enemy
            clear_enemy();
            initEnemy();
            resizePlayer();
        }
        update_enemy();

    };


    /**
     * Reset le board
     *  1) reset les enemy
     *  2) la liste des joueurs
     *  3) le numéro des vagues
     */
    this.resetBoard = function () {

        // on stop la mise a joure des enemy
        //clearInterval(interval_id);
        // on reset les enemy
        clear_enemy();
        // on reset les joueur
        clear_player();
        this.spend_time = 0;
        this.wave_num = 1;
        try {
            this.waveFileType = "Fichier personnaliser";
            // fichier de vague
            this.waveFile = JSON.parse(fs.readFileSync('Data/upload.json', 'utf8'));
        }catch (e){
            this.waveFileType = "Fichier par défaut";
            console.log("Fichier d'upload non trouver on ouvre le fichier de base");
            // fichier de vague
            this.waveFile = JSON.parse(fs.readFileSync('Data/testWave.json', 'utf8'));
        }
        // data sur les vagues
        this.start_nb_enemy_min = this.waveFile["wave"+this.wave_num]["nbMin"];
        this.start_nb_enemy_max = this.waveFile["wave"+this.wave_num]["nbMax"];
        this.speed_enemy_min = this.waveFile["wave"+this.wave_num]["speedMin"];
        this.speed_enemy_max = this.waveFile["wave"+this.wave_num]["speedMax"];
        this.enemy_r = this.waveFile["wave"+this.wave_num]["enemyR"];
        this.player_r = this.waveFile["wave"+this.wave_num]["playerR"];
        this.nbWave = this.waveFile["nbWave"];
        this.gameStart = false;
        // rest taille des joueur
        resizePlayer();
    };

    // Regarde si le fichier json upload et conforme
    this.checkJsonFile = function () {
        var waveFile, temp;
        try {
            // fichier de vague
            waveFile = JSON.parse(fs.readFileSync('Data/upload.json', 'utf8'));
        }catch (e){
            console.log("Fichier d'upload non trouver ", e);
            return -1;
        }

        try {

            var nbWave = waveFile["nbWave"];
            // test si la nombre de vague corespon au nombre de vague ecrit dans le json
            var length = dicLength(waveFile) - 1;
            if (length !== nbWave || length > MaxWave){
                console.log("Error fichier upload wave");
                return -1;
            }
            var start_nb_enemy_min, start_nb_enemy_max, speed_enemy_min, speed_enemy_max, enemy_r, player_r, timeWave;
            for (var i = 1; i <= nbWave; i++){

                start_nb_enemy_min = this.waveFile["wave"+i]["nbMin"];
                start_nb_enemy_max = this.waveFile["wave"+i]["nbMax"];
                // Permutation si il maite un minimu plus grand que le max
                if (start_nb_enemy_min > start_nb_enemy_max){
                    temp = start_nb_enemy_max;
                    start_nb_enemy_max = start_nb_enemy_min;
                    start_nb_enemy_min = temp;
                }
                speed_enemy_min = this.waveFile["wave"+i]["speedMin"];
                speed_enemy_max = this.waveFile["wave"+i]["speedMax"];
                if (speed_enemy_min > speed_enemy_max){
                    temp = speed_enemy_max;
                    speed_enemy_max = speed_enemy_min;
                    speed_enemy_min = temp;
                }
                enemy_r = this.waveFile["wave"+i]["enemyR"];
                player_r = this.waveFile["wave"+i]["playerR"];
                timeWave = this.waveFile["wave"+i]["time"];

                // on regarde que tout les paramètre sont bien dans l'intervale
                if (start_nb_enemy_max > MaxEnemyNB || start_nb_enemy_min < MinEnemyNB ||
                    speed_enemy_min < MinEnemySpeed || speed_enemy_max > MaxEnemySpeed ||
                    enemy_r > MaxEnemyR || enemy_r < MinEnemyR || player_r < MinPlayerR || player_r > MaxPlayerR ||
                    timeWave < MinTime) {
                    console.log("Error fichier upload attribu");
                    return -1;
                }
            }
        }catch (e){
            console.log("Erreur lecture du fichier uploder ", e);
            return -1;
        }
    }
}


//                              __________________
//_____________________________/GESTION DES JOUEUR\_________________________________

/**
 * Class joueur
 * @param id du joueur
 * @param x position x du joueur
 * @param y position y du joueur
 * @param r rayon du joueur
 * @param color_r couleur rouge du joueur
 * @param color_g couleur vert du joueur
 * @param color_b couleur bleu du joueur
 * @constructor
 */
function Player(id, x, y, r, color_r, color_g, color_b) {
    // Postion x et y du player
    this.x = x;
    this.y = y;
    this.id = id;
    this.r = r;
    this.color_r = color_r;
    this.color_g = color_g;
    this.color_b = color_b;
    this.player_ready = false;
    this.pseudo = "";
}

/**
 * fonction qui reset l'eta des joueurs
 */
function clear_player() {

    for (id in board.player_dic){
        board.player_dic[id].player_ready = false;
    }
    nb_player_ready = 0;

}

/**
 * Fonction qui mais a jour la taille des joueurs
 */
function resizePlayer(){

    for(id in board.player_dic){

        board.player_dic[id].r = board.player_r;
    }

}

//                              ___________________
//_____________________________/GESTION DES ENNEMYS\_________________________________

function random (low, high) {
    return Math.random() * (high - low) + low;
}

function Enemy(x, y, r, speed){

    this.x = x;
    this.y = y;
    this.r = r;
    this.speed = speed;


    this.update = function (x_incr, y_incr) {
        this.x += x_incr;
        this.y += y_incr
    };

}

function initEnemy() {
    /**
     * Mais init la liste d'enemy
     * @type {Number}
     */
    var nb_enemy = random(board.start_nb_enemy_min, board.start_nb_enemy_max);

    // on les fait commencer au sud
    for(var i = 0; i < nb_enemy; ++i){
        board.enemy["north"].push(new Enemy(random(board.enemy_r, width-board.enemy_r),
            height,
            board.enemy_r,
            random(board.speed_enemy_min, board.speed_enemy_max)))
    }

    nb_enemy = random(board.start_nb_enemy_min, board.start_nb_enemy_max);
    // on les fait commencer a l'west gauche
    for(i = 0; i < nb_enemy; ++i){
        board.enemy["east"].push(new Enemy(0,
            random(board.enemy_r, height-board.enemy_r),
            board.enemy_r,
            random(board.speed_enemy_min, board.speed_enemy_max)))// Vitesse aléatoire de l'enemy
    }

    nb_enemy = random(board.start_nb_enemy_min, board.start_nb_enemy_max);
    // on les fait commencer a l'east droit
    for(i = 0; i < nb_enemy; ++i){
        board.enemy["west"].push(new Enemy(width,
            random(board.enemy_r, height-board.enemy_r),
            board.enemy_r,
            random(board.speed_enemy_min, board.speed_enemy_max)))
    }

    nb_enemy = random(board.start_nb_enemy_min, board.start_nb_enemy_max);
    // on les fait commencer au nord haut
    for(i = 0; i < nb_enemy; ++i){
        board.enemy["south"].push(new Enemy(random(board.enemy_r, height-board.enemy_r),
            0,
            board.enemy_r,
            random(board.speed_enemy_min, board.speed_enemy_max)))
    }
}

function update_enemy(){
    /**
     * Mais a jour la liste d'enemi
     */

    // on bouge les boulle vers le nord
    for(var i = 0; i < board.enemy["north"].length; ++i){

        // Si l'enemi n'est pas en dehore du boerd on l'avence
        if(board.enemy["north"][i].y - board.enemy["north"][i].speed > -board.enemy["north"][i].r){
            board.enemy["north"][i].update(0, -board.enemy["north"][i].speed);
        }else{
            // Sinon on le remais au sud
            board.enemy["north"][i].x = random(board.enemy_r, width-board.enemy_r);
            board.enemy["north"][i].y = height;
            board.enemy["north"][i].speed = random(board.speed_enemy_min, board.speed_enemy_max);
        }
        // show
    }

    // on bouge les boulle vers l'east droit
    for(i = 0; i < board.enemy["east"].length; ++i){

        if(board.enemy["east"][i].x + board.enemy["east"][i].speed <= width + board.enemy["east"][i].r){
            board.enemy["east"][i].update(board.enemy["east"][i].speed, 0);
        }else{
            board.enemy["east"][i].x = 0;
            board.enemy["east"][i].y = random(board.enemy_r, height-board.enemy_r);
            board.enemy["east"][i].speed = random(board.speed_enemy_min, board.speed_enemy_max);
        }
        // show
    }

    // on bouge les boulle vers l'ouest gauche
    for(i = 0; i < board.enemy["west"].length; ++i){

        if(board.enemy["west"][i].x - board.enemy["west"][i].speed > -board.enemy["west"][i].r){
            board.enemy["west"][i].update(-board.enemy["west"][i].speed, 0);
        }else{
            board.enemy["west"][i].x = width;
            board.enemy["west"][i].y = random(board.enemy_r, height-board.enemy_r);
            board.enemy["west"][i].speed = random(board.speed_enemy_min, board.speed_enemy_max);
        }
    }

    // on bouge les boulle vers le sud
    for(i = 0; i < board.enemy["south"].length; ++i){
        if(board.enemy["south"][i].y + board.enemy["south"][i].speed <= height + board.enemy["south"][i].r){
            board.enemy["south"][i].update(0, board.enemy["south"][i].speed);
        }else{
            // Sinon on le remais au nord
            board.enemy["south"][i].x = random(board.enemy_r, width-board.enemy_r);
            board.enemy["south"][i].y = 0;
            board.enemy["south"][i].speed = random(board.speed_enemy_min, board.speed_enemy_max);
        }
    }
}

/**
 * remais a zero la liste d'enemy
 */
function clear_enemy() {
    board.enemy = {"north":[], "east":[], "west":[], "south":[]};
}


//                              ______
//_____________________________/SERVER\_______________________________

// This call back just tells us that the server has started
function listen() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at http://' + host + ':' + port);
}

app.use(express.static('public'));

// Partie pour uploader un fichier json
app.post('/carron/fileupload', function (req, res) {

    var form = new formidable.IncomingForm();
    // controle le format du fichier envent tout upload
    form.onPart = function (part) {
        if(!part.filename || part.filename.match(/\.json$/i)) {
            this.handlePart(part);
        }
        else {
            console.log(part.filename + ' n\'est pas autoriser');
        }
    };
    // upload du fichier
    form.parse(req, function (err, fields, files) {
        try {
            var oldpath = files.filetoupload.path;
            console.log(files.filetoupload.name);
            var newpath = 'Data/upload.json';
            fs.rename(oldpath, newpath, function (err) {
                if (err) throw err;
                if(board.checkJsonFile() === -1){
                    // on suprimme le json defectueu
                    fs.unlinkSync("Data/upload.json");
                    res.write("Votre fichier n'est pas valable. Veuillez réessayer");
                    res.end();
                }else {
                    res.write('File uploaded and moved!');
                    res.end();
                }
            });
        }catch (e){
            res.write('Il faut un fichier .json');
            res.end();

        }
    });
});

// on envoie un emise a jour de la position du plateau

function heartbeat() {

    board.updateEnemy();
    var data = {
        player_dico: board.player_dic,
        enemy_list: board.enemy,
        waveNum: board.wave_num
    };
    io.sockets.emit('heartbeat', data);
}

function add_player(socket){
    console.log("We have a new client: " + socket.id);
    var new_player = new Player(socket.id, width/2, width/2,  board.player_r,
        random(100, 255),
        random(100, 255),
        random(100, 255));
    var data = {
        new_player: new_player,
        player_dico: board.player_dic,
        enemy_list: board.enemy,
        canvas_width: width,
        canvas_height: height,
        start_time: start_time
    };
    socket.emit('start', data);
    // on rajoue le jouer dans notre dico
    board.player_dic[socket.id] = new_player;
}

/**
 * Démmare les vague d'énemie
 */
function start_the_game(){
    board.gameStart = true;
    console.log("start the game");
    initEnemy();
}

// on demarre la mise a jours des joueur
var interval_id = setInterval(heartbeat, hearthBeatSpeed);
// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection',
    // We are given a websocket object in our function
    function(socket) {

        add_player(socket);

        // mise a jour de la position du joureur courent
        socket.on('update',
            function(data) {
                board.player_dic[socket.id].x = data.x;
                board.player_dic[socket.id].y = data.y;
            }
        );

        // message envoyer par un joueur quand il est près
        socket.on('ready',
            function(data) {
                // Si tout le monde est près on commence !!!!
                board.player_dic[socket.id].player_ready = true;
                board.player_dic[socket.id].pseudo = data;
                console.log("player " + socket.id + " is ready");
                nb_player_ready++;
                console.log("nb player " + Object.keys(board.player_dic).length + " nb player ready " + nb_player_ready);
                if (nb_player_ready >= Object.keys(board.player_dic).length){
                    board.resetBoard();
                    console.log("all player is ready");
                    // on envoie le siganele de commencement de la partie a tout les joueur
                    io.emit('start_game', board.waveFileType);
                    // on attend que le time out est fini pour envoyer les vague
                    setTimeout(start_the_game, start_time);
                }
            }
        );

        socket.on('colision', function (data){
            console.log("le joueur " + socket.id + " a toucher un enemy fin de la partie !");
            // on signale les autre joueur que c'est la fin avec le pseudo de la personne qui a toucher la bouller
            socket.broadcast.emit("game_over", data);
            board.resetBoard();
            console.log("reset du jeu attend des joueurs...")
        });
        socket.on('disconnect', function() {
            console.log("Client" + socket.id + " has disconnected");
            // on suprimme le jour qui est partie
            delete board.player_dic[socket.id];
            board.resetBoard();
            console.log("reset du jeu attend des joueurs...")
        });
    }
);