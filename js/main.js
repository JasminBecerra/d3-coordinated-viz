// main js file

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
	//actualmap dimensions
	var w = 1000, h = 500;

	//container for map
	var actualmap = d3.select("body")
		.append("svg")
		.attr("class", "actualmap")
		.attr("width", w)
		.attr("height", h);

		


    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/ChicagoSocioEconData.csv") //load attributes from csv
        .defer(d3.json, "data/ChicagoComm6P.topojson") //load spatial data for choropleth map
        .await(callback); //send data to callback function

    function callback(error, csvData, chicago){
    	//translate chicago comm areas to topojson
    	var chicagoComm6p = topojson.feature(chicago, chicago.objects.ChicagoComm6P).features;
        
    	//check
        // console.log(error);
        console.log(csvData);
        console.log(chicago);
    };
};


