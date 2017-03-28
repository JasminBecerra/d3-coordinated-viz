// main js file

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
	//actualmap dimensions (w = width, h = height)
	var w = 1000, 
        h = 500;

	//container for map
	var actualmap = d3.select("body")
		.append("svg")
		.attr("class", "actualmap")
		.attr("width", w)
		.attr("height", h);

	//create Albers equal area conic projection centered on Chicago (used the UW Cart demo)
    var projection = d3.geoAlbers() // try geo.albers
		.center([10.92, 48.16])
		.rotate([99.20, 7.29, 0])
		.parallels([41.79, 41.88])
		.scale(5000.00)
		.translate([w / 2, h / 2]);

	//create path generator for actualmap
	var path = d3.geoPath()
    	.projection(projection);


    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/ChicagoSocioEconData.csv") //load attributes from csv
        .defer(d3.json, "data/chicagoNeighborhoods.topojson") //load spatial data for choropleth map
        .await(callback); //send data to callback function

    function callback(error, csvData, chicago){
    	//translate chicago comm areas to topojson
    	var chicagoNeighborhoods = topojson.feature(chicago, chicago.objects.chicagoNeighorhoods).features;
        
        var comms = actualmap.append("path")
        	.data(chicagoNeighborhoods)
        	.enter()
        	.append("path")
        	.attr("class", function(d){
                return "regions " + d.properties.adm1_code;
            })
            .attr("d", path);
    	// check
        console.log(error);
        console.log(csvData);
        console.log(chicago);
    };

};
