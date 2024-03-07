// close the popup window if click on the close button
ocument.addEventListener('DOMContentLoaded', function() {
    var refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
      refreshButton.addEventListener('click', function() {
        chrome.tabs.query({currentWindow: true}, function(tabs) {
          tabs.forEach(function(tab) {
            chrome.scripting.executeScript({
              target: {tabId: tab.id},
              function: () => { location.reload(); }
            });
          });
        });
      });
    }
  });

let enableVoice;
chrome.storage.sync.get(['enableVoice'], function (data) {
    if (data.enableVoice != null) {
        console.log("Current value for enableVoice: " + data.enableVoice);
        enableVoice = data.enableVoice;
    } else {
        enableVoice = true;
        chrome.storage.sync.set({ 'enableVoice': enableVoice }, function () {
            console.log("New enableVoice set: " + enableVoice);
        });
    }
    $("#enableVoice").prop("checked", enableVoice);
});

$("#enableVoice").click(function () {
    enableVoice = !enableVoice;
    chrome.storage.sync.set({ 'enableVoice': enableVoice }, function () {
        console.log("New enableVoice set: " + enableVoice);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id,
            {
                todo: "toggleVoice",
                value: enableVoice
            }
        );
    });
    window.reload();
})

let enablePictures;
chrome.storage.sync.get(['enablePictures'], function (data) {
    if (data.enablePictures != null) {
        console.log("Current value for enablePictures: " + data.enablePictures);
        enablePictures = data.enablePictures;
    } else {
        enablePictures = true;
        chrome.storage.sync.set({ 'enablePictures': enablePictures }, function () {
            console.log("New enablePictures set: " + enablePictures);
        });
    }
    $("#enablePictures").prop("checked", enablePictures);
});

$("#enablePictures").click(function () {
    enablePictures = !enablePictures;
    chrome.storage.sync.set({ 'enablePictures': enablePictures }, function () {
        console.log("New enablePictures set: " + enablePictures);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id,
            {
                todo: "togglePictures",
                value: enablePictures
            }
        );
    });
    window.reload();
})


let autoPopup;
chrome.storage.sync.get(['autoPopup'], function (data) {
    if (data.autoPopup != null) {
        console.log("Current value for auto popup: " + data.autoPopup);
        autoPopup = data.autoPopup;
    } else {
        autoPopup = true;
        chrome.storage.sync.set({ 'autoPopup': autoPopup }, function () {
            console.log("New autoPopup set: " + autoPopup);
        });
    }
    $("#autoPopup").prop("checked", autoPopup);
});

$("#autoPopup").click(function () {
    autoPopup = !autoPopup;
    chrome.storage.sync.set({ 'autoPopup': autoPopup }, function () {
        console.log("New autoPopup set: " + autoPopup);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(
            tabs[0].id,
            {
                todo: "togglePopup",
                value: autoPopup
            }
        );
    });
    window.reload();
})

let autoRead;
chrome.storage.sync.get(['autoRead'], function (data) {
    if (data.autoRead != null) {
        console.log("Current value for auto popup: " + data.autoRead);
        autoRead = data.autoRead;
    } else {
        autoRead = true;
        chrome.storage.sync.set({ 'autoRead': autoRead }, function () {
            console.log("New autoRead set: " + autoRead);
        });
    }
    $("#autoRead").prop("checked", autoRead);
});

$("#autoRead").click(function () {
    autoRead = !autoRead;
    chrome.storage.sync.set({ 'autoRead': autoRead }, function () {
        console.log("New autoRead set: " + autoRead);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(
                tab.id,
                {
                    todo: "toggleAutoRead",
                    value: autoRead
                }, function () {
                    if (chrome.runtime.lastError) {
                        setTimeout(function () {
                            chrome.tabs.sendMessage(tab.id, { todo: "toggleAutoRead", value: autoRead });
                        }, 2000);
                    }
                }
            );
        })
    });
    window.reload();
})

$(".refresh-button").click(function () {
    console.log("refreshing");
    location.reload();
});
// $(".refresh-button").click(function() {
//     window.location.reload();
// }
