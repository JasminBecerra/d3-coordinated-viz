// main js file

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/ChicagoSocioEconData.csv") //load attributes from csv
        .defer(d3.json, "data/ChicagoComm6P.topojson") //load background spatial data
        .await(callback);
};'