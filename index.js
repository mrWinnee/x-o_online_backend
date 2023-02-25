const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin : '*',
        methods: ['GET', 'POST']
    }
});

/* const {joinRoom} = require('./utils/userActions.mjs') */
/* import {joinRoom} from './utils/userActions.mjs' */
let rooms = {};

const joinRoom = ({roomID, user, gameBoxs})=>{
    if(!rooms.hasOwnProperty(roomID)){
      
      rooms[roomID] = {
        users: [user],
        gameBoxs
      }
        
    }else{
      if(rooms[roomID].users.length <= 1)
        rooms[roomID].users.push(user)
    }

}

const getRandomString = () => {
  let randomString = '';
  const possibleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  for (let i = 0; i < 16; i++) {
    randomString += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
  }
  
  return randomString;
}
let cur_Player = 'x';


const winConditions = [
  [0,1,2],
  [3,4,5],
  [6,7,8],
  [0,3,6],
  [1,4,7],
  [2,5,8],
  [0,4,8],
  [2,4,6]
];

const checkDraw = (data)=>{
  let end_game = false;
  for(let i = 0; i<data.length;i++){
    const box = data[i];
    if(box.checked){
      end_game = true
    }else{
      end_game = false;
      break;
    }
  }
  if(end_game){
    return true;
  }else{
    return false;
  }
}

const checkWinner = ({player, data})=>{
  let endGame = false;
  const playerMoves = data.filter(elem => elem.player == player).map(elem => elem.index);

  if(playerMoves.length >= 3){

    for(let i = 0; i<winConditions.length;i++){
      const condition = winConditions[i];
    

      for(let i = 0; i<condition.length;i++){
        const condition_unit = condition[i];

        if(playerMoves.includes(condition_unit)){
          endGame = true
        }else{
          endGame = false;
          break;
        }

      }

      if(endGame){
        /* console.log(`the winner is player${player}`); */
        /* setStartGame(false) */
        return {
          winner : true,
          draw: false
        }
      }
    }

    if(!endGame && checkDraw(gameBoxs)){
      /* console.log("it's a draw"); */
      /* setStartGame(false) */
      return {
        winner : false,
        draw: true
      }
    }

  }

}


io.on('connection', (socket) => {
  console.log('Client connected');

  /* socket.emit('checkParams', null); */
  


  socket.on('joinRoom', ({room, gameBoxs})=>{
    let roomID;
    if(!room){
      roomID = getRandomString();
      socket.emit('path', {
        path: roomID
      })
    }else{
      roomID = room;
    }
    joinRoom({roomID, user: socket.id, gameBoxs})
    socket.room = roomID;
    socket.leave(socket.room)
    socket.join(roomID);
    /* console.log(socket.id,roomID) */
    console.log(rooms)
    if(rooms[roomID].users.length === 2){
      io.in(roomID).emit('startGame',null)
    }
  })


  socket.on('gameBoard', ({gameBoxs, targetId, prevPlayer, curPlayer})=>{
    console.log(curPlayer);
    rooms[socket.room].gameBoxs = gameBoxs;
    const gameProgress = checkWinner({
      player: prevPlayer,
      data: gameBoxs
    });
    
    socket.broadcast.to(socket.room).emit('gameChanges', {
      gameBoard : rooms[socket.room].gameBoxs,
      targetId,
      prevPlayer,
      cur_player: curPlayer
    })
    cur_Player = curPlayer;

    if(gameProgress?.winner){
      console.log(gameProgress)
      io.in(socket.room).emit('gameProgress', {
        winner : true,
        draw: false,
        player: prevPlayer
      })
      
    }else if(gameProgress?.draw){
      console.log(gameProgress)
      io.in(socket.room).emit('gameProgress', {
          winner : false,
          draw: true,
          player: prevPlayer
      })
    }

  })





  socket.on('disconnect', () => {
    if(socket.room){
      let indexOfUser = rooms[socket.room].users.indexOf(socket.id);
      rooms[socket.room].users.splice(indexOfUser, indexOfUser+1);
      if(rooms[socket.room].users.length <=0){
        delete rooms[socket.room]
      }
    }
    console.log('Client disconnected');
  });
 
});


const PORT = process.env.PORT || 8000;

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

