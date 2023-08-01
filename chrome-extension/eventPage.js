var uuid;
chrome.storage.sync.get(['uuid'], function(data){
    if(data.uuid) {
        console.log("Using already created UUID: " + data.uuid);
        uuid = data.uuid;
    } else {
        uuid = uuidv4();
        chrome.storage.sync.set({'uuid': uuid}, function(){
            console.log("UUID Created: " + uuid);
        });
    }
});

/*displays icon*/
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if (request.todo == "showPageAction") {
        chrome.tabs.query({active:true, currentWindow:true}, function(tabs){
            chrome.pageAction.show(tabs[0].id);
        });
    }
});


/*load dictionary*/
var dictionary = new Typo("en_US",undefined,undefined,{asyncLoad:true});

/*display context menu item*/
var menuItem = {
    "id": "spellCheck",
    "title": "CAST Spell Checker",
    "contexts": ["selection"]
};
chrome.contextMenus.create(menuItem);


/*listener for context menu*/
chrome.contextMenus.onClicked.addListener(function(clickData){
    if(clickData.menuItemId == "spellCheck" && clickData.selectionText){

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            var array_of_suggestions = dictionary.suggest(clickData.selectionText);
            //console.log(array_of_suggestions);
            chrome.tabs.sendMessage(
                tabs[0].id, 
                {
                    todo: "createWindow", 
                    selectedWord: clickData.selectionText, 
                    arrayOfSuggestions: array_of_suggestions,
                    editable: clickData.editable
                }
            );
        });
    }
});

//generates unique user id
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

chrome.runtime.onMessage.addListener(function(request) {
    if(request.toDo == "tts")
    {
        if (request.option == "Microsoft") {
            chrome.tts.stop();
            chrome.tts.speak("" + request.toSay, 
            {
                'rate': 0.8, 
                pitch: 2.0, 
                voiceName: "Microsoft Zira Desktop - English (United States)",
            });
        }
        else if (request.option == "Justin" || request.option == "Ivy") {
            $.ajax({
                dataType: "json",
                type: "GET",
                url: "http://cast.boisestate.edu/extension/tts.php",
                data: {
                    "speech": request.toSay,
                    "voice": request.option 
                },
                success: function(result) {
                    console.log("Playing audio: " + result);
                    var audio = new Audio();
                    audio.src = result;
                    audio.load();
                    audio.play();
                },
                error: function(xhr, textStatus, error) {
                    console.log("An error was encountered trying to speak!");
                    console.log(xhr.statusText);
                    console.log(textStatus);
                    console.log(JSON.stringify(error));
                }
            });
        }
    }
});
// Handle TTS messages
chrome.runtime.onMessage.addListener(function(request) {
    if (request.toDo ==  "storeData")
    {
        //AJAX request
        $.ajax({
            dataType: "json",
            type: "POST",
            url: "http://cast.boisestate.edu/extension/storeCorrectedWord.php",
            data: {
                "misspelled" : request.misspelled,
                "correct" : request.correct,
                "uuid" : uuid
            },
            success: function(result){
                console.log("ajax success: " + result.message);
            },
            error: function(xhr, textStatus, error){
                console.log(xhr.statusText);
                console.log(textStatus);
                console.log(error);
            }
        });
    } 
});

chrome.runtime.onMessage.addListener(function(request) {
    if (request.toDo == "spellCheck"){
        var array_of_suggestions = dictionary.suggest(request.wordToCheck);
        //console.log(array_of_suggestions);
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
            chrome.tabs.sendMessage(
                tabs[0].id, 
                {
                    todo: "createOnTypeWindow", 
                    selectedWord: request.wordToCheck, 
                    arrayOfSuggestions: array_of_suggestions,
                    editable: true
                }
            );
        }); 
    }
});

chrome.runtime.onMessage.addListener(function(request) {
    if (request.toDo == "imageSearch") {
        var total;
        var results = '';

        $(function() {
            $.ajax({
                dataType: "json",
                type: "GET",
                url: "http://cast.boisestate.edu/extension/getKey.php",
                data: {
                    "keyword" : request.keyword
                },
                success: function(result) {
                    key = result;
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        chrome.tabs.sendMessage(
                            tabs[0].id, 
                            {
                                todo: "gotImage",
                                message: "success",
                                query: result.queryContext.originalQuery,
                                result: result.value[0].thumbnailUrl
                            }
                        );
                    });
                },
                error: function(xhr, textStatus, error) {
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        chrome.tabs.sendMessage(
                            tabs[0].id, 
                            {
                                todo: "gotImage",
                                message: "error",
                                xhr: xhr,
                                textStatus: textStatus,
                                error: error
                            }
                        );
                    });
                }
            });
        });
    } 
});

