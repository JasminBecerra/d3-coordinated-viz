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
	var width = 575, 
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

        //for color scale
        var colorScale = makeColorScale(csvData);

        //add enumeration units to actualmap
        setEnumerationUnits(chicagoCommunities, actualmap, path, colorScale);


        // add coord. vis bubble chart to actualmap
        setBubbleChart(csvData, colorScale);

                    // // check
        // console.log(error);
        console.log(csvData);
        // console.log(illinois);
        console.log(chicago);
    };

}; //end of setMap()


function joinData(chicagoCommunities, csvData){
    // //variables for data join (I had to revise the original csv file because there were some spaces before every entry, so it wouldn't join initially)
    // var attrArray = ["HardshipIndex", "PerCapitaIncome", "PercentAged16Unemployed", "PercentAged25WithoutHighSchoolDiploma", "PercentAgedUnder18orover64", "PercentHouseholdsBelowPoverty", "PercentofHousingCrowded"];

    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.area_num_1; //the CSV primary key = community

        //loop through geojson regions to find correct region
        for (var a=0; a<chicagoCommunities.length; a++){

            var geojsonProps = chicagoCommunities[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.area_num_1; //the geojson primary key

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

function setEnumerationUnits(chicagoCommunities, actualmap, path, colorScale){
        //adding chicago community areas/neighborhoods to actualmap
        var communities = actualmap.selectAll(".communities")
            .data(chicagoCommunities)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "communities " + d.properties.area_num_1;
            })
            .attr("d", path)
            .style("fill", function(d){
            return colorScale(d.properties[expressed]);
        })
            .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        });


};


//func to create color scale gen
function makeColorScale(data){
    //colors for class breaks
    var colorClasses = [
        "#d0d1e6",
        "#a6bddb",
        "#67a9cf",
        "#1c9099",
        "#016c59"
    ];

    //create color scale gen
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of values (for the expressed attribute)
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create jenks natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster mins
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster mins as domain
    colorScale.domain(domainArray);

    return colorScale;
};

//function to test for data value and return color (i was getting a "cannot generate mroe classes than..." error, hope this helps!)
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};


//function to create coordinated vis -- bubble chart (EDIT: going with the bar chart instead)
function setBubbleChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.4,
        chartHeight = 550;

    //create a second svg element to hold the bar chart
    var bubblechart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "bubblechart")
        .append("g");

    //scale the radius for each circle
    var radiusScale = d3.scaleSqrt()
        .range([0, 40])
        .domain([0, chartHeight/2]);

    //simulation for where circles should go + interact (moving them to the middle of chart)
    var simulation = d3.forceSimulation()
        .force("x", d3.forceX(chartWidth /2).strength(0.05))
        .force("y", d3.forceY(chartHeight/2).strength(0.05))
        //keep them from overlapping!
        .force("collide", d3.forceCollide(function(d){
            return radiusScale(parseFloat(d[expressed]))+2;
        }))

    //create the circles for bubble chart
    var circles = bubblechart.selectAll(".circles")
        .data(csvData)
        .enter()
        .append("circle")
        .attr("class", function(d){
            return "circle " + d.area_num_1;
            //so that each circle can be identified by its community number
        })
        .attr("r", function(d){
            return radiusScale(parseFloat(d[expressed]));
            //uses attribute value to scale the radius of ea. circle
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
            //use color scale from choropleth for bubbles
        })
        .on("click", function(d){
            console.log(d)
        });


        //annotate bubbles
    var labels = bubblechart.selectAll(".labels")
        .data(csvData)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "middle")
        .text(function(d){
            return parseFloat(d[expressed]);
        });
        console.log(radiusScale);
        
    //pushes bubbles
    simulation.nodes(csvData)
        .on('tick', ticked);

    //pushes the bubbles and labels away from the top left corner and to the center
    function ticked(){
        circles
            .attr("cx", function(d){
                return d.x
            })
            .attr("cy", function(d){
                return d.y
            })
        labels
            .attr("x", function(d){
                return d.x;
            })
            .attr("y", function(d){
                return d.y;
            });
    }


    var bubblechartTitle = bubblechart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "bubblechartTitle")
        .text(expressed + " in each community");



    // //annotate bubbles
    // var labels = bubblechart.selectAll(".labels")
    //     .data(csvData)
    //     .enter()
    //     .append("text")
    //     .attr("class", "labels")
    //     .attr("text-anchor", "middle")
    //     .text(function(d){
    //         return radiusScale(d[expressed]);
    //     });

        // .attr("x", function(d){
        //     return d.x;
        // })
        // .attr("y", function(d){
        //     return d.y +5;
        // })
        // .attr("text-anchor", "middle")
        // .attr("r", function(d){
        //     return radiusScale(parseFloat(d[expressed]));
        // })
        // .text(function(d){
        //     return d[expressed];
        // })


};



})(); //last line of main.js
