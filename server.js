/*
    ~ * ~ * ~ * SERVER
    ~ * ~ * ~ * 
    ~ * ~ * ~ * 
    ~ * ~ * ~ * 
*/

//create server
let port = process.env.PORT || 8000;
const express = require('express');
let app = express();
// let server = require('http').createServer(app).listen(port, function(){
//   console.log('Server is listening at port: ', port);
// });
let httpServer = require('http').createServer(app);
const { instrument, RedisStore } = require("@socket.io/admin-ui");

//where we look for files
app.use(express.static('public'));

// MARK: DB
// nedb database stuff
// const Datastore = require('nedb');
// let backupDB = new Datastore({filename: "saves/backup.db", autoload: true});
// let lastSave = {
//   game: {},
//   state: {},
//   players: [],
//   log: [],
//   timestamp: 0,
// };

// function backupInit(){
//   console.log('backup init');
//   backupDB.find({type: "backup"}, (err, docs) => {
//       if (err) {console.log("backup db setup err: " + err)};
//       if (docs.length != 0) { //exists
//         console.log('loading last save');
//         lastSave = {
//           game: docs[0].game, 
//           state: docs[0].state, 
//           players: docs[0].players, 
//           log: docs[0].log,
//           timestamp: docs[0].timestamp
//         };
//         //TODO load (could be a boss command)
//       } else { 
//         //for first, make blank entry
//         console.log('new db, creating first doc');
//         backupDB.insert({
//           type: "backup",
//           game: game,
//           state: state,
//           players: players,
//           log: log,
//           timestamp: Date.now(),
//         }, (err, newDoc) =>{
//           if (err) {console.log('new backup err: ' + err)}
//           console.log("new backup doc");
//           console.log(newDoc);
//         })  
//       }
//   });
// }

// backupInit();

// function backup(){
//   backupDB.update({type: "mainBackup"}, {type: "mainBackup", game: game, state: state, players: players, log: log, time: Date.now()}, {upsert: true}, (err) => {
//     if (err) {console.log("main backup err: " + err);
//     }
//     console.log('saved state, db backed up successfully');  
//   });
//   backupDB.insert([{type: "backup", game: game, state: state, players: players, log: log, time: Date.now()}], (err) => {
//     if (err) {console.log("backup err: " + err);
//     } 
//   });
// }

//stores events or something idk, is for db
let log = [];

// function logTimeAndReset(){
//   //just for our info later
//   let duration = (Date.now() - state.lastTime) / 1000;
//   console.log(`\n\n\n${state.phase} took ${duration} seconds, logging.\n\n\n`);
//   log.push[state.phase, duration]; //not working for some reason...

//   //reset timer
//   state.lastTime = Date.now();
// }

// MARK: Socket Server
const { Server } = require('socket.io');
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true //for sticky cookie ;>
  },
  cookie: true, //https://socket.io/how-to/deal-with-cookies
  connectionStateRecovery : {
    // https://socket.io/docs/v4/connection-state-recovery
    maxDisconnectionDuration: 10 * 60 * 1000,
  }
});

// https://socket.io/docs/v4/admin-ui/
instrument(io, {
  auth: false,
  mode: "production",
  readonly: false,
  namespaceName: "/admin", //default
  // store: new RedisStore(redisClient), //stores session IDs for reconnect
});

httpServer.listen(port, function(){
  console.log('Server is listening at port: ', port);
});

// MARK: Player Variables
// players contains the player accounts and associated socket.ids / names
// started using ids as keys, but then on reconnect, need to move all info and delete
// instead, will keep generic number as key, then update id and name within (boss will assign to number)
let players = []; //{}; 

// class Player {
//   constructor(args){
//     // this.playerNum = args.playerNum || undefined; //hmm
//     this.name = args.name || "player"; //player's inputted name
//     this.id = args.id || "0x69420"; //socket id -- won't actually use this probs
//     this.engineCookie = args.engineCookie || ""; // this is the reconnect id
//     this.isAssigned = args.isAssigned || false; //on reconnect, only shows accounts that aren't claimed
//     this.color = args.color || {r: 0, g: 0, b:0}; //normalized
//     this.colorString = args.colorString || "#a42069";
//     this.chips4Orders = args.chips4Orders || 0;
//     this.chips4Shares = args.chips4Orders || 0;
//     // this.chipCount = 0;
//     // this.specialChips = {};
//     // this.pollenHeld = 0; //unscored pollen
//     // this.pollenCount = 0; //scored pollen
//     this.nectar = args.nectar || 0;
//     this.messages = args.messages || ["Welcome to the HoneyPot"];
//     this.secrets = args.secrets || [];
//   }
// }

// MARK: Game State Variables
let state = { //the "game state" for everything, not just godot game
  phase: "prelude", //the label that's displayed, dictates what part of round we're in
  timer: 0, 
  lastTime: Date.now(),
}; 


//
//  MARK: Player
//  client (mobile)
//

var main = io.of('/');
//listen for anyone connecting to default namespace
main.on('connection', (socket) => {
  //hmm maybe could add an assumptive login if only one player disconnects?
  //WAIT theres a new reconnect feature!
  //ah, that's more for like, bug disconnects, not refreshes... but still good to have i guess
  (socket.recovered) ? console.log('recovered client! ' + socket.id):console.log('new player client!: ' + socket.id);

  // socket.emit('clientInit', { //hmm could just be update...
  //   game: game,
  //   state: state,
  //   players: players
  // });

  //check player object and update if existing:
  //hmm, there's prob a smarter/built in way to do this, but this is what testing led me to:
  // checkPlayerConnect(socket); //will lead to 'cookieReconnect' if existing, or waiting if new
  
  //event sent as response to 'cookieReconnect'
  // socket.on('updateCookie', (data)=>{ //cookie :3
  //   // on connect, player sends `socket.io.engine.id` so that we can check it against cookie on reconnect
  //   // if existing player, update engineCookie
  //   console.log(data.engineCookie);
  //   for (let player of players) { //hmm should maybe go back to object, this is a little silly
  //     if (player.id == socket.id) { 
  //       console.log("updating " + player.name);
  //       player.engineCookie = data.engineCookie;
  //       // socket.emit('clientInit', { //hmm could just be update...
  //       //   game: game,
  //       //   state: state,
  //       //   players: players
  //       // });
  //       return;
  //     }
  //   }
  // });

  // socket.on('relogin', (data)=>{
  //   for (let player of players){
  //     if (player.name == data.name){
  //       socket.emit('loggedIn', player);
  //       console.log(`${player.name} has returned`);
  //       player.isAssigned = true;
  //       player.id = socket.id;
  //     }
  //   }
  // });

  //event from new player's login phase screen
  // socket.on('newPlayer', (data)=>{
  //   //create new profile
  //   players.push(new Player(data));
  //   for (let faction of Object.keys(game.factions)){
  //     game.factions[faction].shares[data.name] = 0;
  //   }
  //   socket.emit('playerProfileCreated'); //just to toggle flag
  //   boss.emit('newPlayer', players);
    
  //   console.log('player profile received: ' + data.name);
  // });


  //listen for this client to disconnect
  socket.on('disconnect', () => {
    // console.log('input client disconnected: ' + socket.id);
    // for (let player of players){
    //   if (player.id == socket.id){
    //     console.log(player.name + " has disconnected\n");
    //     player.isAssigned = false;
    //     return;
    //   }
    // }
    console.log('anon player client disconnected: ' + socket.id + "\n");
    // players[socket.id] != undefined ? console.log(players[socket.id].name + ' disconnected') : console.log('unassigned client disconnected: ' + socket.id);
  });

});

//
// MARK: LOGIN
//
var login = io.of('/login');
//listen for anyone connecting to default namespace
login.on('connection', (socket) => {
  console.log('login client: ' + socket.id);

  // socket.emit('clientInit', { //hmm could just be update...
  //   game: game,
  //   state: state,
  //   players: players
  // });

  //event from new player's login phase screen
  // socket.on('newPlayer', (data)=>{
    //create new profile
    // players.push(new Player(data));
    // for (let faction of Object.keys(game.factions)){
    //   game.factions[faction].shares[data.name] = 0;
    // }
    // socket.emit('playerProfileCreated'); //just to toggle flag
    // boss.emit('newPlayer', players);
    
    // console.log('player profile received: ' + data.name);
    // backup();
  // });

  //listen for this client to disconnect
  socket.on('disconnect', () => {
    // console.log('input client disconnected: ' + socket.id);
    // for (let player of players){
    //   if (player.id == socket.id){
    //     console.log(player.name + " has disconnected\n");
    //     return;
    //   }
    // }
    console.log('anon player client disconnected: ' + socket.id + "\n");
    // players[socket.id] != undefined ? console.log(players[socket.id].name + ' disconnected') : console.log('unassigned client disconnected: ' + socket.id);
  });

});

//
// MARK: BRAIN
//

let brain = io.of('/brain');
brain.on('connection', (socket) => {
  console.log('eyy its da brain!: ' + socket.id);

  // socket.emit('clientInit', { //hmm could just be update...
  //   game: game,
  //   state: state,
  //   players: players
  // });

  // socket.on('removePlayer', (data)=>{
  //   //sent by boss to remove bug accounts or for laborious edit (redo profile)
  //   //rn just in console, no UI on boss page
  //   // let accountIndex = players.indexOf(data.name);
  //   let accountIndex;
  //   for (let [i, player] of players.entries()){
  //     if (player.name == data.name){
  //       accountIndex = parseInt(i);
  //       console.log(`removed account index: ${accountIndex}`);
  //     }
  //   }
  //   console.log(`removing player account: ${players[accountIndex].name}`);
  //   console.log(players[accountIndex]);

  //   players.splice(accountIndex, 1);
  //   backup();
  // });

  //listen for this client to disconnect
  socket.on('disconnect', () => {
    console.log('brain disconnected: ' + socket.id);
  });
});

//
// MARK: SERVER LOOP
//

setInterval( () => {
  //do we need any looped updates?
  //yes, for timer?
  // state.timer = Date.now() - state.lastTime; //still in ms, clients can parse -- issue with interval being 100?
  // let update = {
  //   game: game,
  //   state: state,
  //   players: players
  // };

  // io.emit('updates', update);
  // //no idea why this doesn't work... io is only default namespace?
  // boss.emit('updates', update);
  // godot.emit('updates', update);
  // lotto.emit('updates', update);
  //keeper
}, 100); //too much?

//
// MARK: FUNCTIONS
//

// function checkPlayerConnect(s){
//   for (let player of players) {
//     console.log('checking');
//     console.log(s.handshake.headers.cookie.slice(3));
//     console.log(player.engineCookie);
//     if (s.handshake.headers.cookie.slice(3) == player.engineCookie) {
//       //existing player, so update profile's cookie and send back player info
//       console.log(player.name + " reconnected!");

//       //hmm, updating id for check later
//       player.id = s.id;

//       s.emit('cookieReconnect', player); //sends the cookie back in other event
//       return;
//     }
//   }

//   console.log("new player, waiting for profile info");
// }
