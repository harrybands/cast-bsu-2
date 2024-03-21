self.addEventListener('install', (ev) => {
    console.log('installed');
})

self.addEventListener('activate', (ev) => {
    console.log('activated');
})

self.addEventListener('fetch', (ev) => {
    console.log('intercepted a http request', ev.request);
})

self.addEventListener('message', (ev) => {  
    console.log('message');
})

let uuid;
//Read Dictionary

let dictionary = {};
  fetch('dictionary.txt')
  .then(response => response.text())
  .then(text => set_up_dictionary(text))


// reload when update toggles
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('(background.js) message received: ' + request.message);
    if (request.message === "reload") {
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.reload(tabs.id);
            });
            console.log("All tabs reloaded");
        });
    }
});

// Dictionary helper function 
function set_up_dictionary(text){
    text.split(/\r?\n/).forEach(element => dictionary[element] = true);
    console.log(dictionary);
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {todo: "set_dictionary", dictionary: dictionary});
        });
    }); 
}

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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.todo === 'showAction') {
      chrome.action.enable(sender.tab.id);
    } else if (request.todo === 'hideAction') {
      chrome.action.disable(sender.tab.id);
    } else if (request.todo == "getDictionary") {
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
    } else if (request.todo == "getUUID") {
        sendResponse({uuid:uuid});
    }
});