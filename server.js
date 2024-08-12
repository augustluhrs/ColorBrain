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

// MARK:  Variables
let seats = {};
// let colorQueue = [];
let chains = [[]];
let chainIndex = 0; 
//hmm why not above in state? whatevs
let hasStarted = false;

// MARK: Game State Variables
let state = { //the "game state" for everything, not just godot game
  phase: "prelude", //the label that's displayed, dictates what part of round we're in
  timer: 0, 
  lastTime: Date.now(),
}; 

//color queue placeholder

let colorQueue = [
  {r: 255, g: 0,   b: 0},
  {r: 0,   g: 255, b: 0},
  {r: 0,   g: 0,   b: 255},
  {r: 255, g: 255, b: 255},
]
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

  //seat selection msg from client
  socket.on('assignSeat', (data)=>{
    for (let seat of Object.keys(seats)){
      //check for existing seat with this id
      if (seat == socket.id){
        seat.pos.x = data.x; //normalized
        seat.pos.y = data.y;
        console.log(`updated seat, ${socket.id} at ${data.x}, ${data.y}`);
        console.log(`numSeats: ${Object.keys(seats).length}`);
        console.log('adjusting seat map');
        chains = sortSeatMap();
        return;
      } 
    }

    //if gets here, no corresponding seat
    seats[socket.id] = {
      chain: null,
      index: null,
      pos: {x: data.x, y: data.y},
    };
    console.log(`new seat from ${socket.id} at ${data.x}, ${data.y}`);
    console.log(`numSeats: ${Object.keys(seats).length}`);
    console.log('adjusting seat map');
    chains = sortSeatMap();

    //demo remove later TODO
    hasStarted = true;

    //client switches to waiting itself, so no need to send confirm event
  });

  //color signal from chain, pass along or send to nano
  socket.on('colorToServer', (data)=>{
    //gets chain, index of seat in chain, and color
    
    if (data.index < chains[data.chain].length - 1){
      //send to next phone
      data.index++;
      main.to(chains[data.chain][data.index].id).emit('colorToClient', data);
      console.log(`sent continued signal at chain ${data.chain} --> ${data.index}: ${JSON.stringify(data.color)}`);
    } else{
      //send to nano
      console.log('\n\nNANO\n\n');
      main.to(chains[data.chain][data.index].id).emit('sendMQTT', data);

    }
  });

  //listen for this client to disconnect
  socket.on('disconnect', () => {
    console.log('player client disconnected: ' + socket.id + "\n");
    for (let seat of Object.keys(seats)){
      if (seat == socket.id){
        // console.log(seats);
        delete seats[seat];
        chains = sortSeatMap();
        return;
      }
    }
    console.log('error deleting ' + socket.id);
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
  // state.timer = Date.now() - state.lastTime; //still in ms, clients can parse -- issue with interval being 100?

  //demo color start
  if (hasStarted){
    startColorSignal();
  }

}, 3000); //long for now, just to demo chains

//
// MARK: FUNCTIONS
//

function startColorSignal(){
  // sends event to first in chain, on interval, from color queue
  // TODO should have color queue just be object with num signals? and decrement on successful to nano?
  // use current chainIndex to know which chain to use, then increment after
  // console.log(chains);
  if (chains[0].length <= 0){return;}

  let startID = chains[chainIndex][0].id;
  let signal = {
    chain: chainIndex,
    index: 0,
    color: {
      r: colorQueue[0].r,
      g: colorQueue[0].g,
      b: colorQueue[0].b,
    }
  }
  main.to(startID).emit('colorToClient', signal);
  console.log(`started new signal at chain ${chainIndex} with ${startID}: ${JSON.stringify(signal.color)}`)
  colorQueue.push(colorQueue.splice(0, 1)[0]); //for now, just cycle the colors;
  console.log(colorQueue);


  chainIndex = (chainIndex + 1) % chains.length;
}

function sortSeatMap(){
  //with every seat connect/disconnect/inactive/active, redo the chains
  //aiming for 4 chains, evenly sorting by vertical slice of audience (back to front)
  
  // current method --> sort into four slices by yPos
  // then sort by xPos, with least as start, most as end
  let numSeats = Object.keys(seats).length;
  //low participant mode, all in same chain  
  if (numSeats < 8){
    // let numChains = Math.floor(numSeats / 2);
    let newChains = [];
    //just sort the seats by xPos and put all in chain 0
    let oneChain = [];
    for (let seat of Object.keys(seats)){
      oneChain.push({id: seat, pos: seats[seat].pos});
    }
    console.log(oneChain);
    oneChain = oneChain.sort((a,b)=> a.pos.x - b.pos.x);
    console.log(oneChain);
    newChains.push(oneChain);
    return newChains;
  }

  //quorum mode: (at least 8, for start/end of each chain)
  let minSeats = Math.floor(numSeats / 4);
  let newChains = [[],[],[],[]];
  //just sort the seats by yPos and put all in chain 0
  let oneChain = [];
  for (let seat of Object.keys(seats)){
    oneChain.push({id: seat, pos: seats[seat].pos});
  }
  console.log(oneChain);
  oneChain = oneChain.sort((a,b)=> a.pos.y - b.pos.y);
  console.log(oneChain);
  
  //split by minimum
  newChains[0] = oneChain.splice(0, minSeats);
  newChains[3] = oneChain.splice(-minSeats, minSeats);
  newChains[1] = oneChain.splice(0, oneChain.length / 2);
  newChains[2] = oneChain; //ref err? check TODO

  console.log(newChains);
  return newChains;
}
