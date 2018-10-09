var express = require("express");
var app = express();
var http = require("http");
var httpServer = http.createServer(app);
var socketIO = require("socket.io");
var io = socketIO.listen(httpServer);

// the static files
app.use(express.static((__dirname, 'public')));

app.get('/', function(req, res){
   //res.sendfile('index.html');
});

var userList = [];
var channels = {};

var sessions = {};

io.on('connection', function(socket) {

/***********************************************************************
********************** NEW USER ONLINE ********************************
***********************************************************************/
  socket.on('newUser', function(user){    
    
    if(user.sessionID == null) {
      var sessionID = socket.id.replace(/[-_.;]/g,'') + Math.floor((Math.random() * 9999 + 9));
      
      //send sessionID info to this user
      socket.emit('sessionInfo',sessionID);

      //add this session info into sessions object
      sessions[sessionID] = {};
      sessions[sessionID].username = user.name;
      sessions[sessionID].socketID = socket.id;      
    } 
    else {
      //check if session id already present
      if(sessions[user.sessionID] == undefined) {
        sessions[user.sessionID] = {};
      }

      //update the socket id
      sessions[user.sessionID].socketID = socket.id;
      sessions[user.sessionID].username = user.name;
    }

    console.log('sessions updated...');
    console.log(sessions);

    broadcastUserList();
  });
///////////////////////////////////////////////////////////////////////

/* Send a list of current online users to everyone */
  function broadcastUserList(){
    var userList = [];
    var user;
    for(var sesID in sessions) {
      user = {};
      user.sessionID = sesID;
      user.name = sessions[sesID].username;
      userList.push(user);
    }

    io.emit('newUser', userList);
  }
////////////////////////////////////////////////////////////////////////
  

/**********************************************************************
**************** USER IS DISCONNECTED *********************************
***********************************************************************/
  socket.on('disconnect', function() {
    console.log('Disconnected socketID = ' + socket.id);    

    //remove this session from our sessions
    for(var sessionID in sessions) {
      if(sessions[sessionID].socketID == socket.id) {
        delete sessions[sessionID];
        break;
      }
    }

    console.log('updated sessions object');
    console.log(sessions);

    //update the new userList to all user
    broadcastUserList();
  });
///////////////////////////////////////////////////////////////////

/******************** NEW CHAT REQUEST **************************/
  socket.on('chatRqst', function(chatRqst) {
    //create a new channel and add users
    channels[chatRqst.channelID] = [chatRqst.fromID, chatRqst.toID];
    console.log("updated channels");
    console.log(channels);    
  });
///////////////////////////////////////////////////////////////////

/******** SOMEONE SENT A CHAT... REDIRECT IT **********************/
  socket.on('chat', function(chat) {
    console.log('chat recieved');
    console.log(chat);
    sendToAll(chat);
    //chat.fromID = socket.id;    
  });
//////////////////////////////////////////////////////////////////

/*************** ADD A NEW USER TO AN EXISTING CHAT *************/
  socket.on('addUserToChat', function(addUser){
    //add this user to the UsersArray of the requested channel
      if(channels[addUser.toChannel].indexOf(addUser.id) == -1) {
        //add the user
        channels[addUser.toChannel].push(addUser.id);

        //let everyone know that a new user is added to their chat
        var serverMsg = {};
        serverMsg.channelID = addUser.toChannel;
        serverMsg.msg = "Server: " + addUser.name + " is added by " + addUser.addedByName;

        sendToAll(serverMsg);

        console.log("updated channels");
        console.log(channels);
      }      
  });
//////////////////////////////////////////////////////////////////


/************ A USER DISJOINS FROM A CHAT CHANNEL **************/
  socket.on('disjoin', function (disjoin) {
    //remove this socket id from the rqst channel
    var thisChanUsrArr = channels[disjoin.channelID];
    thisChanUsrArr.splice(thisChanUsrArr.indexOf(disjoin.sessionID),1);
    var isEmpty = deleteChannelIfEmpty(disjoin.channelID);
    console.log("updated channels");
    console.log(channels);
    if(!isEmpty){
      //Inform Other Users...
      var disjoinMsg = {};
      disjoinMsg.channelID = disjoin.channelID;
      disjoinMsg.msg = "Server: " + disjoin.username + " left this channel...";
      sendToAll(disjoinMsg);
    }    
  });
////////////////////////////////////////////////////////////////////////

/**********************************************************************
******** Delete an user, inform others... simple **********************
**********************************************************************/
  socket.on('deleteUser', function(deleteID){
    //remove this session from our sessions
    
    if(sessions[deleteID] != undefined) {     
       
      var chat = {};
      chat.msg = 'Server: '+ sessions[deleteID].username + ' signed out';
      delete sessions[deleteID];

      for(var channelID in channels){
        if(channels[channelID].indexOf(deleteID) > -1) {
          channels[channelID].splice(channels[channelID].indexOf(deleteID),1);
          
          var isEmpty = deleteChannelIfEmpty(channelID);
          if(!isEmpty){
            //inform others          
            chat.channelID = channelID;          
            sendToAll(chat);
          }          
        }
      }
    }

    console.log('User deleted due to user signout');
    console.log(deleteID);
    console.log('updated sessions object');
    console.log(sessions);
    console.log('updated channels');
    console.log(channels);

    //update the new userList to all user
    broadcastUserList();
  });
///////////////////////////////////////////////////////////////////////

  function sendToAll (chat) {
    /*usersID is actually that users sessionID*/
    var usersIDArray = channels[chat.channelID];   
    var sockID;
    chat.users = usersIDArray; //all the users connected to this channel
    if(usersIDArray == undefined){return;}
    if (usersIDArray.length == 1) {
      //console.log(usersIDArray);
      //only one user left in a channel
      chat.msg = "Server: Everyone else has left this channel. Please close this windows and start a new one...";
      //check if that session still exists
      if(sessions[usersIDArray[0]] != undefined) {
        sockID = sessions[usersIDArray[0]].socketID;                
        if(io.sockets.connected[sockID] != undefined) {
          io.sockets.connected[sockID].emit('chat', chat);
        }
      }      
    } 
    else {
      for(var i=0; i<usersIDArray.length; i++) {
        if(sessions[usersIDArray[i]] == undefined) {
          //if a particular user has gone offline, continue with the others
          continue;
        }        
        sockID = sessions[usersIDArray[i]].socketID;
        //console.log('channels[i]=' + sockID);
        io.sockets.connected[sockID].emit('chat', chat);
      }
    }
  }
/////////////////////////////////////////////////////////////////

/****************************************************************
deleteChannelIfEmpty checks a channel based on channelID passed 
and deletes if empty ******************************************
******************************************************************/
  function deleteChannelIfEmpty(channelID){
    if(channels[channelID]!=undefined && channels[channelID].length == 0) {
      console.log('deleting channel='+channelID+"...Since it is EMPTY...");
      delete channels[channelID];
      return true;
    } else {
      return false;
    }
  }
///////////////////////////////////////////////////////////////////
  
});

httpServer.listen(process.env.PORT || 9090, function() {
    console.log('Server listening at ' + (process.env.PORT || 9090));
});