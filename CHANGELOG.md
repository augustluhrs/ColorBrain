# CHANGELOG

## Version 0

### TODO

- [ ] Server
  - [X] on connect
  - [X] on seat selection
  - [X] sort seat map
  - [X] start color chain
  - [ ] interval color spawner
  - [ ] restart stalled chains
  - [X] colorFromClient
  - [X] colorToClient
  - [ ] toNano
  - [ ] toTD
  - [X] seat object
  - [ ] color queue setup
  - [X] add new seat to seat
  - [X] remove seat when disconnect
  - [X] redo seat map on disconnect
  - [X] redo seat map on new seat
  - [ ] demo mode
  - [ ] Stretch
    - [ ] send inactive message to stalled clients
    - [ ] during waiting, highlight the four phones that are the end points (color matching strip)
- [ ] Client
  - [X] seat map graphic
  - [X] select seat and submit
  - [X] seatSelection to Server
  - [X] hasStarted from server
  - [ ] demo phase
  - [X] color from server
  - [X] press to send back to server
  - [ ] Stretch
    - [ ] seat rows accurate (from brain?)
    - [ ] inactive from server, tap to reactivate
    - [ ] tint floorplan so doesn't blind if reconnect
- [ ] Brain
  - [ ] nanoTrigger from server
  - [ ] OSC to Nano
  - [ ] OSC to TD
  - [ ] Stretch
    - [ ] color overrides
    - [ ] color progress panel
    - [ ] test UI
    - [ ] type OSC input vs on glitch
    - [ ] adjustment of seat map
    - [ ] seat map live view

### Changes

#### 0.0.2 *8/9/24 3hrs*

- client floorplan and seat selection events
- server init, seats, event functions
- server sort seat map
- color to client <--> to server messages, end of chain to Nano
- dynamic chain adjustment
  ^_^

#### 0.0.1 *8/9/24 30 mins*

- project init
- created template `p5SocketTemplate`
- imported to glitch and boosted
