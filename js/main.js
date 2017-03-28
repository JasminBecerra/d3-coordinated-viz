// main js file

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
	//actualmap dimensions (w = width, h = height)
	var width = 960, 
        height = 500;

	//container for map
	var actualmap = d3.select("body")
		.append("svg")
		.attr("class", "actualmap")
		.attr("width", width)
		.attr("height", height);

	//create Albers equal area conic projection centered on Chicago (used the UW Cart demo)
    // try geo.albers or geoAlbers
    var projection = d3.geoAlbers()
        .center([0, 41.8])
        .rotate([92, 0, 0])
        .parallels([41.79, 41.88])
        .scale(5000.00)
        .translate(width / 2, height / 2]);

	//create path generator for actualmap
	var path = d3.geoPath()
    	.projection(projection);


    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/ChicagoSocioEconData.csv") //load attributes from csv
        .defer(d3.json, "data/illinCounties2.topojson") //load bacground data (illinois counties)
        .defer(d3.json, "data/ChicagoNeighborhoods2.topojson") //load spatial data for choropleth map
        .await(callback); //send data to callback function

    function callback(error, csvData, illin, chicago){
        //create graticule generator
        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    	//translate chicago comm areas to topojson
    	var ilCounties = topojson.feature(illin, illin.objects.illinCounties2),
            chicagoNeighborhoods1 = topojson.feature(chicago, chicago.objects.ChicagoNeighorhoods1).features;
        
        //ading the illinois counties to actualmap
        var counties = actualmap.append("path")
            .datum(ilCounties)
            .attr("class", "counties")
            .attr("d", path);

        //adding chicago community areas/neighborhoods to actualmap
        var communities = actualmap.selectAll(".communities")
            .data(chicagoNeighborhoods1)
            .enter()
            .append("path")
            .attr("class", function(d){
                return d.properties.community;
            })
            .attr("d", path);


    	// // check
     //    console.log(error);
     //    console.log(csvData);
     //    console.log(chicago);
    };

};
