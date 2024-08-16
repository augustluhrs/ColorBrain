/*
    ~ * ~ * ~ * 
    ~ * ~ * ~ * MOBILE 
    ~ * ~ * ~ * PLAYER
    ~ * ~ * ~ * INTERFACE
    ~ * ~ * ~ * 
*/

// MARK: SOCKET

//open and connect the input socket
let socket = io('/', {
  withCredentials: true
});

//listen for the confirmation of connection 
socket.on('connect', () => {
    console.log('now connected to server');
    if (socket.recovered) {
      console.log('previous connection reestablished')
    }
});

socket.on('colorToClient', (data)=>{
  signal = data;
  phase = "color";
  hasStarted = true;
});

// socket.on('sendMQTT', (data)=>{
//   sendMsgToAll();
// });

// MARK: MQTT

// MQTT client details:
// let broker = {
//     hostname: 'funbrain.cloud.shiftr.io',
//     port: 443 //this needs to be 443 even if shiftr says to use 1883 because we need WSS
// };
// // MQTT client:
// let client;
// // client credentials:
// let creds = {
//     clientID: 'audiencePhone',
//     userName: 'funbrain',
//     password: 'CZApgljANRkzg2GK'
// }
// topic to subscribe to when you connect:
// let topic = 'color';
// let kitchen = "kitchen";

// MARK: GAME STATE VARIABLES

// let players, state;
// let seats, state; //need either? prob not
// let phase = "login";
let hasPickedSeat = false; //intro screen seat selection
let hasDisconnected = false; //not sure if this will ever happen, but server sends message if hasn't responded, can tap to reconnect
let hasStarted = false; //just for reminder text
// let hasReceivedColor = false; //hmm.... feels redundant
// let hasSentColor = true; //gate for allowing color message back to server on screen tap
let phase = "floorplan"; // floorplan --> waiting --> color --> [inactive]
let signal = { //color message from server
  chain: 0,
  index: 0,
  color: {
    r: 0,
    g: 0,
    b: 0
  }
}
let seatPos = {
  x: 0,
  y: 0
}
let seatHue = 180;

// MARK: UI VARIABLES

let font, textSize_L, textSize_M, textSize_S;
let floorplan;
let canvas;
let wCell, hCell; //hmm. just for grid spacing...
let headY, bodyY, footY; //y height of sections

function preload(){
  font = loadFont('assets/fonts/fugaz.ttf');
  floorplan = loadImage('assets/imgs/studioG.jpg');
}

function setup(){
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.id("canvas");
  // background(82,135,39);

  //currently using a 14x30 grid of cells for mobile portrait mode
  //layout of 5x14 (not incl padding) for header, 7x14 for footer, 18x14 for body
  wCell = width / 14;
  hCell = height / 30;
  headY = hCell * 4;
  bodyY = hCell * 19;
  footY = hCell * 6;

  textSize_L = width/12;
  textSize_M = width/24;
  textSize_S = width/36;


  //layout
  ellipseMode(CENTER);
  rectMode(CENTER);
  imageMode(CENTER);
  angleMode(RADIANS);
  textFont(font);
  textAlign(CENTER, CENTER);
  textSize(width/40);
  strokeWeight(2);
  // colorMode();

  //trying to fix UI bug, need both socket info and setup to have finished
  // hasEitherFinished ? initUI() : hasEitherFinished = true;
  
  //MQTT
  // client = new Paho.MQTT.Client(broker.hostname, Number(broker.port), creds.clientID);
  //   // set callback handlers for the client:
  //   client.onConnectionLost = onConnectionLost;
  //   client.onMessageArrived = onMessageArrived;
  //   // connect to the MQTT broker:
  //   client.connect(
  //       {
  //           onSuccess: onConnect,       // callback function for when you connect
  //           userName: creds.userName,   // username
  //           password: creds.password,   // password
  //           useSSL: true                // use SSL
  //       }
  //   );
};

//
// MARK: Draw
//

function draw(){
  // background(82,135,39);
  background(0);

  switch (phase){
    case "floorplan": //seat selection graphic
      push();
      translate(width/2, height/2);
      rotate(PI/2);
      image(floorplan, 0, 0, height, width);
      textSize(textSize_M);
      text('SCREEN', 0, -2*width/5);
      text('DOOR', (hCell * 27) - height/2, -(wCell * 2) + width/2);
      if(hasPickedSeat){
        seatHue+=5;
        fill(180, seatHue % 255, 180);
        ellipse(seatPos.rX, seatPos.rY, wCell);
        fill(100, 255, 0);
        rect(0, -width/5, hCell * 14, wCell * 3);
        fill(0);
        text('Click here to confirm your location, \nor retap to move the circle', 0, -width/5, hCell * 14, wCell * 3);
      } else {
        text('please tap where you currently are in the room', 0, 0);
        noFill();
        rect(0, -width/5, hCell * 3, wCell * 2);
        fill(0);
        text('August', 0, -width/5);
      }
      pop();

      break;
    case "waiting": //black screen
      push();
      textSize(textSize_M);
      fill(255);
      if (hasStarted){
        text('waiting', width/2, height/2);
      } else {
        text('waiting \n\n remember to turn your brightness up plz', width/2, height/2);
      }
      pop();
      break;
    case "color": //live signal
      push();
      background(signal.color.r, signal.color.g, signal.color.b);
      pop();
      break;
    case "demo": //tutorial screen

      break;
  }

  //debug design grid
  // showGrid();
}

//
// MARK: Init Functions
//
/*
// called when the client connects
function onConnect() {
    // localDiv.html('client is connected');
    client.subscribe(topic);

}

// called when the client loses its connection
function onConnectionLost(response) {
    if (response.errorCode !== 0) {
        // localDiv.html('onConnectionLost:' + response.errorMessage);
      console.log(response.errorMessage);
    }
}

// called when a message arrives
function onMessageArrived(message) {
    // remoteDiv.html('I got a message:' + message.payloadString);
    let  incomingNumber = parseInt(message.payloadString);
    // if (incomingNumber > 0) {
    //     intensity = 255;
    // }
}

function sendMsgToAll() {
    if (client.isConnected()) {
        // let msg = String(round(random(15)));
        let msg = rgbToHex(signal.color.r, signal.color.g, signal.color.b);
        message = new Paho.MQTT.Message(msg);
        message.destinationName = topic;
        client.send(message);
        // localDiv.html('I sent: ' + message.payloadString);
      console.log('sent' + message.payloadString);
    }
}
*/

//
// MARK: Misc Functions
//

function mousePressed(){
  console.log(mouseX / width, mouseY / height);
  if (phase == "floorplan"){
    if ((mouseX / width) > 0.55 && ((mouseY / height) > 0.25 && (mouseY/height) < 0.75)){
      if (hasPickedSeat) {
        //'clicking' confirm button, send to server
        socket.emit('assignSeat', seatPos);
        console.log('sent seat location to server');
        phase = "waiting";
        //server sets phase after creating player? whats better?
      }
    } else {
      hasPickedSeat = true;
      seatPos.x = mouseX / width;
      seatPos.y = mouseY / height;
      seatPos.rX = ((seatPos.y * 30) * hCell) - height/2;
      seatPos.rY =  -((seatPos.x * 14) * wCell) + width/2;
      // seatPos.x = ((mouseX / width) * height) - height/2;
      // seatPos.y = ((mouseY / height) * width) - width/2;
    }
    return;
  }

  if (phase == "color"){
    socket.emit('colorToServer', signal);
    phase = 'waiting';
  }

  if (phase == "inactive"){

  }
}

function showGrid(){
  for (let row = 0; row <= 30; row ++){
    text(row, wCell / 2, row * hCell);
    line(0, row * hCell, width, row * hCell);
  }
  for (let col = 0; col <= 14; col ++){
    text(col, col * wCell, hCell / 2);
    line(col * wCell, 0, col * wCell, height);
  }
}

function hexToRGB(hex){
  //https://learnersbucket.com/examples/interview/convert-hex-color-to-rgb-in-javascript/
  const r = parseInt(hex.slice(1, 3), 16)/255;
  const g = parseInt(hex.slice(3, 5), 16)/255;
  const b = parseInt(hex.slice(5, 7), 16)/255;
    
  return { r: r, g: g, b: b};
}

function rgbToHex(r, g, b) {
  // Ensure values are within the range 0-255
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  // Convert each component to a two-digit hexadecimal string
  const toHex = (c) => {
    const hex = c.toString(16).toUpperCase();
    return hex.length === 1 ? '0' + hex : hex;
  };

  // Concatenate the hex values with a '#' prefix
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function randomHex(){ // thanks https://css-tricks.com/snippets/javascript/random-hex-color/
  let randomColor = "";
  while(randomColor.length !== 6) { //errors if 5
    randomColor = Math.floor(Math.random()*16777215).toString(16);
  }
  return "#" + randomColor;

}


