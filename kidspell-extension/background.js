self.addEventListener('install', (ev) => {
    console.log('installed');
})

self.addEventListener('activate', (ev) => {
    console.log('activated');
})

self.addEventListener('fetch', (ev) => {
    console.log('intercepted a http request', ev.request);
}
)

self.addEventListener('message', (ev) => {  
    console.log('message');
})

// const exampleSocket = new WebSocket(
//     "wss://www.example.com/socketserver",
//     "protocolOne",
//   );

// exampleSocket.send("Here's some text that the server is urgently awaiting!");

let uuid;
//Read Dictionary

// let dictionary = {}; 
// fetch('dictionary.txt')
// .then(response => response.text())
// .then(text => { dictionary = new Set(text.split(/\r?\n/))});

let dictionary = {};
  fetch('dictionary.txt')
  .then(response => response.text())
  .then(text => set_up_dictionary(text))



// Dictionary helper function 

async function set_up_dictionary(text){
    console.log(dictionary);
    text.split(/\r?\n/).forEach(element => dictionary[element] = true);
    let queryOptions = {active: true, currentWindow: true };
    const [tab] = await chrome.tabs.query(queryOptions);
    const response = await chrome.tabs.sendMessage(tab.id, 
        {todo: "set_dictionary", 
        dictionary: dictionary});
    return response;
}

/**function(tabs){
    chrome.tabs.sendMessage(
        tabs[0].id, 
        {
            todo: "set_dictionary", 
            dictionary: dictionary
        }
    );
}
**/

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

chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
    if (request.todo === 'showAction') {
      chrome.action.enable(sender.tab.id);
    } else if (request.todo === 'hideAction') {
      chrome.action.disable(sender.tab.id);
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
