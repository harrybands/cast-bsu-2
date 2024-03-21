//Activate Button on toolbar
chrome.runtime.sendMessage({todo: "showAction"});
//*** SET UP DICTIONARY  ***/
var dictionary = null;
chrome.runtime.sendMessage({todo: "getDictionary"}, function(response) {
    dictionary = response.dictionary;
    console.log("dictionary information: ", dictionary);
});
//helper function
function dictionary_check(text){
    if(dictionary[text.toUpperCase()]==true) {
        return true;
    }
    else
    {
        return false;
    }
}
//*** Get UUID  ****/
var uuid = null;
chrome.runtime.sendMessage({todo: "getUUID"}, function(response) {
    uuid = response.uuid;
});
/*** GLOBAL VARIABLES ***/
var current_input = null; // Jquery node of the last used input
var current_spelling_errors = []; //List of spelling errors currently on screen
var lastInputTime = 0; // The time of the last input action
var spelling_errors_seen = []; //List of Spelling errors seen this session
var storage = window.localStorage;  //Storage to cache
var audio = new Audio();                 //Audio object for text-to-speech
var cue_phrases = ["okay", "oh!","um", "hmm", "hmm?"]; //TTS cue phrases
var content_phrases = ["did you mean one of these?", "how about these?", "maybe one of these?", "do one of these sound right?"
                    ,"is this what you meant", "try one of these"]; //TTS Content phrases
var last_cue_phrase = -1; // Used to make sure we don't repeat phrases
var last_content_phrase = -1; // Used to make sure we don't repeat phrases
var dialogue_interruption = false; //used to detect if dialogue will be interrupted 
var stop_playing_suggestions = false; //used to signal to stop playing suggestions
var cur_playing_suggestions_id = 0;  //Makes the id of the popup that is curretnly playing suggestions
var ignore_list = [];  //List of words to ignore, chosen by user

//tracks last input box to track
var last_target;
var last_$node;
var last_svg;
var last_mirror;

// Config Variables
let small_window = true;    //config variable to make window smaller
let button_audio = true;    // places clickable button to play audio on suggestions
let button_image = true;  // places clickable button to play image on suggestions
let enableVoice;        // Config variable for Text-To-Speech
let enablePictures;     // Config variable for Pictures 
let enableImages = 1;       // Config variable to use images on suggestions
let auto_play_suggestions = true; // if true, automatically reads the suggestions out loud using TTS
let autoPopup = true;
let highlightDifference = {     // how to highlight the differences between spelling error and suggestions
    'highlightBackground' : true,
    'changeTextColor' : false,
    'underline' : false
}
let voiceSelect = "Joanna";     // TTS voice to use - options are Joanna, Ivy, or Justin
/*** Getting saved user data for config varaibles */
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
chrome.storage.sync.get(['autoPopup'], function(data){
    if(data.autoPopup != null) {
        autoPopup = data.autoPopup;
    }
});
chrome.storage.sync.get(['autoRead'], function(data){
    if(data.autoRead != null) {
        auto_play_suggestions= data.autoRead;
    }
});
// CSS to copy
var css_to_copy = ['border',
            //'margin',
            'padding',
            'font',
            'line-height',
            'text-align',
            'text-shadow',
            'text-indent',
            'letter-spacing',
            'word-break',
            'overflow-wrap',
            'word-spacing',
            'writing-mode',
            //'white-space',
            'vertical-align',
            'clear',
            'box-sizing',
            'width',
            'height'];
// Fix for true offset
const getOffsetTop = element => {
    let offsetTop = 0;
    while(element) {
      offsetTop += element.offsetTop;
      element = element.offsetParent;
    }
    return offsetTop;
}


// Find the HTML element with the attribute jsname="itVqKe"
var googleClear = document.querySelector('[jsname="itVqKe"]');

// Add event listener to the element
if (googleClear) {
    googleClear.addEventListener('click', function() {
        // Perform your action here
        console.log("Element with jsname='itVqKe' clicked");
        // Add your action code here'
        $(".kidspell-mirror").remove();
    });
}

// var script = document.createElement('script');
// script.src = 'https://r.bing.com/rp/lmu8EBCaPRMKtay8LSArGyY3mv4.br.js';
// document.head.appendChild(script);

// Access the div element
var divElement = document.querySelector('div.clear.icon.tooltip.show');

// Check if the element is found
if (divElement) {
    // Manipulate the element here
    divElement.addEventListener('click', function() {
        // Perform action when clicked
        console.log("Div element clicked");
        // Add your action code here
    });
} else {
    console.log("Div element not found");
}


/*** Check for EXISTING inputs */
$( "textarea, input" ).each(function( index ) {
    var $node = $( this );
    if($node.get(0).tagName == 'INPUT' && !['search','text'].includes($node.attr('type')))
        return;
    console.log('detected existing input');
    console.log($node.attr('type'));
    console.log($node);
    create_mirror($node);
});

/*** check for DYNAMICALLY ADDED inputs ***/
// What types of input to spellcheck - must be in all caps
tags_to_check = ['TEXTAREA', 'INPUT'];


// Observer
var observer = new MutationObserver(function( mutations ) {
    mutations.forEach(function( mutation ) {        
    var newNodes = mutation.addedNodes; // DOM NodeList
    if( newNodes !== null ) { // If there are new nodes added
        var $nodes = $( newNodes ); // jQuery set
        $nodes.each(function() {
            var $node = $( this );
            if($node.get(0).tagName == 'TEXTAREA' || ($node.get(0).tagName == 'INPUT' && ($node.attr('type') == 'text' || $node.attr('type') == 'search'))) {
                $node.addEventListener('search', function() {
                    console.log("inside $node :)");
                })
                console.log('FOUND DYNAMIC INPUT');
                create_mirror($node);
            }
        });
    }    
});
// Obvserver config
var config = {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true
};
// Starting Observer
observer.observe(document.body, config);
});

/**
 * Creates a mirror of the given input object
 * 
 * @param {Jquery Element to copy} $node 
 */
function create_mirror($node){
    let offset = {
        left:$node.offset().left,
        top:getOffsetTop($node[0])
    }
    var mirror = $("<div class='kidspell-mirror'/>");
    mirror.text(" ");
    let svg = $('<svg class="kidspell-svg" height="600px" width="600px" style="position:absolute;left:0;">');
    mirror.append(svg);
    svg = svg[0];
    
    //Copy input when they input changes
    $node.on('input',function(){
        current_input=$(this);
        let node_val = $(this).val();
        if (node_val[node_val.length-1] == '\n')
            node_val += '\n';
        mirror[0].childNodes[0].nodeValue = node_val;
        //Also a good time to reposition if needed
        setTimeout(function(){ 
            offset = {
                left:$node.offset().left,
                top:getOffsetTop($node[0])
            }
            mirror.css({'top': offset.top,'left': offset.left});
        }, 250);
        
        //copy css from the element
        $.each(css_to_copy, function(i,v){
            mirror.css(v, $node.css(v));
        });
        
    });
    
    //Copy scroll position
    $node.scroll(function(e) {
        console.log('current scroll left', $node.scrollLeft());
        mirror.scrollTop($node.scrollTop());
        mirror.scrollLeft($node.scrollLeft());
    });
    //copy css from the element
    $.each(css_to_copy, function(i,v){
        mirror.css(v, $node.css(v));
    });
    // css for hiding the mirror
    mirror.css({
        'position': 'absolute', 
        'white-space': 'pre',
        'top': offset.top,
        'left': offset.left, 
        'background': 'transparent', 
        'border-color': 'transparent',
        'pointer-events': 'none',
        //'overflow': 'hidden',
        'color': 'limegreen',
        'z-index': '2147483648', 
        //'visibility': 'hidden',
    });
    // Input's automatically vertically center text - we try to recreate that
    if($node.get(0).tagName == 'INPUT'){
        console.log('kidspell adjusting for input');
        mirror.css('line-height', $node.css('height'));
        mirror.css('padding-top', '0px');
        mirror.css('overflow-x', 'scroll');
    }
    
    //append
    $(document.body).append(mirror);
    
    // Create an observer to detect when changes happen to our div
    let target = mirror[0].childNodes[0];
    let mirror_observer = new MutationObserver(function(mutations) {
        let target_element = mutations[0].target;
        //check in .75 seconds if string needs to be parsed
        lastInputTime = new Date().getTime() / 1000;
        setTimeout(function() {
                DelayedSpellCheck(target_element, $node, svg, mirror);
        }, 750);
        parseElement(target_element, false, $node, svg, mirror);
    });
    let config = {
        attributes: true, 
        attributeOldValue: true, 
        childList: true, 
        characterData: true, 
        subtree: true};
    mirror_observer.observe(target,config);
}
function DelayedSpellCheck(target_element, $node, svg, mirror){
    var curTime = new Date().getTime() / 1000;
    var timeSinceLastInput = curTime - lastInputTime;
    if(timeSinceLastInput >= 0.75)
    {
        let misspells = parseElement(target_element, true, $node, svg, mirror);
        let log_info = {misspelled_words: misspells};
        if (typeof callDBA === 'function')
            callDBA('insertEvent',[16, "input-parsed", log_info, qid]);
    }
}
//Parses text for spelling errors and marks them
function parseElement(target, check_spelling, $node, svg, mirror) {
    last_target = target;
    last_$node = $node;
    last_svg = svg;
    last_mirror = mirror;
    console.log('starting parse - checking spelling:', check_spelling);
    let offset = {
        left:$node.offset().left,
        top:getOffsetTop($node[0])
    }
    let range = document.createRange();
    let words = target.textContent.split(/(<[^>]*>|&#[0-9]+;|&[a-z]+;|[  \s.,\/#!\"$%\^&\*;:{?}=\-_`~()<>])/g).filter(item => item !== '');
    let start = 0;
    let end = 0;
    let spelling_errors = [];
    // Clear spelling errors recorded for this mirror
    for (let i = current_spelling_errors.length -1; i>=0; i--){
        if(current_spelling_errors[i].mirror[0] === mirror[0])
            current_spelling_errors.splice(i,1);
    }
    //clear svg
    $(svg).empty();
    // loop through each word
    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        end = start + word.length;
        if (!/[^A-Za-z\']/gi.test(word) && 
        ((check_spelling && !dictionary_check(word)) || 
        (!check_spelling && spelling_errors_seen.includes(word)))){
            spelling_errors.push(word);
            range.setStart(target, start);
            range.setEnd(target, end);
            // not getBoundingClientRect as word could wrap
            let rects = range.getClientRects()[0];
            console.log(range.getClientRects());

            // creating circle
            let circle = document.createElementNS("http://www.w3.org/2000/svg",'ellipse');
            circle.setAttribute('stroke-width', 3.0);
            circle.setAttribute('stroke', 'rgba(255, 0, 0, 0.6)');
            circle.setAttribute('rx', rects.width/2.0 + 2);
            circle.setAttribute('ry', ry = rects.height/2.0 + 2);
            console.log(rects.x, rects.y);
            circle.setAttribute('cx', rects.x - offset.left + rects.width/2.0 + $(target.parentElement).scrollLeft());
            circle.setAttribute('cy', rects.y - offset.top + rects.height/2.0 + $(target.parentElement).scrollTop());
            circle.setAttribute('fill-opacity',0);
            circle.setAttribute('data-word', word);
            circle.setAttribute('data-index', spelling_errors.length-1);
            circle.classList.add('kidspell-error');
            //Save data essential to the spelling error and its location
            let word_data = {
                'word': word,
                'rects': rects,
                'index': spelling_errors.length - 1, 
                'mirror': mirror,
                'scrollX': $(target.parentElement).scrollLeft(), 
                'scrollY':$(target.parentElement).scrollTop()
            };

            if (autoPopup && !spelling_errors_seen.includes(word)) {
                handleSpellingError(word_data);
            }
            svg.appendChild(circle);
            spelling_errors_seen.push(word);
            current_spelling_errors.push(word_data);
            console.log(rects);
        }
        start = end;
    }
    //spelling_errors_seen = spelling_errors;
    return spelling_errors;
}
// Function to determine if we are hovering over a word
$(document).on('mousemove', function(data) {
    let mouseX = data.originalEvent.clientX;
    let mouseY = data.originalEvent.clientY;
    //console.log(current_spelling_errors);
    for(let i = 0; i < current_spelling_errors.length; i++){
        let rects = current_spelling_errors[i].rects;
        rectsx = rects.x - (current_spelling_errors[i].mirror.scrollLeft() - current_spelling_errors[i].scrollX)
        rectsy = rects.y - (current_spelling_errors[i].mirror.scrollTop() - current_spelling_errors[i].scrollY)
        if (mouseX >= rectsx && mouseX <= rectsx +rects.width && mouseY >= rectsy && mouseY <= rectsy+rects.height){
            console.log('HOVERING', current_spelling_errors[i].word);
            handleSpellingError(current_spelling_errors[i]);
        }
    }
});
// Once a spelling error has been created or hovered over, we send it to this function
// This function retrieves suggestions and creates a popup
function handleSpellingError(word_data){
    let word = word_data.word.replace(/\d/g, "");
    if (word.length > 29) //refrain from sending long text to the server
        return;
    selectedWordData = {
        word: word, 
        index: word_data.index
    };
    //Make request to server and handle the resulting suggestions
    spellcheckListener({toDo: "spellCheck", keyword: word}).then(res => {
        array_of_suggestions = res.suggestions;
        var request = {
            selectedWord: word,
            arrayOfSuggestions: array_of_suggestions,
            rects: word_data.rects,
            index: word_data.index,
            scrollX: word_data.scrollX,
            scrollY: word_data.scrollY
        };
        //If possible - save event for a popup otherwise we just make a popup window
        if (typeof callDBA === 'function')
        {
            Promise.all(
                [callDBA('insertEvent',
                        [8, 
                        "popup", 
                        {misspell: word, 
                        suggestions: array_of_suggestions, 
                        index: wordIndex}, 
                        qid])]
            ).then(results => {
                request['eid'] = results[0];
                createWindowListener(
                    request
                );
            });
        } else {
            request['eid'] = -1;
            createWindowListener(
            request
            );
        }
    });        
}
/* 
    Spell Check Listener - makes request for suggestions to php server
    Note that we use async await here, instead of callback functions.
    We decided that async handling for suggestions would be best in order to avoid errors.
*/
function spellcheckListener(request) {
    let result;
     try {
        result = $.ajax({
            dataType: "json",
            type: "GET",
            url: "https://cast.boisestate.edu/nodeAPI/nodeSpellcheck.php",
            data: {
                "splchk": true,
                "word" : request.keyword
            }
        });
    } catch (error) {
        result = error;
    }
    return result;
};
/* createWindowListner: Listener to put popup on screen and then position */
function createWindowListener(request) {
    console.log('in createwindowlistener');

    //creates window
    let popup = createPopup(request.selectedWord, request.arrayOfSuggestions, request.eid, request.index);
    if(popup==null) {
        return
    };
    let rects = request.rects;

    //rectsx = rects.x - ($('.kidspell-mirror').scrollLeft() - current_spelling_errors[i].scrollX)
    //rectsy = rects.y - ($('.kidspell-mirror').scrollTop() - current_spelling_errors[i].scrollY)
    
    //repositions window
    var windowWidth = $(window).width();
    var bodyRect = document.body.getBoundingClientRect()
        topOffset = rects.y - ($('.kidspell-mirror').scrollTop() - request.scrollY) - bodyRect.top + rects.height + 5,
        leftOffset = rects.x - ($('.kidspell-mirror').scrollLeft() - request.scrollX) - bodyRect.left;
    console.log(topOffset, leftOffset);
    //prevents window from going offscren to the right
    if(small_window && leftOffset + 140 > windowWidth)
        leftOffset = windowWidth - 145;
    if (!small_window && leftOffset + 240 > windowWidth)
        leftOffset = windowWidth - 245;
    $('#popup-'+request.index).css({left:leftOffset});
    $('#popup-'+request.index).css({top:topOffset});

    // automatically read the suggestions
    if(auto_play_suggestions) {
        const AUTO_PLAY_RATE = 2500;
        let suggestions = $('#popup-'+request.index).find('.spellingSuggestion');
        if(suggestions.length > 0  && enableVoice) {
          ttsListener({toDo: "tts", toSay: generate_phrase(), option: voiceSelect});
            cur_playing_suggestions_id++;
            stop_playing_suggestions = false;
           setTimeout(play_suggestions, AUTO_PLAY_RATE, suggestions, 0, cur_playing_suggestions_id);
        }
        if(suggestions.length > 0 && !enableVoice) {
            cur_playing_suggestions_id++;
            stop_playing_suggestions = false;
           setTimeout(play_suggestions, AUTO_PLAY_RATE, suggestions, 0, cur_playing_suggestions_id);
        }
    }
};
/** function to auto-play sounds and images consecutivtely of a suggestion list */
function play_suggestions(suggestions, position, id) {
    if(position > 0) {
        $(suggestions[position-1]).parent().removeClass('button-glow');
        $(suggestions[position-1]).parent().removeClass('suggestionButtonAuto');
        if (enableImages === 1  && enablePictures && button_image) {
            $(suggestions[position-1]).parent().next().removeClass('button-glow');
            $(suggestions[position-1]).parent().removeClass('suggestionButtonAuto');
            $('.imgWindow').hide();
        }
    }
    if(stop_playing_suggestions){
        $(suggestions[position]).parent().removeClass('button-glow');
        $(suggestions[position]).parent().removeClass('suggestionButtonAuto');
        if (enableImages === 1 && enablePictures && button_image) {
            $(suggestions[position]).parent().next().removeClass('button-glow');
           // $(suggestions[position]).parent().next().removeClass('suggestionButtonAuto');
            $('.imgWindow').hide();
        }
        stop_playing_suggestions = false;
        //$('html,body').animate({scrollTop: $('.kidspell').offset().top});
        return;
    }
    if(id != cur_playing_suggestions_id) {
        return;
    }
    if(position < suggestions.length && enableVoice) {
        //$('html,body').animate({scrollTop: $(suggestions[position]).parent().offset().top - window.innerHeight*.60});
        $(suggestions[position]).parent().addClass('button-glow');
        $(suggestions[position]).parent().addClass('suggestionButtonAuto');
        ttsListener({toDo: "tts", toSay: $(suggestions[position]).text(), option: voiceSelect});
        if (enableImages === 1 && enablePictures && button_image) {
            $(suggestions[position]).parent().next().addClass('button-glow');
        //    $(suggestions[position]).parent().next().addClass('suggestionButtonAuto');
            $(suggestions[position]).parent().next().show();
        }
    }
    if (position < suggestions.length && !enableVoice){
            //$('html,body').animate({scrollTop: $(suggestions[position]).parent().offset().top - window.innerHeight*.60});
            $(suggestions[position]).parent().addClass('button-glow');
            $(suggestions[position]).parent().addClass('suggestionButtonAuto');
             if (enableImages === 1 && enablePictures && button_image) {
                $(suggestions[position]).parent().next().addClass('button-glow');
                $(suggestions[position]).parent().next().addClass('suggestionButtonAuto');
                $(suggestions[position]).parent().next().show();
            }
    }
     else 
    {
        dialogue_interruption = false;
    }

    position++;
    if(position <= suggestions.length)
        setTimeout(play_suggestions, 1500, suggestions, position, id);
}
/* Replaces the value in the text box with the corrected spelling */
$(document).on('click', '.spellingSuggestion', function(data) {
    stop_playing_suggestions = true;

    //if the click was on the inner speaker button, don't do anything
    if (data.target.classList.contains('suggestion-speaker-button'))    {
        return;
    }
        if (data.target.classList.contains('suggestion-image-button'))  {
        return;
    }   

    //Change value of input
    let error = this.parentNode.parentNode.parentNode.childNodes[0].innerText;
    let node_val = current_input.val();
    let words = node_val.split(/(<[^>]*>|&#[0-9]+;|&[a-z]+;|[  \s.,\/#!\"$%\^&\*;:{?}=\-_`~()<>])/g).filter(item => item !== '');
    let new_val = '';
    for(let i = 0; i < words.length; i++) {
        let word = words[i];
        if (word == error) {
            new_val += this.innerText;
        }   else {
            new_val += word; 
        }
    }
    current_input.val(new_val);
    last_mirror[0].childNodes[0].nodeValue = new_val;
    //Report spelling suggestion clicked
    let options = [];
    $(this).parent().parent().parent().find('.spellingSuggestion').each(function() {
        options.push($(this).text());
    });
    $.ajax({
        dataType: "json",
        type: "POST",
        url: "https://cast.boisestate.edu/extension/storeCorrectedWord.php",
        data: {
            "clicked": $(this).text(),
            "position": $(this).attr('id'),
            "error": error,
            "options":options.toString(),
            "uuid":uuid
        },
        success: function(result) {
            console.log(result)
        },
        error: function(xhr, textStatus, error) {
            console.log("KidSpell encountered an error!");
            console.log(xhr.statusText);
            console.log(textStatus);
            console.log(JSON.stringify(error));
        }
    });
    //Find spelling errors
    let misspells = parseElement(last_target, true, last_$node, last_svg, last_mirror);
    let log_info = {misspelled_words: misspells};
    if (typeof callDBA === 'function'){
        callDBA('insertEvent',[16, "input-parsed", log_info, qid]);
    }

    //remove popup
    let wordIndex = this.getAttribute('index');
    let popup = document.getElementById("popup-"+wordIndex);
    if(popup) {
        document.body.removeChild(popup);
    //turn off interruption phrases
        stop_playing_suggestions = true;
        dialogue_interruption = false;
    }
});
/* Event for clicking on the misspelled word in the popup*/
$(document).on('click', '#myPopupWord, #closeButton', function(data){
    // $("<div class='kidspell-mirror'/>").css({'color': 'yellow'});
    // console.log("css property: " + $("<div class='kidspell-mirror'/>").css);
    
    //turn off interruption phrases
    dialogue_interruption = false;
    stop_playing_suggestions = true;
    
    if (data.target.classList.contains('suggestion-speaker-button'))
        return;
    if (data.target.classList.contains('suggestion-image-button'))
        return;
    //add to list of "correctly" spelled words
    ignore_list.push(this.getAttribute('spelling'));
    //sets caret in input
    //setCurrentCursorPosition(currentFocus.innerText.length);
    //remove popup
    let wordIndex = this.getAttribute('index');
    var popupId = document.getElementById("popup-"+wordIndex);
    if(data.target.id == popupId) {
        document.body.removeChild(popupId);
    }
});
/**
 * Generates phrases to be spoken when a word is mispelled
 */
function generate_phrase(){
    let to_say = ""
    //if dialogue is interrupted, we insert a cue phrase
    if (dialogue_interruption){
        let selected_phrase = Math.floor(Math.random() * cue_phrases.length);
        while (selected_phrase == last_cue_phrase)
            selected_phrase = Math.floor(Math.random() * cue_phrases.length);
        last_cue_phrase = selected_phrase;
        to_say += cue_phrases[selected_phrase] +", ";
    }
    //primary content phrase
    let selected_phrase = Math.floor(Math.random() * content_phrases.length);
    while (selected_phrase == last_content_phrase)
        selected_phrase = Math.floor(Math.random() * content_phrases.length);
    last_content_phrase = selected_phrase;
    to_say += content_phrases[selected_phrase];
    // Set interruption to true, if dialogue is interupted, we use a cue_phrase
    dialogue_interruption = true;
    return to_say;
}

/* createPopup: Constructs the spellchecker popup */
function createPopup(selectedWord, arrayOfSuggestions, eid, wordIndex) {
    // Destroy existing spellchecker if necessary
    if($('#popup-'+wordIndex).length) {
        var popup = document.getElementById("popup-"+wordIndex);
        if(popup.getAttribute('word') != word) document.body.removeChild(popup);
        else return null;
    }
    // Create popup div window
    var popupWindow = document.createElement('div');
    popupWindow.id = "popup-"+wordIndex;
    popupWindow.classList.add("kidspell-popup");
    if(small_window)  {
        popupWindow.classList.add('popup-small');
    }
        popupWindow.setAttribute('word', word);
    // Create wrappers for all content in popup
    var wrapper = document.createElement('div');
    wrapper.classList.add("contentWrapper");
    var leftwrapper = document.createElement('div');
    leftwrapper.classList.add("leftWrapper");
    leftwrapper.style = "width: 100%;";
    // Create and append mispelled word button
    var word = document.createElement('div');
    word.id = "myPopupWord";
    word.classList.add("contentButton");
    if (selectedWord.length >= 10){
    word.classList.add("smallText");
    }
    const spellingTextContainer = document.createElement('span');
    spellingTextContainer.innerText  = selectedWord;
    spellingTextContainer.classList.add('spelling-text-container');

    
    var wordNode = spellingTextContainer;
    word.setAttribute('index',wordIndex);
    word.setAttribute('spelling', selectedWord);
    if(button_audio && enableVoice) {
        $(word).append('<i class="fas fa-volume-up suggestion-speaker-button"></i>');
    }
        if(button_image && enableImages === 1 && enablePictures) {
        $(word).append('<i class="fas fa-image suggestion-image-button"></i>');
    }
    word.appendChild(wordNode);
    let misButton = document.createElement('div');
    misButton.id = "misButton";
    misButton.appendChild(word);
    // If there are no suggestions, display message
    if (arrayOfSuggestions.length == 0) {
        let contentButton = document.createElement('div');
        contentButton.classList.add("contentButton");
        contentButton.appendChild(misButton);
        leftwrapper.appendChild(contentButton);
        contentButton = document.createElement('div');
        contentButton.classList.add("contentButton");
        contentButton.innerText = "No suggestions found";
        leftwrapper.appendChild(contentButton);
        wrapper.appendChild(leftwrapper);
        popupWindow.appendChild(leftwrapper);

        //close button
        let closeButton = document.createElement('div');
        closeButton.id = "closeButton";
        let wordNode = document.createTextNode("Close");
        closeButton.setAttribute('index',wordIndex);
        closeButton.setAttribute('spelling', selectedWord);
        closeButton.id = "closeButton";
                
        $(closeButton).append('<i class="fas fa-times kidspell-close-button"</i>');
        closeButton.appendChild(wordNode);
        leftwrapper.appendChild(closeButton);

        $(closeButton).click(function(){
                document.body.removeChild(popupWindow);
            //turn off interruption phrases
                stop_playing_suggestions = true;
                dialogue_interruption = false;
        });
    }
    // Otherwise, create and apppend each suggestion as a button
    else {
        // Instantiate difference finder
        var dmp = new diff_match_patch();
        // Append stuff to the first content button, and append it to the popup
        let contentButton = document.createElement('div');
        contentButton.classList.add("contentButton");
        contentButton.appendChild(misButton);
        leftwrapper.appendChild(contentButton);
        arrayOfSuggestions.forEach(function(item, i) {
            // Container for the two buttons
            var contentButton = document.createElement('div');
            contentButton.classList.add("contentButton");
            contentButton.classList.add("castSuggest-" + item);
    
            // First sub-button: the suggested word
            var suggestButton = document.createElement('div');
            suggestButton.classList.add("suggestButton");
            if (item.length >= 10){
                suggestButton.classList.add("smallText");
            }
            var div = document.createElement('div');
            div.classList = "spellingSuggestion";
            //div.id = i;
            div.setAttribute('index',i);
    
            // Find difference and put in span 
            var diff = dmp.diff_main(selectedWord, item);
            dmp.diff_cleanupSemantic(diff);
            const spelledWord = parseArray(diff);
            
            var spanNode = document.createElement('span');
            spanNode.classList.add('spelling-text-container');
            var textNode = document.createTextNode(spelledWord);
            spanNode.appendChild(textNode);
            div.appendChild(spanNode);
            
            diff.forEach(function(substr) {
          
                if (substr[0] == 0) {
                    // var textNode = document.createTextNode(substr[1]);
                    // spanNode.appendChild(textNode);
                } else if (substr[0] == 1) {
                    // spanNode.appendChild(document.createTextNode(substr[1]));
                    // //spanNode.classList.add('CAST_correctDiff');
                    // div.appendChild(spanNode);
                    // if(highlightDifference['changeTextColor'])
                    //     spanNode.classList.add('CAST_colorText');
                    // if(highlightDifference['highlightBackground'])
                    //     spanNode.classList.add('CAST_highlightBackground');
                    // if(highlightDifference['underline'])
                    //     spanNode.classList.add('CAST_underline');
                }
            });
            if(button_audio && enableVoice) {
                $(div).append('<i class="fas fa-volume-up suggestion-speaker-button"></i>');
            }
        // image button
            if(button_image && enablePictures && enableImages === 1) {
                $(div).append('<i class="fas fa-image suggestion-image-button"></i>');
            }
            let imgWindow = document.createElement("div");
            imgWindow.classList.add("imgWindow");
            let imagepic = document.createElement('img');
            imagepic.classList.add("imgExpand");
            imgWindow.appendChild(imagepic);
            //}
            // Append buttons to button container and finally to popup
            suggestButton.appendChild(div);
            contentButton.appendChild(suggestButton);
            contentButton.appendChild(imgWindow);
            leftwrapper.appendChild(contentButton);
            wrapper.appendChild(leftwrapper);
            popupWindow.appendChild(wrapper);
        });
        //close button
        let closeButton = document.createElement('div');
        closeButton.id = "closeButton";
        let wordNode = document.createTextNode("Close");
        closeButton.setAttribute('index',wordIndex);
        closeButton.setAttribute('spelling', selectedWord);
        
        $(closeButton).append('<i class="fas fa-times kidspell-close-button"</i>');
        closeButton.appendChild(wordNode);
        
        misButton = document.createElement('div');
        misButton.id = "misButton";
        misButton.appendChild(closeButton);
        contentButton = document.createElement('div');
        contentButton.classList.add("contentButton");
        contentButton.appendChild(misButton);
        leftwrapper.appendChild(contentButton);
    }
    // Display popup by appending to body
    document.body.appendChild(popupWindow);
    //Find images for suggestions
    arrayOfSuggestions.forEach(function(item, i) {
        if (enableImages === 1 && enablePictures && button_image) {
            let cached = storage.getItem("spelling-"+item)
            if (cached == null) {
                console.log("No cache, searching for image");
                imageSearchListener({keyword: item, eid: eid, newCache: true});
            } else {
                console.log("Found in cache, using cached image");
                console.log("cached url", cached);
                gotImageListener({message: "success", query: item, result: cached, eid: eid, cacheImage: true});
            }
        }
    });
    return popupWindow;
}
/* Text To Speech Listener */
function ttsListener(request) {
    if (request.option === "Justin" || request.option === "Ivy" || request.option === "Joanna") {
        try {
            const result = $.ajax({
                dataType: "json",
                type: "GET",
                url: "https://cast.boisestate.edu/extension/tts.php",
                data: {
                    "speech": request.toSay,
                    "voice": request.option
                }
            });
            if (audio) {
                audio.pause();
            }
            audio = new Audio();
            result.done(audioSrc=>{
                audio.src = audioSrc;
                audio.load();
                audio.play();
                console.log("Playing audio");
            })
        } catch (error) {
            console.log("An error was encountered trying to speak!");
            console.log(error.statusText);
            console.log(error.textStatus);
            console.log(JSON.stringify(error.error));
        }
    }
};
/* Image Search Listener - makes request for images to php server */
function imageSearchListener(request) {
    $(function() {
        (function() {
            try {
                const result = $.ajax({
                    dataType: "json",
                    type: "GET",
                    url: "https://cast.boisestate.edu/googleAPI/googleImages.php",
                    data: {
                        "keyword": request.keyword
                    }
                });
                gotImageListener({
                    message: "success",
                    query: request.keyword,
                    result: result,
                    eid: request.eid,
                    newCache: request.newCache
                });
            } catch (error) {
                gotImageListener({
                    todo: "gotImage",
                    message: "error",
                    error: error,
                    newCache: request.newCache
                });
            }
        })();
    });
};
/* Once we got images from the server, this function puts them in their respective divs */
function gotImageListener(request){
    if ( request.message == "success") {
        const eid = request.eid;
        var imageURL = "";
        if (request.cacheImage)
            imageURL = request.result;
        else{
            request.result.done(photo=>{    
                imageURL = photo.items[0].image.thumbnailLink; //.link
                const query = request.query;
                storage.setItem("spelling"-query,imageURL);
                $('.castSuggest-'+query).each(function() {
                    console.log("attaching image");
                    console.log("this:", $(this));
                    $($(this).children()[1]).children()[0].src=imageURL;
                });
        
                if (typeof callDBA === 'function'){
                    callDBA("insertSuggestionUrl", [eid, query, imageURL]);
                }
            })
        }
    //     const query = request.query;
    //     storage.setItem("spelling"-query,imageURL);
    //     $('.castSuggest-'+query).each(function() {
    //         console.log("attaching image");
    //         console.log("this:", $(this));
    //         $($(this).children()[1]).children()[0].src=imageURL;
    //     });
    //     if (typeof callDBA === 'function'){
    //         callDBA("insertSuggestionUrl", [eid, query, imageURL]);
    //     }
     }
    else {
        console.log("FAILURE: IMAGE COULD NOT BE RETRIEVED");
        console.log(request.xhr.statusText);
        console.log(request.textStatus);
        console.log(request.error);
    }
};

// Handles closing the popup window after being clicked on - remedies
// the issue of the popup window not closing when clicking on the text 
$(document).on('click', '.spelling-text-container', function(clickData){
    console.log('spelling text container clicked');
    $('.contentWrapper').remove();
    //turn off interruption phrases
    dialogue_interruption = false;
    
});
$(document).on('click', '#closeButton', function(clickData){
    $('.contentWrapper').remove();
    //turn off interruption phrases
    dialogue_interruption = false;
    stop_playing_suggestions = true; 
    $("<div class='kidspell-mirror'/>").css({color: 'yellow'});
    // svg = document.getElementsByClassName('kidspell-svg');
    // console.log(svg);
    // $(svg).empty();    
});

// Handles clicks on the suggestion image button - to display the images
$(document).on('click', '.suggestion-image-button', function(clickData){
    console.log('image button clicked');

    let imgWindow = document.createElement("div");
    imgWindow.classList.add("imgWindow");
    let imagepic = document.createElement('img');
    imagepic.classList.add("imgExpand");
    imgWindow.appendChild(imagepic);

    $(this).parent().parent().next().show();
    $(this).parent().parent().next().addClass('button-glow');

let that = $(this);
    setTimeout(function(that){
        that.parent().parent().next().removeClass('button-glow');
        that.parent().parent().next().hide();
    },1500, that);
});

// Handles clicks on the suggestion speaker button - to read words aloud
$(document).on('click', '.suggestion-speaker-button', function(clickData){
    //TO-DO: record event
    console.log('entering click');
    var speech = $(this).parent().text()
    ttsListener({toDo: "tts", toSay: speech, option: voiceSelect});
    $(this).parent().parent().addClass('button-glow');

    let that = $(this);
    setTimeout(function(that){
        that.parent().parent().removeClass('button-glow');
        that.parent().parent().next().hide();
    },1500, that);
});

/*** Check for EXISTING inputs */

const parseArray =(arr)=>{
return  arr.filter(subStr => subStr[0]>=0).map(subStr=>subStr[1]).join("")
 
}