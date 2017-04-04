// main js file


//anonymous function to move variables to local scope
(function(){

//pseudo-global variables
var attrArray = ["HardshipIndex", "PerCapitaIncome", "PercentAged16Unemployed", "PercentAged25WithoutHighSchoolDiploma", "PercentAgedUnder18orover64", "PercentHouseholdsBelowPoverty", "PercentofHousingCrowded"]; 
//list of attributes up there
var expressed = attrArray[0]; //initial attribute


//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
	//actualmap dimensions (w = width, h = height)
	var width = 800, 
        height = 550;

	//container for map
	var actualmap = d3.select("body")
		.append("svg")
		.attr("class", "actualmap")
		.attr("width", width)
		.attr("height", height);

	//create Albers equal area conic projection centered on Chicago (used the UW Cart demo)
    // try geo.albers or geoAlbers
    var projection = d3.geoAlbers()
        .center([0, 41.835])
        .rotate([87.7, 0, 0])
        .parallels([41.79, 41.88])
        .scale(80000.00)
        .translate([width / 2, height / 2]);

	//create path generator for actualmap
	var path = d3.geoPath()
    	.projection(projection);


    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/ChicagoSocioEconData3.csv") //load attributes from csv
        .defer(d3.json, "data/illinCounties3.topojson") //load bacground data (illinois counties)
        .defer(d3.json, "data/ChicagoCommunities.topojson") //load spatial data for choropleth map
        // .defer(d3.json, "data/lakemich.topojson") //load lake background lake michigan data
        .await(callback); //send data to callback function


//function to populate the dom with topojson data
    function callback(error, csvData, illinois, chicago){
        //*ignore* graticule doesn't make much sense for the scale at which I'm mapping
        // //create graticule generator
        // var graticule = d3.geoGraticule()
        //     .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    	//translate chicago comm areas to topojson
    	var illinCounties = topojson.feature(illinois, illinois.objects.illinCounties3),
            chicagoCommunities = topojson.feature(chicago, chicago.objects.ChicagoCommunities).features;


        //ading the illinois counties to actualmap
        var counties = actualmap.append("path")
            .datum(illinCounties)
            .attr("class", "counties")
            .attr("d", path);

        //join csv data to GeoJSON enumeration units
        chicagoCommunities = joinData(chicagoCommunities, csvData);

        //add enumeration units to the map
        setEnumerationUnits(chicagoCommunities, actualmap, path);

                    // // check
        // console.log(error);
        console.log(csvData);
        // console.log(illinois);
        console.log(chicago);
    };

}; //end of setMap()


function joinData(chicagoCommunities, csvData){
    //variables for data join (I had to revise the original csv file because there were some spaces before every entry, so it wouldn't join initially)
    var attrArray = ["HardshipIndex", "PerCapitaIncome", "PercentAged16Unemployed", "PercentAged25WithoutHighSchoolDiploma", "PercentAgedUnder18orover64", "PercentHouseholdsBelowPoverty", "PercentofHousingCrowded"];

    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.community; //the CSV primary key = community

        //loop through geojson regions to find correct region
        for (var a=0; a<chicagoCommunities.length; a++){

            var geojsonProps = chicagoCommunities[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.community; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assigning attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
    return chicagoCommunities;

};

function setEnumerationUnits(chicagoCommunities, actualmap, path){
        //adding chicago community areas/neighborhoods to actualmap
        var communities = actualmap.selectAll(".communities")
            .data(chicagoCommunities)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "communities " + d.properties.community;
            })
            .attr("d", path);


};


})(); //last line of main.js
