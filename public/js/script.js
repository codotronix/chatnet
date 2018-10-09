$(function(){
    showMask();
    var socket = io();
    var user = {};
    var htmlBasicIcon = '';
    var htmlStickers = '';
    var channels = {};
/**********************************************************************
    check cookie to see if any user info is available
***********************************************************************/
    var cookieObj = {};
    if(document.cookie.length > 0) {
       var cookieArr = document.cookie.trim().split(';');        
        var cookie;
        for(var i=0; i<cookieArr.length; i++) {
            cookie = cookieArr[i].split('=');
            cookieObj[cookie[0].trim()] = cookie[1].trim();
        } 
    }
    //console.log(cookieObj);

    if (cookieObj.sessionID == undefined) {
        goToPage(1);
        hideMask();
    } else {
        user.name = cookieObj.username;
        user.sessionID = cookieObj.sessionID;
        socket.emit('newUser', user);
        $('#greetings').text('Hello ' + user.name + ' !');
        goToPage(2);
        hideMask();
    }
////////////////////////////////////////////////////////////////////////

/**********************************************************************
    when a new user (i.e cookie null, hence no session id) log in, the
    server will send back a session id and required userinfos in a 
    string... store it in a cookie 
***********************************************************************/
/********************* USER GOES ONLINE *****************************/    
    //when the goOnline button is clicked, show this userOnline
    $('#goOnline').on('click touchstart', function (ev) {
        ev.stopPropagation();
        goOnline();
    });

    //enter pressed on userName field
    $('#userName').on('keydown', function(e){
        if(e.keyCode == 13) {
            goOnline();
        }
    });

    function goOnline(){
        var userName = $('#userName').val().trim();

        //username should not be blank
        if(userName == '') {
            $('#userName').addClass('error');
        } else {
            $('#userName').removeClass('error');
            user.name = userName;
            user.sessionID = null;           
            socket.emit('newUser', user);
            showMask();
        }
    }

    /*since session==null for this user, server will send sessionID */
    socket.on('sessionInfo', function(sessionID){
        var d = new Date();
        d.setTime(d.getTime() + (365*24*60*60*1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = "sessionID=" + sessionID + "; " + expires;
        document.cookie = "username=" + user.name + "; " + expires;
        user.sessionID = sessionID;
        $('#greetings').text('Hello ' + user.name + ' !');
        goToPage(2);
        hideMask();
    });
//////////////////////////////////////////////////////////////////////

/*********************************************************************
** whenever a fresh user array list is received from server show it **
**********************************************************************/
    socket.on('newUser', function(userArray){
        var userListHtml = '';
        for(var i=0; i<userArray.length; i++) {
            if(userArray[i].sessionID == user.sessionID) {continue;}
            userListHtml += '<li data-userID="' + userArray[i].sessionID + '">'
                         +      '<span class="name">' + userArray[i].name + '</span>'                        
                         +'</li>';
        }
        $('#UserList').html(userListHtml);

        //if userlist is empty, hide it
        if($('#UserList li').length == 0) {
            $('#UserList').hide();
            $('.secUserList h2.title span').removeClass('fa-chevron-up').addClass('fa-chevron-down');
        }
    });
    
//////////////////////////////////////////////////////////////////////


/*******************************************************************
   whenever you click on an user from the Online Users List, 
    you want to talk to him 
******************************************************************/
    $('body').on('click touchstart', '#UserList li', function(ev){
        ev.stopPropagation();
        if(!isTouchDropdownStable('UserList_li')) {return;}

        var talkToID = $(this).attr('data-userid');
        var talkToName = $(this).find('.name').text();

        var sendRqst = confirm('Send chat request to ' + talkToName + '?');
        
        if(sendRqst) {
            var chatRqst = {};
            chatRqst.fromID = user.sessionID
            //chatRqst.fromName = user.name;
            chatRqst.toID = talkToID;
            chatRqst.channelID = talkToID + Math.floor((Math.random() * 9999 + 9));
            chatRqst.channelID = chatRqst.channelID.replace(/[-_.]/g,'');
            socket.emit('chatRqst', chatRqst);

            chatRqst.chatToName = talkToName;
            createChatWindow(chatRqst);
        }
    });

    function createChatWindow(chatRqst){
        var chatWindow = $('.templateChatWindow').clone();
        chatWindow.removeClass('templateChatWindow');
        chatWindow.attr('id', chatRqst.channelID);
        var users = '';
        var temp;
        if(chatRqst.users != undefined) {
           for(var i=0; i<chatRqst.users.length; i++) {
                temp = $('#UserList li[data-userid='+chatRqst.users[i]+']');
                if(temp.length > 0) {
                    users += temp.find('.name').text() + ', ';
                }                 
            }
        }        

        var title = users || chatRqst.chatToName;
        chatWindow.find('.chatTitle span.name').text(title);
        //$('#chatGlobalContainer').append(chatWindow);
        //balanceBothSide();
        balancedAdd(chatWindow)
    }

    function balancedAdd(chatWindow) {
        var no_Win_left = $('#chatGlobalContainer .leftChannel .chatWindow').length;
        var no_Win_right = $('#chatGlobalContainer .rightChannel .chatWindow').length;

        if(no_Win_left <= no_Win_right) {
            $('#chatGlobalContainer .leftChannel').append(chatWindow);
        } else {
            $('#chatGlobalContainer .rightChannel').append(chatWindow);
        }
    }

/***************** CHATBOX SHOW/HIDE ON CLICK **********************/
    $('body').on('click touchstart', '.icoArrowUpDown', function(ev){
        if(!isTouchDropdownStable($(this).closest('.chatWindow').attr('id'))) {return;}
        ev.stopPropagation();
        var secChatBody = $(this).closest('.chatWindow').find('.secChatBody');
        if (secChatBody.css('display') == 'none') {
            secChatBody.slideDown(500);
            $(this).removeClass('fa-chevron-down').addClass('fa-chevron-up');
            $(this).closest('.chatWindow.glow').removeClass('glow');
        } else {
            secChatBody.slideUp(500);
            $(this).removeClass('fa-chevron-up').addClass('fa-chevron-down');
        }
    });
/////////////////////////////////////////////////////////////////////

/************ ONLINE USERLIST SHOW/HIDE ON CLICK ******************/
    $('body').on('click touchstart', '.secUserList h2.title', function(ev){
        ev.stopPropagation();
        if(!isTouchDropdownStable('AllUserListToggler')) {return;}
        var targetDisplay = $('#UserList').css('display');
        if(targetDisplay == 'none') {
            $('#UserList').slideDown(500);
            $('.secUserList h2.title span').removeClass('fa-chevron-down').addClass('fa-chevron-up');
        } else {
            $('#UserList').slideUp(500);
            $('.secUserList h2.title span').removeClass('fa-chevron-up').addClass('fa-chevron-down');
        }
    })
////////////////////////////////////////////////////////////////////

/************ INVOLVED USERS SHOW/HIDE ON CLICK ******************/
    $('body').on('click touchstart', '.chatTitle .users', function(ev){
        ev.stopPropagation();
        var chatWindowID = $(this).closest('.chatWindow').attr('id');
        if(!isTouchDropdownStable(chatWindowID+'_involvedUsers')) {return;}
        var targetDisplay = $('#'+chatWindowID).find('.involvedUsers').css('display');
        var involvedUsersUL = $('#'+chatWindowID).find('.involvedUsers');

        if(targetDisplay == 'none') {
            var listHtml = '';
            var usersArr = channels[chatWindowID];
            var userInfo;
            for(var i=0; i<usersArr.length; i++) {
                userInfo = $('#UserList li[data-userid='+usersArr[i]+']');
                if(userInfo.length > 0) {
                    listHtml += '<li data-userid="'+ usersArr[i] +'">'
                                +   '<span class="name">'+ userInfo.find('.name').text() +'</span>'
                                +'</li>'     
                }
            }

            involvedUsersUL.html(listHtml);
            involvedUsersUL.slideDown(500);
            $('#'+chatWindowID).find('.users .dropDownArrow').removeClass('fa-angle-down').addClass('fa-angle-up');
        } else {
            involvedUsersUL.slideUp(500);
            $('#'+chatWindowID).find('.users .dropDownArrow').removeClass('fa-angle-up').addClass('fa-angle-down');
        }
    });
////////////////////////////////////////////////////////////////////

/*********** CHAT WINDOWS CLOSE BUTTON IS CLICKED *****************/
    $('body').on('click touchstart', '.icoCross', function(ev){
        ev.stopPropagation();
        //close this chat window
        var sure = confirm("Sure you want to close this chat?");

        if(!sure) {
            return;
        }

        var chatWindow = $(this).closest('.chatWindow');
        var channelID = chatWindow.attr('id');
        chatWindow.remove();

        //send the channelID to the server 
        //to remove this user from this channel
        var disjoin = {}
        disjoin.username = user.name;
        disjoin.sessionID = user.sessionID;
        disjoin.channelID = channelID;
        socket.emit('disjoin', disjoin);     
    });
///////////////////////////////////////////////////////////////////

/***** ADD USER TO CURRENT CHAT -- PLUS BUTTON CLICKED ***********/
    $('body').on('click touchstart', '.chatWindow .icoAddToChat', function (ev){
        ev.stopPropagation();
        if(!isTouchDropdownStable($(this).closest('.chatWindow').attr('id')+'_addUser')) {return;}

        var addPickUserUl = $(this).closest('.chatWindow').find('.addPickUser');
        if(addPickUserUl.css('display') == 'none') {
            addPickUserUl.html($('#UserList').html()).slideDown(500);
        } else {
            addPickUserUl.slideUp(500);
        }
        
    });

    $('body').on('click touchstart', '.chatWindow .addPickUser li', function (ev){
        ev.stopPropagation();
        var addUser = {};
        addUser.id = $(this).attr('data-userid');
        addUser.toChannel = $(this).closest('.chatWindow').attr('id');
        addUser.name = $(this).find('.name').text();
        addUser.addedByName = user.name;
        socket.emit('addUserToChat', addUser);

        $(this).closest('.addPickUser').slideUp(500);
    });
///////////////////////////////////////////////////////////////////

/************ BASIC SMILEY BTN CLICKED ***************************/
    $('body').on('click touchstart', '.chatWindow .basicSmiley', function (ev){
        ev.stopPropagation();

        if(!isTouchDropdownStable($(this).closest('.chatWindow').attr('id')+'_basicSmileyBtn')) {return;}

        var panel = $(this).closest('.chatWindow').find('.basicSmileyPanel');

        //see if basic icon is already loaded... if nor load it
        if(htmlBasicIcon == '') {
            //load basic icon
            $.getJSON('/data/basicSmiley.json', function(data){
                console.log(data);
                var classes = data.smileyClasses;
                htmlBasicIcon = '<ul>'
                for(var i=0; i<classes.length; i++) {
                    htmlBasicIcon +=  '<li>'
                                    +   '<span class="' + classes[i] + '"></span>'
                                    + '</li>';
                }
                htmlBasicIcon += '</ul>'
                panel.html(htmlBasicIcon);
                panel.toggle(500);
            });
        } else {
            if(panel.html().trim().length == 0) {
                panel.html(htmlBasicIcon);
            }
            
            panel.toggle(500);
        }
    });

    /*And a simple basic smiley is inserted*/
    $('body').on('click touchstart', '.chatWindow .basicSmileyPanel li', function (ev){
        ev.stopPropagation();
        if(!isTouchDropdownStable($(this).closest('.chatWindow').attr('id')+'_basicSmiley')) {return;}
        var insertIcon = '::smilico#' + $(this).find('span').attr('class') + '::'; 
        //console.log(insertIcon);
        var msgInput = $(this).closest('.chatWindow').find('.msg');
        var msgVal = msgInput.val();
        msgInput.val(msgVal + insertIcon);
    });
    /////////////////////////////////////////

///////////////////////////////////////////////////////////////////

/******************************************************************
********* SEND A STICKER... EVERYBODY LIKES STICKERS *************
******************************************************************/
    $('body').on('click touchstart', '.chatWindow .stickersBtn', function (ev){
        ev.stopPropagation();

        if(!isTouchDropdownStable($(this).closest('.chatWindow').attr('id')+'_stickersBtn')) {return;}

        var panel = $(this).closest('.chatWindow').find('.stickersBtnPanel');

        //see if basic icon is already loaded... if nor load it
        if(htmlStickers == '') {
            //load basic icon
            $.getJSON('/data/stickers.json', function(data){
                console.log(data);
                var baseUrl = data.baseURL;
                var imgURLs = data.imgURLs;
                var url = '';
                htmlStickers = '<ul>'
                for(var i=0; i<imgURLs.length; i++) {
                    url = baseUrl + imgURLs[i];
                    htmlStickers +=  '<li>'
                                    +   '<img class="thumbnails" src="' + url + '"/>'
                                    + '</li>';
                }
                htmlStickers += '</ul>'
                panel.html(htmlStickers);
                panel.toggle(500);
            }, function(err){
                console.log(err);
            });
        } else {
            if(panel.html().trim().length == 0) {
                panel.html(htmlStickers);
            }
            panel.toggle(500);
        }
    });

    /*And a sticker is clicked*/
    $('body').on('click touchstart', '.chatWindow .stickersBtnPanel li img', function (ev){
        ev.stopPropagation();
        if(!isTouchDropdownStable($(this).closest('.chatWindow').attr('id')+'_stickers')) {return;}

        var chat = {};
        chat.contentType = "sticker";
        chat.channelID = $(this).closest('.chatWindow').attr('id');
        chat.msg = user.name + ':' + $(this).attr('src');
        sendChat(chat);
    });
    /////////////////////////////////////////
///////////////////////////////////////////////////////////////////

/*********** SENDING A CHAT MESSAGE TO THE SERVER *************/
    $('body').on('click touchstart', '.chatWindow .send', function (ev){
        ev.stopPropagation();
        var chat = {};
        chat.contentType = "txt";
        chat.channelID = $(this).closest('.chatWindow').attr('id');
        var msgVal = $(this).closest('.msgBtnPanel').find('.msg').val().trim();
        if (msgVal.length > 0) {
            chat.msg = user.name + ':' + msgVal;
            sendChat(chat);
            $(this).closest('.msgBtnPanel').find('.msg').val('');
        }
    });

    $('body').on('keydown', '.chatWindow .msg', function (e){
        if(e.keyCode == 13) {
            var chat = {};
            chat.contentType = "txt";
            chat.channelID = $(this).closest('.chatWindow').attr('id');
            var msgVal = $(this).val().trim();
            if (msgVal.length > 0) {
                chat.msg = user.name + ': ' + msgVal;
                sendChat(chat);

                //immediately clearing is not clearing NewLines
                var elm = $(this);
                setTimeout(function(){
                   elm.val(''); 
               }, 50);               
            }
            else {
                var elm = $(this);
                setTimeout(function(){
                   elm.val(''); 
               }, 50);
            }
        }        
    });

/**********************************************************************
********************* ALL COMMON FUNCTIONS **************************
**********************************************************************/
    function sendChat(chat) {
        socket.emit('chat', chat);
    }

    function nyi(msg) {
        alert('"This functionality is Not Yet Implemented. Thanks for your interest..." - Barick');
    }

    function goToPage(pageNum){
        //hide all pages
        $('.page').hide();
        //show this page only
        $('.page'+pageNum).show();
    }

    function showMask(){
        $('.mask').show();
    }

    function hideMask(){
        $('.mask').hide();
    }

    /*this function will stop the anomaly caused by click+touchstart*/
    var touchTimeKeeper = {};
    function isTouchDropdownStable(touchedOn){
        //initialize if 1st time
        if(touchTimeKeeper[touchedOn] == undefined) {
            touchTimeKeeper[touchedOn] = 0;
        }

        var timeNow = (new Date()).getTime();
        var timeGap = timeNow - touchTimeKeeper[touchedOn];
        //console.log('timeGap='+timeGap);
        //if last touch was before 500ms the only allow
        if(timeGap > 500) {
            touchTimeKeeper[touchedOn] = timeNow;
            return true;
        } else {
            return false;
        } 
    }
/////////////////////////////////////////////////////////////////////

/******* RECEIVING MESSAGE FROM CHAT SERVER ***********************/
    socket.on('chat', function(chat){
        var sentFrom = chat.msg.slice(0, chat.msg.indexOf(':')).trim();
        //make chat.msg = chat.msg - senderName
        chat.msg = chat.msg.slice(chat.msg.indexOf(':')+1).trim();

        //if the chat window for this channel is not yet created, create it
        if($('#'+chat.channelID).length == 0) {
            if(sentFrom == 'Server') {
                return;
            }
            createChatWindow(chat);
        }

        //update channels
        channels[chat.channelID] = chat.users;
        //console.log(channels);        
        $('.alert_clip')[0].play();
        //if more than 2 users, then turn on groupChatInd indicator
        if(chat.users.length > 2) {
            $('#'+chat.channelID+' .groupChatInd').show();
        } else {
            $('#'+chat.channelID+' .groupChatInd').hide();
        }

        var chatLet = $('<div class="chatLet"></div>');

        //create chatLet and append the Sender Name
        chatLet.append('<span class="sender">'+sentFrom+'</span>');
        
        if(chat.contentType=="sticker"){
            var stickerHTML = '<div class="stickerContainer">'
                            +    '<img class="" src="'+chat.msg+'" />'
                            +  '</div>';
            chatLet.append(stickerHTML);
        } 
        else {
            //format the incoming msg
            if(chat.msg.indexOf('::') > -1) {
                var msgParts = chat.msg.split('::');

                //examine each part and then append judiciously
                for(var i=0; i<msgParts.length; i++) {
                    //check if icon is present
                    if(msgParts[i].indexOf('smilico') > -1) {
                        var parts = msgParts[i].split('#');
                        //check if className is present                 
                        if(parts.length >= 2) {
                            var className = parts[1].trim();
                            var htmlSmiley = '&nbsp;<span class="' + className + '"></span>&nbsp;';

                            //Now add the content
                            chatLet.append(htmlSmiley);
                        }
                    } else {
                        chatLet.append(document.createTextNode(msgParts[i]));
                    }
                }
            } else {
                chatLet.append(document.createTextNode(chat.msg));
            }
        }
               

        //add the chatLet div
        $('#' + chat.channelID + ' .chatBody').append(chatLet);

        $('#' + chat.channelID + ' .chatBody').scrollTop($('#' + chat.channelID + ' .chatBody').scrollTop()+300);
        if($('#' + chat.channelID + ' .secChatBody').css('display') == 'none') {
            $('.alert_clip')[0].play();
            $('#' + chat.channelID).removeClass('glow').addClass('glow');
        }
    });  
////////////////////////////////////////////////////////////////////

/********************************************************************
** If a user Signs out, delete all cookie and redirect to page 1 ****
** Also, tell server to delete this user and inform others       ****
*********************************************************************/
   $('body').on('click touchstart', '#signOut', function(ev){
        ev.stopPropagation();
        //set cookie to a past date to delete it
        var d = new Date();
        d.setTime(d.getTime() - (1*24*60*60*1000));
        var expires = "expires="+d.toUTCString();
        document.cookie = "sessionID="+ null + "; " + expires;
        document.cookie = "username=" + null + "; " + expires;

        //delete all chat windows
        $('.chatWindow').not('.templateChatWindow').remove();

        socket.emit('deleteUser', user.sessionID);

        goToPage(1);
   }); 
//////////////////////////////////////////////////////////////////////
    
})