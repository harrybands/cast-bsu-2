chrome.runtime.sendMessage({todo: "showPageAction"});

var mPos = null; //mouse position
var currentFocus = null; //HTML DOM element last clicked on
var isEditable = false; //is the highlighted word editable
var selectedWord = "";
var imageObj = {};
var enableVoice = true;
var enablePictures = true;
var voiceSelect = "Justin";
var highlightDifference = {
    'highlightBackground' : true,
    'changeTextColor' : false,
    'underline' : false
}



chrome.storage.sync.get(['highlightBackground','changeTextColor','underline'], function(data){
    $.each(data, function(key, value) {
        if( value != null ) {
            highlightDifference[key] = value;
        }
    });
});

chrome.storage.sync.get(['enableVoice'], function(data){
    if(data.enableVoice != null) {
        //console.log("Current value for enableVoice: " + data.enableVoice);
        enableVoice = data.enableVoice;
    }
});
chrome.storage.sync.get(['enablePictures'], function(data){
    if(data.enablePictures != null) {
        //console.log("Current value for enablePictures: " + data.enablePictures);
        enablePictures = data.enablePictures;
    }
});
chrome.storage.sync.get(['voiceSelect'], function(data){
    //console.log(voiceSelect);
    if(data.voiceSelect != null) {
        //console.log("Current value for voiceSelect: " + data.voiceSelect);
        voiceSelect = data.voiceSelect;
    }
});

/* removes popup when clicking off it*/
$("body").on('click', ':not(#myPopup, #myPopup *)', function() {
    imageObj = {};
    var popup = document.getElementById("myPopup");
    if(popup) document.body.removeChild(popup);
});

/* creates spell checker window*/
function createWindow(word, arrayOfSuggestions, editable){
    //console.log("got to content script");
    //console.log(mPos.clientX + " " + mPos.clientY);
    //console.log("Editable? " + request.editable);
    if($('#myPopup').length) {
        var popup = document.getElementById("myPopup");
        if(popup) document.body.removeChild(popup);
    }

    isEditable = editable;

    //remove leading/trailing puncuation/spaces
    selectedWord = "" + word;
    selectedWord = selectedWord.replace(/^[ .,\/#!?$%\^&\*;:{}=\-_`~()]+|[ .,\/#!?$%\^&\*;:{}=\-_`~()]+$/g, "");
    //console.log(selectedWord);


    //pop up window
    var popup = document.createElement('div');
    popup.id = "myPopup";

    /*
    //Title
    var title = document.createElement('div');
    title.id = "myPopupTitle";
    var titleNode = document.createTextNode("CAST Spell Checker");
    title.appendChild(titleNode);
    popup.appendChild(title);
    */

    //Mispelled word
    var word = document.createElement('div');
    word.id = "myPopupWord";
    var wordNode = document.createTextNode(selectedWord);
    word.appendChild(wordNode);
    var misButton = document.createElement('div');
    misButton.id = "misButton";
    misButton.appendChild(word);

    /*Text To Speech Button 
    var ttsButton = document.createElement('div');
    ttsButton.id = "ttsButton";
    var ttsIcon = document.createElement('img');
    ttsIcon.id = "ttsIcon";
    ttsIcon.src = chrome.extension.getURL("speakIcon.png");
    ttsButton.appendChild(ttsIcon);
    */
    
    //Append stuff to the first content button, and append it to the popup
    var contentButton = document.createElement('div');
    contentButton.classList = "contentButton";
    contentButton.appendChild(misButton);
    //contentButton.appendChild(ttsButton);
    contentButton.style = "margin-bottom: 10px;";
    popup.appendChild(contentButton);


    var dmp = new diff_match_patch();

    //List of suggested spellings
    arrayOfSuggestions.forEach(function(item) {
        /* bing image search message */
        if (enablePictures)
            chrome.runtime.sendMessage({toDo: "imageSearch", keyword: item}, function() {});

        //Container for the two buttons
        var contentButton = document.createElement('div');
        contentButton.classList.add("contentButton");
        contentButton.id = "castSuggest-" + item;

        //First sub-button: the suggested word
        var suggestButton = document.createElement('div');
        suggestButton.classList.add("suggestButton");
        var div = document.createElement('div');
        div.classList = "spellingSuggestion";

        
        /* Find difference and put in span */
        var diff = dmp.diff_main(selectedWord, item);
        dmp.diff_cleanupSemantic(diff);
        diff.forEach(function(substr) {
            //console.log(substr[0] + " : " + substr[1]);
            if(substr[0] == 0) {
                var textNode = document.createTextNode(substr[1]);
                div.appendChild(textNode);
            } else if (substr[0] == 1) {
                var spanNode = document.createElement('span');
                spanNode.appendChild(document.createTextNode(substr[1]));
                //spanNode.classList.add('CAST_correctDiff');
                div.appendChild(spanNode);
                if(highlightDifference['changeTextColor'])
                    spanNode.classList.add('CAST_colorText');
                if(highlightDifference['highlightBackground'])
                    spanNode.classList.add('CAST_highlightBackground');
                if(highlightDifference['underline'])
                    spanNode.classList.add('CAST_underline');
            }
        });
        

        var imagepic = document.createElement('img');

        suggestButton.appendChild(div);
        

        /*Second sub-button: the TTS button
        var ttsButton = document.createElement('div');
        ttsButton.id = "ttsButton";
        var ttsIcon = document.createElement('img');
        ttsIcon.id = "ttsIcon";
        ttsIcon.src = chrome.extension.getURL("speakIcon.png");
        ttsButton.appendChild(ttsIcon);
        */

        //Append buttons to button container and finally to popup
        contentButton.appendChild(suggestButton);
        contentButton.appendChild(imagepic);
        //contentButton.appendChild(ttsButton);
        popup.appendChild(contentButton);
    });

    //display popup
    document.body.appendChild(popup);
    return popup;
}

/* Listener to put popup on screen*/
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.todo == "createOnTypeWindow") {
        if(request.arrayOfSuggestions.length > 0 ) {
            var popup = createWindow(request.selectedWord, request.arrayOfSuggestions, request.editable);
            var popupHeight = popup.clientHeight;
            var windowHeight = $(window).height();
            var inputHeight = currentFocus.clientHeight;
            var bodyRect = document.body.getBoundingClientRect(),
                elemRect = currentFocus.getBoundingClientRect(),
                topOffset = elemRect.top - bodyRect.top + inputHeight,
                leftOffset = elemRect.left - bodyRect.left;

            var heightNeeded = popupHeight + topOffset - document.documentElement.scrollTop;

            $('#myPopup').css({left: leftOffset});

            if(heightNeeded < windowHeight)
                $('#myPopup').css({top:topOffset});
            else
                $('#myPopup').css({top:topOffset - inputHeight - popupHeight});


        } else {
            var popup = document.getElementById("myPopup");
            if(popup) document.body.removeChild(popup);
        }

    } else if(request.todo == "createWindow") {

        var popup = createWindow(request.selectedWord, request.arrayOfSuggestions, request.editable);
        //positioning popup
        var popupHeight = popup.clientHeight;
        var windowHeight = $(window).height();
        var heightNeeded = popupHeight + mPos.clientY - document.documentElement.scrollTop;
 
        $('#myPopup').css({left:mPos.clientX});
        if(heightNeeded < windowHeight)
            $('#myPopup').css({top:mPos.clientY+10}); 
        else
            $('#myPopup').css({top:mPos.clientY-10-popupHeight}); 

    }
});

/* Replaces the value in the text box with the corrected spelling */
$(document).on('click', '.spellingSuggestion', function() {
    //console.log("innertext: " + this.innerText);
    //If the current word is editable, change it
    //console.log("selected word:" + selectedWord);
    if(currentFocus && currentFocus.value && isEditable)
    {
        var currentText = "" + currentFocus.value;
        var replace = "\\b" + selectedWord + "\\b";
        var re = new RegExp(replace,"g");
        currentFocus.value = currentText.replace(re, this.innerText);
    }
    else if(currentFocus && currentFocus.innerHTML && isEditable)
    {
        var currentText = "" + currentFocus.innerHTML;
        var replace = "\\b" + selectedWord + "\\b";
        var re = new RegExp(replace,"g");
        currentFocus.innerHTML = currentText.replace(re, this.innerText);
    }

    //sends data to be stored
    chrome.runtime.sendMessage({toDo: "storeData" , misspelled: selectedWord, correct: this.innerHTML}, function() {});

    //remove popup
    var popup = document.getElementById("myPopup");
    if(popup) document.body.removeChild(popup);
});

/* Text To Speech
document.addEventListener('click', function(clickData) {
    //console.log(clickData);
    if (clickData.target.id == "ttsButton") {
        //console.log("calling TTS");
        var speech = clickData.target.parentElement.firstChild.firstChild.innerText;
        chrome.runtime.sendMessage({toDo: "tts" ,toSay: speech}, function() {});
    }
    if (clickData.target.id == "ttsIcon") {
        //console.log("calling TTS");
        var speech = clickData.target.parentElement.parentElement.firstChild.firstChild.innerText;
        chrome.runtime.sendMessage({toDo: "tts", toSay: speech}, function() {});
    }
});
*/

$(document).on('mouseenter', '.spellingSuggestion, #myPopupWord', function(clickData) {
    //console.log(clickData);
    if (clickData.target.className == "spellingSuggestion") {
        var speech = clickData.target.innerText;
        //console.log(speech);
        //console.log("TESTING: " + voiceSelect);
        if (enableVoice)
            chrome.runtime.sendMessage({toDo: "tts", toSay: speech, option: voiceSelect}, function() {});

        /* bing image search message */
        if (enablePictures) {
            var button = $('#castSuggest-'+speech);
            var imageButton = button[0].childNodes[1];
            //console.log(imageButton);
            imageButton.style.display = "flex";     //.css({display: "flex"});
            button[0].childNodes[0].style.width = "80%";
        }
        //chrome.runtime.sendMessage({toDo: "imageSearch", keyword: speech}, function() {});
    }
    else if (clickData.target.id == "myPopupWord") {
        var speech = clickData.target.parentElement.parentElement.firstChild.firstChild.innerText;
        
        if (enableVoice)
            chrome.runtime.sendMessage({toDo: "tts", toSay: speech, option: voiceSelect}, function() {});

        /* bing image search message */
        //chrome.runtime.sendMessage({toDo: "imageSearch", keyword: speech}, function() {});
    }
});

$(document).on('mouseleave', '.contentButton', function() {
    //console.log(this);
    if (enablePictures) {
        if (this.children[1])
            this.children[1].style.display = "none";
        if (this.children[0])
            this.children[0].style.width = "100%";
    }
});

/*
document.addEventListener('mouseleave', function(clickData) {
    if (clickData.target.className == "spellingSuggestion") {
        var speech = clickData.target.childNodes[0].textContent;

        /* bing image search message 
        var button = $('#castSuggest-'+speech);
        var imageButton = button[0].childNodes[1];
        imageButton.style.display = "none"; 
    }
})
*/

/*records the mouse position whenever a right click is performed */
document.addEventListener('mouseup', function(mousePos) {
    if(mousePos.button == 2) {
        //console.log(document.body.scrollTop);
        mPos = {
            clientX: mousePos.clientX+document.documentElement.scrollLeft, 
            clientY: mousePos.clientY+document.documentElement.scrollTop
        };
    }
});

/* sets currentFocus to the textbox when the focus changes or on keyup*/
$(document).on('focus keyup click', 'input[type=text], [contenteditable="true"], textarea', function() { 
    currentFocus = this;
 });

 /* listener for getting an image from bing */
 chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.todo == "gotImage") {
        if (request.message == "success") {
            var imageURL = request.result;
            var query = request.query;
            //console.log("SUCCESS: IMAGE RETRIEVED FOR " + query);
            
            //console.log(request.result);
            $.extend(imageObj, {
                [query]: imageURL
            }) 
            //console.log("image url: " + imageObj[query]);
            if (imageObj[query]) {
                var button = $('#castSuggest-'+query);
                var imageButton = button[0].childNodes[1];
                //console.log(button);
                imageButton.src = imageURL;
                //imagepic.src = request.result.value[0].thumbnailUrl;


            }
        }
        else {
            console.log("FAILURE: IMAGE COULD NOT BE RETRIEVED");
            console.log(request.xhr.statusText);
            console.log(request.textStatus);
            console.log(request.error);
        }
    }
    else if (request.todo == "printKey") {
        if (request.message == "success") {
            //console.log("Successfully retrieved key.");
            //console.log("RESULT: " + JSON.stringify(request.result));
        }
        else {
            console.log("Failed to retrieve key.");
            console.log(request.xhr.statusText);
            console.log(request.textStatus);
            console.log(request.error);
        }
    }
    else if (request.todo == "toggleVoice") {
        enableVoice = request.value;
    }
    else if (request.todo == "togglePictures") {
        enablePictures = request.value;
    }
    else if (request.todo == "voiceSelect") {
        voiceSelect = request.value;
    } 
    else if (request.todo == "highlightDifference") {
        highlightDifference = request.value;
    }
});


$(document).on('keyup', 'input[type=text], [contenteditable="true"], textarea', function() { 
    var inputText;
    if(this.value) inputText = "" + this.value; 
    if(this.innerText)
    {
        inputText = "" + this.innerText.replace(/[^\x20-\x7E  ]/g, ''); //removes non printable chars
    }
    if(inputText)
    {
        var lastWord = "" + inputText.trim().split(" ").splice(-1);
        lastWord = "" + lastWord.replace(/^[ .,\/#!?$%\^&\*;:{}=\-_`~()]+|[ .,\/#!?$%\^&\*;:{}=\-_`~()]+$/g, "");
        var lastChar = inputText.slice(-1);
        console.log("Last Char = " + lastChar);
        

        if(lastChar.match(/[  .,\/#!?$%\^&\*;:{}=\-_`~()]/))
        {
            chrome.runtime.sendMessage({toDo: "spellCheck" , wordToCheck: lastWord}, function() {});
            console.log("got here");
        }
    }
    
 });
