/* global fetch */
let emotes = {};

let emoteList = document.getElementById("emote_list");

let descendingBox = document.getElementById("descending");
let search = document.getElementById("search");
let sortElem = document.getElementById("sort");

let creatorFilter = document.getElementById("creator_filter");
let rarityFilter = document.getElementById("rarity_filter");


let params = new URLSearchParams(window.location.search);

creatorFilter.value = params.get("creator") == null ? "@" : params.get("creator");
rarityFilter.value = params.get("rarity") == null ? "@" : params.get("rarity");

let hash = new URLSearchParams(window.location.hash.substring(1));

sortElem.value = hash.get("sort") == null ? "name" : hash.get("sort");
if (sortElem.value == "search") {
    search.style.display = "block";
    search.value = hash.get("q") == null ? "" : hash.get("q");
} else {
    search.style.display = "none";
}
descendingBox.checked = hash.get("descending") == "true" ? true : false;


fetch("https://cdn.jsdelivr.net/gh/GeyserExtras/EmoteExtractor@refs/heads/main/emotes/en_US.json").then((r) => r.json()).then((data) => {
    emotes = data

    let creators = [];

    for (const emote of Object.keys(emotes)) {
        emotes[emote].uuid = emote;
        emotes[emote].element = addEmote(emotes[emote]);

        let creator = emotes[emote].creator;
        if (creator != "Minecraft" && creators.indexOf(creator) == -1) {
            creators.push(creator);
        }
    }

    creators.sort((a, b) => a.localeCompare(b)).forEach((value) => {
        creatorFilter.appendChild(new Option(value, value, false, new URLSearchParams(window.location.search).get("creator") == value));
    });

    sort(sortElem.value, descendingBox.checked);
});

creatorFilter.addEventListener("change", (ev) => {
    var params = new URLSearchParams(window.location.search);
    if (creatorFilter.value == "@") {
        params.delete("creator");
    }
    else {
        params.set("creator", creatorFilter.value);
    }
    window.location.search = "?" + params.toString();
});

rarityFilter.addEventListener("change", (ev) => {
    var params = new URLSearchParams(window.location.search);
    if (rarityFilter.value == "@") {
        params.delete("rarity");
    }
    else {
        params.set("rarity", rarityFilter.value);
    }
    window.location.search = "?" + params.toString();
});

descendingBox.addEventListener("change", (ev) => {
    updateDescendingBox();
    sort(sortElem.value, descendingBox.checked);
});
function updateDescendingBox() {
    hash.set("descending", descendingBox.checked + "")
    window.location.hash = "#" + hash.toString();
}

sortElem.addEventListener("change", (ev) => {
    hash.set("sort", sortElem.value);
    if (sortElem.value == "search") {
        search.style.display = "block";
        descendingBox.checked = true;
        updateDescendingBox();
    } else {
        search.value = "";
        search.style.display = "none";
        descendingBox.checked = false;
        updateDescendingBox();
        hash.delete("q");
    }
    window.location.hash = "#" + hash.toString();
    sort(sortElem.value, descendingBox.checked);
});

search.addEventListener("keyup", (ev) => {
    sort(sortElem.value, descendingBox.checked);
});

search.addEventListener("change", (ev) => {
    sort(sortElem.value, descendingBox.checked);
    if (search.value == "") {
        hash.delete("q");
    }
    else {
        hash.set("q", search.value);
    }
    window.location.hash = "#" + hash.toString();
});

function sort(type, descending) {
    if (type == null) {
        type = "name";
    }
    if (descending == null) {
        descending = false;
    }

    sortElem.value = type;

    let sorted = [];
    Object.keys(emotes).forEach((key) => {
        sorted.push(emotes[key]);
    });

    sorted = sortArray(type, sorted, descending);
    sorted = sorted.filter((a) => getURLParamsStatus(a))

    const total = Object.keys(emotes).length;
    const displayed = sorted.length;

    let totalText = "Total Emotes: "
    if (total !== displayed) {
        totalText += displayed + " / "
    }
    totalText += total;

    document.getElementById("total_emotes").innerText = totalText;

    const shownUUIDs = [];
    sorted.forEach((emote, i) => {
        shownUUIDs.push(emote.uuid);
        emote.element.style.display = "";
        emote.element.style.order = i;
    });

    Object.keys(emotes).forEach((key) => {
        if (!shownUUIDs.includes(key)) {
            emotes[key].element.style.display = "none";
        }
    });
}

function sortArray(type, sorted, descending) {
    if (descending == null) {
        descending = false;
    }
    let d = descending ? -1 : 1;

    if (type == "name") {
        return sorted.sort((a, b) => d * a.name.localeCompare(b.name));
    }
    else if (type == "creator") {
        sorted = sortArray("name", sorted, descending);
        return sorted.sort((a, b) => d * a.creator.localeCompare(b.creator));
    }
    else if (type == "price") {
        // Do a few sorts before hand to make it look neater
        sorted = sortArray("name", sorted, descending);
        // Have to do this instead of sortArray("rarity") to avoid a call stack error as price sort is called there
        sorted = sorted.sort((a, b) => d * (getRarityAsNumber(a.rarity) - getRarityAsNumber(b.rarity)));
        return sorted.sort((a, b) => d * (a.price - b.price));
    }
    else if (type == "rarity") {
        // Sort by price before hand to make it look neater
        sorted = sortArray("price", sorted, descending);
        return sorted.sort((a, b) => d * (getRarityAsNumber(a.rarity) - getRarityAsNumber(b.rarity)));
    }
    else if (type == "uuid") {
        return sorted.sort((a, b) => d * a.uuid.localeCompare(b.uuid));
    }
    else if (type == "search") {
        sorted = sorted.sort((a, b) => d * (getSearchScore(a) - getSearchScore(b)));
        return sorted.filter((a) => getSearchScore(a) != 0)
    }
    return sorted;
}

function getURLParamsStatus(emote) {
    if (params.get("creator") != null && emote.creator != params.get("creator")) {
        return false;
    }

    if (params.get("rarity") != null && emote.rarity != params.get("rarity")) {
        return false;
    }

    if (params.get("uuid") != null && emote.uuid != params.get("uuid")) {
        return false;
    }
    return true;
}


function getSearchScore(emote) {
    let score = 0;

    if (!getURLParamsStatus(emote)) {
        return score;
    }

    if (emote.uuid == search.value) {
        score += 999;
    }

    score += getSearchTextScore(emote.name, emote, search.value);
    score += getSearchTextScore(emote.creator, emote, search.value);

    search.value.split(" ").forEach((string) => {
        if (string != '' && string != ' ') {
            score += getSearchTextScore(emote.name, emote, string);
            score += getSearchTextScore(emote.creator, emote, string);
        }
    });


    return score;
}


function getSearchTextScore(text, emote, query) {
    let score = 0;
    if (text == query) {
        score += 1;

        // Prefer official emotes
        if (emote.creator == "Minecraft") {
            score += 1;
        }
    }

    if (text.toLowerCase() == query.toLowerCase()) {
        score += 1;

        // Prefer official emotes
        if (emote.creator == "Minecraft") {
            score += 1;
        }
    }

    if (text.startsWith(query)) {
        score += 1;

        // Prefer official emotes
        if (emote.creator == "Minecraft") {
            score += 1;
        }
    }

    if (text.toLowerCase().startsWith(query.toLowerCase())) {
        score += 1;

        // Prefer official emotes
        if (emote.creator == "Minecraft") {
            score += 1;
        }
    }

    if (text.includes(query)) {
        score += 1;

        // Prefer official emotes
        if (emote.creator == "Minecraft") {
            score += 1;
        }
    }

    if (text.toLowerCase().includes(query.toLowerCase())) {
        score += 1;

        // Prefer official emotes
        if (emote.creator == "Minecraft") {
            score += 1;
        }
    }

    return score;
}

function getRarityAsNumber(rarity) {
    switch (rarity) {
        case "common":
            return 0;
        case "uncommon":
            return 1;
        case "rare":
            return 2;
        case "epic":
            return 3;
        case "legendary":
            return 4;
        default:
            return 0;
    }
}

function addEmote(emote) {
    // Copy basic emote placeholder
    let display = document.getElementById("template_emote").cloneNode(true);

    // This is solely just to get intellisense to function lmao!!
    if (display instanceof HTMLElement) {
        display.classList.add("rarity_" + emote.rarity);

        display.querySelector(".emote_image").src = emote.thumbnail;
        display.querySelector(".emote_name").innerText = emote.name;
        display.querySelector(".emote_creator").innerHTML = "&#x1F464; " + emote.creator;
        display.querySelector(".emote_price").innerText = emote.price == 0 ? "FREE" : (emote.price == undefined ? "???" : emote.price);
        display.querySelector(".emote_uuid").innerText = "UUID: " + emote.uuid;

        display.addEventListener("mouseover", (ev) => {
            display.querySelector(".emote_overlay").classList.add("blur_overlay");
            display.querySelector(".clipboard").innerHTML = "&#x1f5d0;";
            display.querySelector(".copy_text").innerText = "Copy UUID";
        });
        display.addEventListener("mouseout", (ev) => {
            display.querySelector(".emote_overlay").classList.remove("blur_overlay");
        });


        display.addEventListener("click", (ev) => {
            display.querySelector(".emote_overlay").classList.add("blur_overlay");

            let promise = navigator.clipboard.writeText(emote.uuid);
            promise.catch((error) => {
                display.querySelector(".clipboard").innerHTML = "&#x274e;";
                display.querySelector(".copy_text").innerText = "Error!";
                console.log(error);
            });
            promise.then(() => {
                display.querySelector(".clipboard").innerHTML = "&#x2705;";
                display.querySelector(".copy_text").innerText = "Copied UUID!";
                window.setTimeout(() => {
                    display.querySelector(".emote_overlay").classList.remove("blur_overlay");
                }, 350);
            });
        });

        display.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
            window.location.href = "minecraft://showDressingRoomOffer?offerID=" + emote.uuid + "/"
        })

        display.id = emote.uuid;


        emoteList.appendChild(display);

        return display;
    }
}

function clearList() {
    emoteList.textContent = '';
}
