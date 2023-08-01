var enableVoice;
chrome.storage.sync.get(['enableVoice'], function(data){
    if(data.enableVoice != null) {
        console.log("Current value for enableVoice: " + data.enableVoice);
        enableVoice = data.enableVoice;
    } else {
        enableVoice = true;
        chrome.storage.sync.set({'enableVoice': enableVoice}, function(){
            console.log("New enableVoice set: " + enableVoice);
        });
    }
    $("#enableVoice").prop("checked", enableVoice);
});

$("#enableVoice").click(function() {
    enableVoice = !enableVoice;
    chrome.storage.sync.set({'enableVoice': enableVoice}, function(){
        console.log("New enableVoice set: " + enableVoice);
    });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage (
            tabs[0].id, 
            {
                todo: "toggleVoice",
                value: enableVoice
            }
        );
    });
})

var enablePictures;
chrome.storage.sync.get(['enablePictures'], function(data){
    if(data.enablePictures != null) {
        console.log("Current value for enablePictures: " + data.enablePictures);
        enablePictures = data.enablePictures;
    } else {
        enablePictures = true;
        chrome.storage.sync.set({'enablePictures': enablePictures}, function(){
            console.log("New enablePictures set: " + enablePictures);
        });
    }
    $("#enablePictures").prop("checked", enablePictures);
});

$("#enablePictures").click(function() {
    enablePictures = !enablePictures;
    chrome.storage.sync.set({'enablePictures': enablePictures}, function(){
        console.log("New enablePictures set: " + enablePictures);
    });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage (
            tabs[0].id, 
            {
                todo: "togglePictures",
                value: enablePictures
            }
        );
    });
})

var voiceSelect;
chrome.storage.sync.get(['voiceSelect'], function(data){
    if(data.voiceSelect != null) {
        console.log("Current value for voiceSelect: " + data.voiceSelect);
        voiceSelect = data.voiceSelect;
    } else {
        voiceSelect = "Justin";
        chrome.storage.sync.set({'voiceSelect': voiceSelect}, function(){
            console.log("New voiceSelect set: " + voiceSelect);
        });
    }
    $('#selectVoice').val(voiceSelect);
});

$('#selectVoice').change(function() {
    voiceSelect = $(':selected').val();
    console.log("Voice selected: " + voiceSelect);
    chrome.storage.sync.set({'voiceSelect': voiceSelect}, function() {
        console.log("New voiceSelect set: " + voiceSelect);
    });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage (
            tabs[0].id, 
            {
                todo: "voiceSelect",
                value: voiceSelect
            }
        );
    });
})



var highlightDifference = {
    'highlightBackground' : true,
    'changeTextColor' : false,
    'underline' : false
}
chrome.storage.sync.get(['highlightBackground','changeTextColor','underline'], function(data){
    $.each(highlightDifference, function(key, value) {
        if( data[key] != null ) {
            highlightDifference[key] = data[key];
        } else {
            chrome.storage.sync.set({key: value}, function(){
            });
        }
        $("#" + key).prop("checked", highlightDifference[key]);
    });
    //console.log(highlightDifference);
});

$(".hightlightDifferenceOption").click(function() {
    highlightDifference[this.name] = this.checked;
    chrome.storage.sync.set({[this.name]: this.checked}, function(){
    });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage (
            tabs[0].id, 
            {
                todo: "highlightDifference",
                value: highlightDifference
            }
        );
    });
});
