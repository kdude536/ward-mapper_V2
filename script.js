const houseIcon = L.divIcon({
    className: 'house-icon',
    html: '<div class="house-square"></div>',
    iconSize: [16,16],
    iconAnchor: [8,8]
});

var map = L.map('map',{
    maxZoom:22
}).setView([8.5241,76.9366],18);

let wardBoundary = null;

let houses = [];

let selectedHouse = null;

let addHouseMode = false;

let userMarker = null;

let accuracyCircle = null;

let printMap = null;

let isDragging = false;

let offsetX = 0;

let offsetY = 0;

let resizing = false;

let templateMap=null;

let resizeDir = "";

let startLeft;
let startTop;

let startX;
 let startY;



L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
maxZoom:22
}
).addTo(map);

// Layer to store drawn items
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);
// const editHandler = new L.EditToolbar.Edit(map, {
//     featureGroup: drawnItems
// });



// Drawing controls
var drawControl = new L.Control.Draw({

    edit: {
        featureGroup: drawnItems
    },

    draw: {

        polygon: true,

        rectangle: false,

        circle: false,

        marker: false,

        polyline: false,

        circlemarker: false

    }

});

map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (event) {

    // Remove previous boundary (only one ward allowed)
    drawnItems.clearLayers();
    if (wardBoundary) {

    showToast("Only one ward boundary is allowed.");

    return;

}
    // drawnItems.addLayer(event.layer);
    
    // wardBoundary = drawnItems;
    wardBoundary = event.layer;
    drawnItems.addLayer(wardBoundary);
    // Convert to GeoJSON
    //var geojson = layer.toGeoJSON();

    // Save in browser
    localStorage.setItem(
        "wardBoundary",
        JSON.stringify(wardBoundary.toGeoJSON())
    );

    showToast("Ward boundary saved!");
});
map.on(L.Draw.Event.DELETED, function () {

    localStorage.removeItem("wardBoundary");

    wardBoundary = null;

    showToast("Boundary deleted");   // or alert()

});
map.on(L.Draw.Event.EDITED, function () {

    localStorage.setItem(
        "wardBoundary",
        JSON.stringify(drawnItems.toGeoJSON())
    );

});
// const editHandler = new L.EditToolbar.Edit(map, {
//     featureGroup: drawnItems
// });
document.getElementById("drawBoundaryBtn").onclick = function(){

    if(wardBoundary){

        showToast("A ward boundary already exists. Clear or edit it first.");

        return;

    }

    new L.Draw.Polygon(map).enable();

}
document.getElementById("editBoundaryBtn").onclick=function(){

    if(!wardBoundary){

        showToast("Draw a boundary first.");
        return;

    }

    editHandler.enable();

    document.getElementById("editToolbar").style.display="flex";

}

const savedBoundary = localStorage.getItem("wardBoundary");


if(savedBoundary){

    const geojson = JSON.parse(savedBoundary);

    const geoLayer = L.geoJSON(geojson);

    geoLayer.eachLayer(function(layer){

        wardBoundary = layer;

        drawnItems.addLayer(layer);

    });

    map.fitBounds(wardBoundary.getBounds());

}

document.getElementById("clearBtn").onclick=function(){

    drawnItems.clearLayers();

    wardBoundary = null;

    localStorage.removeItem("wardBoundary");

}
var satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        maxZoom: 22,
        attribution: 'Esri'
    }
);

satellite.addTo(map);

var osm = L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
    maxZoom:18
}
);

osm.addTo(map);

L.control.layers({
    "Street": osm,
    "Satellite": satellite
}).addTo(map);

// map.on("click", function(e){

//     console.log(e.latlng);

// });

//loading markers from storage if it exists

const saved = localStorage.getItem("houses");

if(saved){
    const housesData = JSON.parse(saved);

    housesData.forEach(function(data){

        const marker =
            L.marker(
                [data.lat,data.lng],
                {
                    icon: createPDFMarkerIcon(data),
                    draggable:true
                }
            );

        const house={

            id : data.id,

            houseNo:data.houseNo,

            rooms:data.rooms,

            people:data.people,

            marker:marker,

            status:data.status,

        };
        

    marker.addTo(map);

    if (house.status==1){

        house.marker.getElement().classList.add("completed");
    }
    else if (house.status==2){

        house.marker.getElement().classList.add("revisit");
    }
    else if (house.status==3){

        house.marker.getElement().classList.add("census");
    }

    // house.marker.bindTooltip(

    //     house.houseNo,

    //         {
    //             permanent:true,
    //             direction:"top",
    //             offset:[0,-10]
    //         }

    //     );

    houses.push(house);

    updateDashboard();

    marker.on("click",function(){

            openHouseForm(house);

            //saveHouses(house);
                
            //console.log(houses)

            });



    });
}

document.getElementById("hsearch").onclick = function(){
    
    const hno=document.getElementById("searchip")

    if (hno.value){

        //console.log(hno.value)

        searchHouse(hno.value.trim())

    }else{

        hno.placeholder="Enter a houses number"

    }
}



document.getElementById("addHouseBtn").onclick = function(){

    addHouseMode = true;

    // this.innerHTML = "Click a Roof...";
 

}

 map.on("click", function(e){   //function to add markers on clicking the polygon
    if(!addHouseMode){

        return;
    }
    if(!wardBoundary){
        showToast("Draw ward first now.");
        return;
    }

    createHouse(e)

    });


function createHouse(e)
{
    const point = turf.point([
        e.latlng.lng,
        e.latlng.lat
    ]);

    //console.log(savedBoundary)
    const polygon = wardBoundary.toGeoJSON().geometry;//was wardboundary
    //console.log(polygon)
    if(!addHouseMode)
        return;

    if(turf.booleanPointInPolygon(point, polygon)){

        console.log("Inside");
        const marker = L.marker(
            e.latlng,
            {
                icon: createPDFMarkerIcon([]),
                draggable:true
            }
        );
       const house = {
            id:Date.now(),
            houseNo:"",
            rooms:0,
            people:0,
            marker:null,
            status:0,

        };
        house.marker=marker;
        //houses.push(marker);

        marker.addTo(map);

        marker.on("click",function(){

            openHouseForm(house);

            //saveHouses(house);
                
            console.log(houses)

            });

        

        document.getElementById("cancelHouse").onclick=function(){

               document.getElementById("houseForm").style.bottom = "-500px";;

            }

        //});

        marker.on("dragend", function(){

    saveHousesToLocalStorage();

    updateDashboard();

    showToast("House location updated");

});
        

    }
    else{

        console.log("Outside");

    }
}


function saveHouses(house){
    
    const marker = house.marker.getElement();
    

    selectedHouse = house;
    
        selectedHouse.houseNo=
            document.getElementById("houseNo").value;

        selectedHouse.rooms=
            document.getElementById("rooms").value;

        selectedHouse.people=
                document.getElementById("people").value;

        if(!house.houseNo){
        console.log('hello')
        document.getElementById("houseNo").placeholder="Enter a house number"
        return;
    }

        document.getElementById("houseForm").style.bottom = "-500px";


        addHouseMode = false;

        // document.getElementById("addHouseBtn").innerHTML ="Add House";

        const revisit=document.getElementById("cboxrevisit").checked

        const censuscomplete=document.getElementById("censusCompleteip").checked
        
        marker.classList.remove("completed", "revisit", "census");

        if (censuscomplete){
            
            house.marker.getElement().classList.add("census");

            house.status=3;


        }else if (revisit){
            
            house.marker.getElement().classList.add("revisit");

            house.status=2;


        }else{

        //    house.marker.getElement().classList.remove("revisit");

           house.marker.getElement().classList.add("completed");

           house.status=1;
        }
        
        
        const index = houses.findIndex(h => h.id === house.id);

        if (index === -1) {

            houses.push(house);

        } else {

            houses[index] = house;

        }


        updateDashboard();


        //house.status=1;

        selectedHouse.houseNo = document.getElementById("houseNo").value;

        // selectedHouse.marker.bindTooltip(

        // selectedHouse.houseNo,

        //     {
        //         permanent:true,
        //         direction:"top",
        //         offset:[0,-10]
        //     }

        // );
                
                console.log(houses)

    saveHousesToLocalStorage();
    
}
function saveHousesToLocalStorage(){

    let data=[];

    houses.forEach(function(house){

        // console.log(house)
        const pos = house.marker.getLatLng();

        data.push({

            lat:pos.lat,

            lng:pos.lng,

            id:house.id,

            houseNo:house.houseNo,

            rooms:house.rooms,

            people:house.people,

            status:house.status,

        });
    });

    localStorage.setItem(

            "houses",

            JSON.stringify(data)
    );

}
function openHouseForm(house){

    //selectedHouse = house;

    document.getElementById("houseNo").value =
        house.houseNo;

    document.getElementById("rooms").value =
        house.rooms;

    document.getElementById("people").value =
        house.people;

    const form = document.getElementById("houseForm");

    form.style.bottom = "100px";

    document.getElementById("deleteHouse").onclick=function(){
            
        deleteHouses(house);

    };

    document.getElementById("saveHouse").onclick=function(){
            
        saveHouses(house);

    };

}

function searchHouse(hno){

    // const houseNo =
    //     document.getElementById("searchHouse")
    //     .value
    //     .trim();
    const house = houses.find(function(h){

        return h.houseNo === hno;

    });
    console.log(houses)
    if(house){

        map.flyTo(
            house.marker.getLatLng(),
            18
        );
    openHouseForm(house);

    }else{

        document.getElementById("searchHouse").placeholder="House not found"


    }

}
function updateDashboard(){

    const total = houses.length;

    const completed =
        houses.filter(h => h.status === 1).length;

    const revisit =
        houses.filter(h => h.status === 2).length;

    // const pending =
    //     houses.filter(h => h.status === 0).length;

    const censuscompleted =
        houses.filter(h => h.status === 3).length;


    document.getElementById("revisitCount").textContent = revisit;
document.getElementById("completedCount").textContent = completed;
document.getElementById("pendingCount").textContent = censuscompleted;

document.getElementById("revisitCount2").textContent = revisit;
document.getElementById("completedCount2").textContent = completed;
document.getElementById("pendingCount2").textContent = censuscompleted;

document.getElementById("totalCount").textContent = houses.length;
document.getElementById("totalCount2").textContent = houses.length;

}

function deleteHouses(house){

    map.removeLayer(house.marker);

    const index = houses.indexOf(house);

    console.log(index)

    if(index !== -1){

        houses.splice(index,1);

    }

    document.getElementById("houseForm").style.bottom = "-500px";

    saveHousesToLocalStorage();

    updateDashboard();

}

//GPS location start

document.getElementById("locateBtn").onclick = function(){  

    if(!navigator.geolocation){

        showToast("Geolocation is not supported.");


        return;

    }

    navigator.geolocation.getCurrentPosition(
        showLocation,
        locationError,
        {
            enableHighAccuracy:true
        }
    );

}

function showLocation(position){

    const lat = position.coords.latitude;

    const lng = position.coords.longitude;

    const accuracy = position.coords.accuracy;

    console.log(lat,lng,accuracy);

    const latlng = [lat,lng];

if(userMarker){

    userMarker.setLatLng(latlng);

}else{

    userMarker = L.marker(latlng);

    userMarker.addTo(map);

}
    if(accuracyCircle){

        accuracyCircle.setLatLng(latlng);
        accuracyCircle.setRadius(accuracy);

    }else{

        accuracyCircle = L.circle(latlng, {

    radius: accuracy,

    color: "#0078ff",

    fillColor: "#0078ff",

    fillOpacity: 0.15,

    weight: 1

});

        accuracyCircle.addTo(map);

    }

map.flyTo(latlng,18);

}

function locationError(error){

    showToast(error.message);


}
//Dashbord
let dashboardVisible = true;

document.getElementById("dashboardBtn").onclick = function(){

    dashboardVisible = !dashboardVisible;

    document
        .getElementById("dashboard")
        .classList
        .toggle("hidden");

}
document.getElementById("dashboard").onclick = function(){

    this.classList.toggle("expanded");

}
const menus = document.querySelectorAll(".submenu");

function closeMenus(){

    menus.forEach(function(menu){

        menu.classList.remove("open");

    });

}
document.getElementById("houseMenuBtn").onclick=function(){

    const menu=document.getElementById("houseMenu");

    const wasOpen=menu.classList.contains("open");

    closeMenus();

    if(!wasOpen){

        menu.classList.add("open");

    }

}
document.getElementById("importBtn").onclick = function () {

    document.getElementById("importJson").click();

};
document.getElementById("importJson").addEventListener("change", function (e) {

    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function () {

        const data = JSON.parse(reader.result);

        importSurvey(data);

    };

    reader.readAsText(file);

});
function importSurvey(data){

    if(data.version !== 1){

        alert("Unsupported file");

        return;

    }
    houses = [];

    drawnItems.clearLayers();
    console.log("Checking wardboundary in local storage before")
    console.log(localStorage.getItem("wardBoundary"));

    localStorage.removeItem("wardBoundary");

    wardBoundary = null;

    // Remove existing markers
    map.eachLayer(function(layer){

        if(layer instanceof L.Marker){

            map.removeLayer(layer);

        }

    });

    // Restore boundary
    const boundary = L.geoJSON(data.wardBoundary);

    boundary.eachLayer(function(layer){

        wardBoundary = layer;

        drawnItems.addLayer(layer);

    });
    localStorage.setItem(
        "wardBoundary",
        JSON.stringify(wardBoundary.toGeoJSON())
    );

    // Restore houses
    data.houses.forEach(importHouse);

    updateDashboard();

    map.fitBounds(wardBoundary.getBounds());

    saveHousesToLocalStorage();


}
function importHouse(houseData) {

    const marker = L.marker(
        [houseData.lat, houseData.lng],
        {
            icon: createPDFMarkerIcon(houseData),
            draggable: true
        }
    ).addTo(map);

    houseData.marker = marker;
        if (houseData.status === 1) {

        marker.getElement().classList.add("completed");

    }
    else if (houseData.status === 2) {

        marker.getElement().classList.add("revisit");

    }
    else if (houseData.status === 3) {

        marker.getElement().classList.add("census");

    }
        marker.bindTooltip(

        houseData.houseNo,

        {
            permanent: true,
            direction: "top",
            offset: [0,-10]
        }

    );
        marker.on("click", function(){

        openHouseForm(houseData);

    });

    marker.on("dragend", function(){

        saveHousesToLocalStorage();

        updateDashboard();

        showToast("House location updated");

    });
        houses.push(houseData);

}

document.getElementById("searchBtn").onclick=function(){

    const menu=document.getElementById("searchdiv");

    const wasOpen=menu.classList.contains("open");

    closeMenus();

    if(!wasOpen){

        menu.classList.add("open");

    }

}
document.getElementById("drawMenuBtn").onclick=function(){

    const menu=document.getElementById("drawMenu");

    const wasOpen=menu.classList.contains("open");

    closeMenus();

    if(!wasOpen){

        menu.classList.add("open");

    }

}
function showToast(message){

    const toast=document.getElementById("toast");

    toast.textContent=message;

    toast.classList.add("show");

    setTimeout(function(){

        toast.classList.remove("show");

    },2000);

}

function createExportData(){

    const exportHouses = houses.map(function(h){

        return{

            id: h.id,

            houseNo: h.houseNo,

            rooms: h.rooms,

            people: h.people,

            status: h.status,

            revisit: h.status === 2,

            completed: h.status === 3,

            lat: h.marker.getLatLng().lat,

            lng: h.marker.getLatLng().lng

        };

    });

    return{

        version:1,

        exportedAt:new Date().toISOString(),

        wardBoundary:JSON.parse(localStorage.getItem("wardBoundary")),

        houses:exportHouses

    };

}
document.getElementById("exportBtn").onclick=function(){

    const exportData=createExportData();

    const json=JSON.stringify(exportData,null,2);

    const blob=new Blob([json],{

        type:"application/json"

    });

    const url=URL.createObjectURL(blob);

    const a=document.createElement("a");

    a.href=url;

    a.download="WardSurvey.json";

    a.click();

    URL.revokeObjectURL(url);

}
//PDF

// const printMap = L.map("paperMap");

document.getElementById("exportPdfBtn").onclick=function(){

    // document.getElementById("printLayout").style.display="flex";

   

    openPrintLayout()

}
function openPrintLayout() {

    document.getElementById("printLayout").style.display = "flex";

    setTimeout(() => {

        if (!printMap) {

            printMap = L.map("paperMap", {
                zoomControl: false,
                attributionControl: false,
                 preferCanvas: true,
                  zoomSnap: 0.1,
    zoomDelta: 0.1
            });

            L.tileLayer(
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                {
                    maxZoom: 20
                }
            ).addTo(printMap);

        }

        refreshPrintMap();

    },100);

}
function refreshPrintMap(){

    printMap.invalidateSize();
//     printMap.whenReady(function () {

//     setTimeout(exportPDF, 300);

// });

    printMap.setView(
        map.getCenter(),
        map.getZoom()
    );
    // Remove everything except the tile layer
printMap.eachLayer(function(layer){

    if (!(layer instanceof L.TileLayer)) {

        printMap.removeLayer(layer);

    }

});

// printMap.fitBounds(wardBoundary.getBounds());
// L.geoJSON(wardBoundary.toGeoJSON()).addTo(printMap);
houses.forEach(function(house){

    const marker = L.marker(
    house.marker.getLatLng(),
    {
        icon: createPDFMarkerIcon(house)
    }
).addTo(printMap);

    const el = marker.getElement();

    if(house.status===1)
        el.classList.add("completed");

    else if(house.status===2)
        el.classList.add("revisit");

    else if(house.status===3)
        el.classList.add("census");

});
const printBoundary = L.geoJSON(
    wardBoundary.toGeoJSON()
).addTo(printMap);

printMap.fitBounds(printBoundary.getBounds());

}
function refreshTemplateMap(){

    templateMap.invalidateSize();
//     printMap.whenReady(function () {

//     setTimeout(exportPDF, 300);

// });

    templateMap.setView(
        map.getCenter(),
        map.getZoom()
    );
    // Remove everything except the tile layer
templateMap.eachLayer(function(layer){

    if (!(layer instanceof L.TileLayer)) {

        templateMap.removeLayer(layer);

    }

});

// printMap.fitBounds(wardBoundary.getBounds());
// L.geoJSON(wardBoundary.toGeoJSON()).addTo(printMap);
houses.forEach(function(house){

    const marker = L.marker(
    house.marker.getLatLng(),
    {
        icon: createPDFMarkerIcon(house)
    }
).addTo(templateMap);

    const el = marker.getElement();

    if(house.status===1)
        el.classList.add("completed");

    else if(house.status===2)
        el.classList.add("revisit");

    else if(house.status===3)
        el.classList.add("census");

});
const canvasRenderer = L.canvas();

const printBoundary = L.geoJSON(
    wardBoundary.toGeoJSON(),
    {
        renderer: canvasRenderer,
        style: {
            color: "#00a6ff",
            weight: 3
        }
    }
).addTo(templateMap);

}
function createPDFMarkerIcon(house){

    let markerClass = "";
    var hno=house.houseNo;
    var cno=house.rooms
    var sno=house.people

    if(house.length==0){
        markerClass="pdf-incompleted"
        hno=0
        cno=0
        sno=0
    }

    else if(house.status === 1)
        markerClass = "pdf-completed";

    else if(house.status === 2)
        markerClass = "pdf-revisit";

    else if(house.status === 3)
        markerClass = "pdf-census";

    return L.divIcon({

        className: "",

        html: `
        <div class="main-pdf ${markerClass}">
        <div class="pdf-marker-sno">
                ${sno}
            </div>
        <div id="pdf-marker-left">
            <div class="pdf-marker">
                ${hno}
            </div>
            <div class="pdf-marker">
                ${cno}
            </div>
            </div>

            </div>
        `,

        iconSize: null

    });

}
async function exportPDF() {

    const paper = document.getElementById("paper");

    console.log(paper);

    const canvas = await html2canvas(paper, {

        scale: 3,

        useCORS: true

    });

    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({

        orientation: "portrait",

        unit: "mm",

        format: "a4"

    });
    console.log("pdf generation");

    // pdf.addImage(

    //     imgData,

    //     "PNG",

    //     0,

    //     0,

    //     210,

    //     297

    // );
    const imgWidth = 210;
const imgHeight = (canvas.height * imgWidth) / canvas.width;

pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    pdf.save("WardMapper.pdf");

}
document.getElementById("downloadPdf").onclick =function(){

    // console.log("Export button pressed");
    
    exportPDF();

    console.log("Export button pressed");
};
document.getElementById("closePrintPreview").onclick = function () {

    document.getElementById("printLayout").style.display = "none";

};
document.getElementById("printZoomIn").onclick = function () {

    printMap.setZoom(printMap.getZoom() + 0.1);

};

document.getElementById("printZoomOut").onclick = function () {

    printMap.setZoom(printMap.getZoom() - 0.1);

};
document.getElementById("paperSize").onchange = function () {

    const paper = document.getElementById("paper");

    if (this.value === "A4") {

        paper.style.width = "700px";
        paper.style.height = "990px";

    } else {

        paper.style.width = "990px";
        paper.style.height = "1400px";

    }

    setTimeout(function () {

        printMap.invalidateSize();

    }, 100);

};
const resizeHandle =
document.getElementById("resizeHandle");

// resizeHandle.addEventListener("mousedown",function(e){

//     e.stopPropagation();

//     resizing=true;

// });
const overlay = document.getElementById("mapOverlay");

overlay.addEventListener("mousedown", function(e){

    // Don't drag while resizing
    if (resizing)
        return;

    // Don't drag if a resize handle was clicked
    if (e.target.closest(".handle"))
        return;

    // Don't drag when clicking on the Leaflet map
    if (e.target.closest("#templatePaperMap"))
        return;

    isDragging = true;

    offsetX = e.clientX - overlay.offsetLeft;
    offsetY = e.clientY - overlay.offsetTop;

});

// document.addEventListener("mousemove",function(e){

//     if(resizing){

//         overlay.style.width =
//             e.clientX-overlay.offsetLeft+"px";

//         overlay.style.height =
//             e.clientY-overlay.offsetTop+"px";

//         updateTemplateMap();

//         return;

//     }

//     if(isDragging){

//         overlay.style.left =
//             e.clientX-offsetX+"px";

//         overlay.style.top =
//             e.clientY-offsetY+"px";

//     }

// });

document.addEventListener("mouseup",function(){

    isDragging=false;

    resizing=false;

});
document.addEventListener("click",function(){

    overlay.classList.remove("selected");

});

document.getElementById("templatePdfBtn").onclick = function(){

    document.getElementById("templateEditor").classList.add("open");

    if(!templateMap){

        console.log("templateMap")

        templateMap = L.map("templatePaperMap", {
    zoomControl: false,
    attributionControl: false,
    zoomSnap: 0.1,
    zoomDelta: 0.1
});
        

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom:22
            }
        ).addTo(templateMap);
console.log("templateMapp 2")
    }

    setTimeout(function(){

        refreshTemplateMap();

        updateTemplateMap();

    },100);
    loadTemplateLayout();

}


document.getElementById("saveTemplateLayout").onclick = function(){

    const overlay = document.getElementById("mapOverlay");

    
    const layout = {

        left: overlay.offsetLeft,
        top: overlay.offsetTop,
        width: overlay.offsetWidth,
        height: overlay.offsetHeight

    };

    localStorage.setItem(
        "templateLayout",
        JSON.stringify(layout)
    );

    showToast("Template layout saved");


}
function loadTemplateLayout(){

    const saved =
        localStorage.getItem("templateLayout");

    if(!saved)
        return;

    const layout = JSON.parse(saved);

    const overlay =
        document.getElementById("mapOverlay");

    overlay.style.left =
        layout.left + "px";

    overlay.style.top =
        layout.top + "px";

    overlay.style.width =
        layout.width + "px";

    overlay.style.height =
        layout.height + "px";

}

// const seHandle = document.querySelector(".se");
// const seHandle=document.getElementById("se")
const handles = document.querySelectorAll(".handle");

console.log(document.getElementById("se"))
handles.forEach(function(handle){

    handle.addEventListener("mousedown", function(e){

        e.preventDefault();
        e.stopPropagation();
        

        resizing = true;

        resizeDir = handle.dataset.dir;

        startX = e.clientX;
        startY = e.clientY;

        startWidth = overlay.offsetWidth;
        startHeight = overlay.offsetHeight;

        startLeft = overlay.offsetLeft;
        startTop = overlay.offsetTop;
        console.log(resizeDir);

    });

});

document.addEventListener("mousemove", function(e){

    const dx = e.clientX - startX;
const dy = e.clientY - startY;


    // if(resizing){

    //     overlay.style.width =
    //         e.clientX-overlay.offsetLeft+"px";

    //     overlay.style.height =
    //         e.clientY-overlay.offsetTop+"px";

    //     updateTemplateMap();

    //     return;

    // }

    if(isDragging){

        overlay.style.left =
            e.clientX-offsetX+"px";

        overlay.style.top =
            e.clientY-offsetY+"px";

        

    }

if(resizeDir.includes("e"))
    overlay.style.width = (startWidth + dx) + "px";

if(resizeDir.includes("s"))
    overlay.style.height = (startHeight + dy) + "px";

if(resizeDir.includes("w")){

    overlay.style.left = (startLeft + dx) + "px";

    overlay.style.width = (startWidth - dx) + "px";

}

if(resizeDir.includes("n")){

    overlay.style.top = (startTop + dy) + "px";

    overlay.style.height = (startHeight - dy) + "px";

}

// updateTemplateMap();

});
document.addEventListener("mouseup", function(){

    console.log(resizing)

    resizeDir = "";

    resizing = false;

    

});
function updateTemplateMap(){

    requestAnimationFrame(function(){

        templateMap.invalidateSize();

    });

}
document.getElementById("templateZoomIn").onclick = function(){

    templateMap.zoomIn(0.1);

};

document.getElementById("templateZoomOut").onclick = function(){

    templateMap.zoomOut(0.1);
};
document.getElementById("exportTemplatePdf").onclick = exportTemplatePDF;

function exportTemplatePDF(){

    const overlay = document.getElementById("mapOverlay");

    overlay.classList.remove("selected");

    templateMap.invalidateSize();

setTimeout(function(){

    captureTemplate();

},300);
}
function captureTemplate(){

    html2canvas(
        document.getElementById("templateCanvas"),
        {
            scale:3,
            useCORS:true
        }
    ).then(function(canvas){

        createPDF(canvas);

    });

}
function createPDF(canvas){

    const pdf = new jspdf.jsPDF({

        orientation:"landscape",

        unit:"mm",

        format:"a3"

    });

    const img = canvas.toDataURL("image/png");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(

        img,

        "PNG",

        0,

        0,

        pageWidth,

        pageHeight

    );

    pdf.save("Ward_Map.pdf");

}

if ("serviceWorker" in navigator) {

    navigator.serviceWorker.register("sw.js")

    .then(function(reg){

        console.log("Service Worker Registered");

    })

    .catch(function(error){

        console.log(error);

    });

}