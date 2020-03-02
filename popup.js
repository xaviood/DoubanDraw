var aWinners = [];

function Doudraw(){
const aImgPath = ["./icon/draw.svg","./icon/loading.svg", "./icon/redraw.svg"];
const oDrawButton = document.getElementsByClassName("button")[0];
const oButton = document.getElementsByClassName("button")[0];
const oImg = oButton.children[0];
const oWinners = document.getElementById("winners");
const oNumber = document.getElementById("number");
const oAddress = document.getElementById("drawAddress");
const oSeeAll = document.getElementsByClassName("seeAll")[0];
const oClipboard = document.getElementById("clipboard");

var aAll = [];
var times = 0;

oDrawButton.addEventListener("click", function(){
    aAll = [];
    oImg.src = aImgPath[1];
    oButton.className += " disabled";
    oSeeAll.className += " disabled";
    oImg.className += " loading";
    getWinners();
});

oSeeAll.addEventListener("click", function(){
    let temp = [];
    aWinners.forEach(function(user){
        temp.push(user.url.split("/")[4]);
    });
    if(window.copy){
        window.copy("@" + temp.join("@"));
    }else{
        oClipboard.value = "@" + temp.join("@");
        oClipboard.select();
        document.execCommand("copy");
    }
})

function drawDone(){
    if(aWinners.length){
        oSeeAll.className = "seeALL";
    }else{
        oSeeAll.className = "seeALL invisible";
    }
    oButton.children[1].innerText = "再抽一次";
    oImg.src = aImgPath[2];
    oButton.className = oButton.className.split(" ")[0];
    oImg.className = oImg.className.split(" ")[0];
}

function gotoUserPage(sUrl){
    chrome.tabs.create({url: sUrl});
}

function checkURLValid(sUrl){
    return Boolean(sUrl.match(/^https:\/\/www.douban.com\/people\/.+\/status\/\d+\//)) || Boolean(sUrl.match(/^https:\/\/www.douban.com\/note\/\d+\//));
}

function cleanWinners(){
    for(let i = 0, len = oWinners.children.length; i < len; i++) { 
        oWinners.removeChild(oWinners.children[0]); 
      }
      aWinners = [];
}

function getWinners(){
    cleanWinners();
    let iAddress = oAddress.value;
    let iNum = oNumber.value;
    if(!checkURLValid(oAddress.value)){
        drawDone();
        chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: './icon/loading.svg',
            title: '错误',
            message: '地址输入错误'
        });
        oAddress.value="";
        return false;
    }
    if(isNaN(iNum) || iNum.trim() === ""){
        drawDone();
        chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: './icon/loading.svg',
            title: '错误',
            message: '请输入数字'
        });
        oNumber.value="";
        return false;
    }
    //draw
    try{
        if(iAddress.indexOf("status")>=0){
            getAllReshare(iAddress, function(){
                addWinners(getLuckyDogs(aAll, iAddress, iNum));
            });
        }else{
            getAllReshareOfDiary(iAddress, function(){
                addWinners(getLuckyDogs(aAll, iAddress, iNum));
            });
        }
    }catch(error){
        console.log("遇到错误");
        console.log(error);
        chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: './icon/loading.svg',
            title: '错误',
            message: '请求太频繁请稍后再试'
        });
        drawDone();
    }
}

function addWinners(arr){
    if(arr.length){
    arr.forEach(function(oItem, index, arr){
        addWinner(oItem, index+1);
        if(index === arr.length-1){
            drawDone();
        }
    });
    }else{
        drawDone();
    }
}

function addWinner(oUser, index){
    if(typeof oUser !== "object") return false;
    let oWinner = document.createElement("div");
    oWinner.className = "winner in";
    let oAvatar = document.createElement("img");
    oAvatar.src = oUser.avatar || "./icon/douban.svg";
    oAvatar.draggable = false;
    let oUserName = document.createElement("a");
    oUserName.appendChild(document.createTextNode(oUser.name || "unknow"));
    oWinner.appendChild(oAvatar);
    oWinner.appendChild(oUserName);
    oWinners.appendChild(oWinner);
    oUser.url && oWinner.addEventListener('click', gotoUserPage.bind(this, oUser.url));
    setTimeout(function(){
        oWinner.className = "winner";
    },100*index);
}

/****************************************/

function getAllReshareOfDiary(url, cb){
    $.get(url, function(res){
        var doc = Array.prototype.filter.call($.parseHTML(res),(o)=>{return o.id==="wrapper"})[0];
        times = Math.ceil(getReshareNumOfDiary(doc)/30);
        for(let i=0; i<=times;i++){
            setTimeout(function(){$.get(url+"/?type=rec&start="+ i*30, function(res){
                getReshareOfDiary(Array.prototype.filter.call($.parseHTML(res),(o)=>{return o.id==="wrapper"})[0], i, cb); 
            });}
            , 500*i)
        }
    });
}

function getAllReshare(url, cb){
    $.get(url, function(res){
        var doc = Array.prototype.filter.call($.parseHTML(res),(o)=>{return o.id==="wrapper"})[0];
        times = Math.ceil(getReshareNum(doc)/20);
        for(let i=0; i<=times;i++){
            setTimeout(function(){$.get(url+"?start="+ i*20 +"&tab=reshare", function(res){
               getReshare(Array.prototype.filter.call($.parseHTML(res),(o)=>{return o.id==="wrapper"})[0], i, cb); 
            });}
            , 500*i)
        }
    });
}

function getReshareNumOfDiary(doc){
    return Number(doc.getElementsByClassName("rec-num")[0].innerText);
}

function getReshareNum(doc){
    let len = doc.getElementsByTagName("h2").length;
    if(len<=0){
        return false;
    }else if(len===1){
        let sMatcher =doc.getElementsByTagName("h2")[0].innerText.match(/\d+/g)[0];
        if( sMatcher === "转发"){
            return sMatcher
        }
        return false;
    }
        return doc.getElementsByTagName("h2")[1].innerText.match(/\d+/g)[0];
}

function getReshareOfDiary(doc, i, cb){
    let aList = doc.getElementsByClassName("list topic-rec-list")[0].children[0].children;
    Array.prototype.forEach.call(aList,function(oItem){
        if(!~aAll.findIndex(function(oHas){return oHas.url === oItem.children[0].children[0].href})){
        aAll.push({
           name:oItem.children[0].children[0].children[0].alt,
           avatar:oItem.children[0].children[0].children[0].src,
           url: oItem.children[0].children[0].href
        });
        }
    });
    setTimeout(function(){
        if(i===times){
        console.log(aAll);
        cb && cb();
    }},0);
}

function getReshare(doc, i, cb){
    let aList = doc.getElementsByClassName("list status-reshare-list")[0].children[0].children;
    Array.prototype.forEach.call(aList,function(oItem){
        if(!~aAll.findIndex(function(oHas){return oHas.url === oItem.children[0].children[0].href})){
        aAll.push({
           name:oItem.children[0].children[0].children[0].alt,
           avatar:oItem.children[0].children[0].children[0].src,
           url: oItem.children[0].children[0].href
        });
        }
    });
    setTimeout(function(){
        if(i===times){
        console.log(aAll);
        cb && cb();
    }},0);
}

function getLuckyDogs(arr, url, number){
    let len = arr.length;
    arr.forEach(function(oItem, index){
        let iLucky = Math.random()*len>>0;
        let temp = arr[iLucky];
        arr[iLucky] = oItem;
        arr[index] = temp;
    }); //one
    let aLucky = [];
    for(let i=0;aLucky.length<len && aLucky.length<number;i++){
        let iLucky =  Math.random()*len>>0;
        !~aLucky.indexOf(iLucky) && aLucky.push(iLucky);
    }//two
    aWinners = aLucky.map(function(o){return arr[o]});
    chrome.storage.sync.set({winners:aWinners,url: url,number: number });
    return aWinners;
}

this.checkExistedWinners = function(){
    chrome.storage.sync.get(["winners","url", "number"], function(res) {
        if(res.winners && res.url && res.number){
            drawDone();
            aWinners = res.winners;
            oAddress.value = res.url;
            oNumber.value = res.number;
            addWinners(res.winners);
        };
    });
}
};

var doudraw = new Doudraw();
doudraw.checkExistedWinners();