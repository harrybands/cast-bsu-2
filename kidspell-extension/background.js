
let uuid;
chrome.storage.sync.get(['uuid'], function(data){
    console.log("testing");
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
//generates unique user id
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    /*displays icon*/
    if (request.todo == "showPageAction") {
        chrome.tabs.query({active:true, currentWindow:true}, function(tabs){
            chrome.action.sync(tabs[0].id);
        });
    }

    else if (request.todo == "getDictionary") {
        sendResponse({dictionary: dictionary});
    }

    else if (request.todo == "getSuggestions") {
        $.ajax({
            dataType: "json",
            type: "GET",
            url: "https://cast.boisestate.edu/nodeAPI/nodeSpellcheck.php",
            data: {
                "splchk": true,
                "word" : request.word
            },
            success: function(result) {
                console.log(result)
            }
        });
    }

    else if (request.todo == "getUUID") {
        sendResponse({uuid:uuid});
    }
});
