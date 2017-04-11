// main js file


//anonymous function to move variables to local scope
(function(){

//pseudo-global variables
var attrArray = ["HardshipIndex", "PerCapitaIncome", "PercentAged16Unemployed", "PercentAged25WithoutHighSchoolDiploma", "PercentAgedUnder18orover64", "PercentHouseholdsBelowPoverty", "PercentofHousingCrowded"]; 
//list of attributes up there
var expressed = attrArray[0]; //initial attribute


// //chart frame dimensions
// var chartWidth = window.innerWidth * 0.4,
//     chartHeight = 590;
//     leftPadding = 25,
//     rightPadding = 2,
//     topBottomPadding = 4,
//     chartInnerWidth = chartWidth - leftPadding - rightPadding,
//     chartInnerHeight = chartHeight - topBottomPadding * 2,
//     translate = "translate(" + leftPadding + "," + topBottomPadding + ")";



// //scale the radius for each circle NOW A GLOBAL VARIABLE
// var radiusScale = d3.scaleSqrt()
//     .range([5, 45])
//     .domain([0, chartHeight/2]);

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = window.innerWidth * 0.42,
        height = 590;

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

        //add coordinated vis to the map
        setChart(csvData, colorScale);

        createDropdown(csvData);


        // // add coord. vis bubble chart to actualmap
        // setBubbleChart(csvData, colorScale);

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



//function to create a dropdown menu for attr selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData);
        });


    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });

    // console.log(attrOptions);
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    //check
    // console.log(expressed);

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var communities = d3.selectAll(".communities")
        .style("fill", function(d){

            return choropleth(d.properties, colorScale)
        });



    // //simulation for where circles should go + interact (moving them to the middle of chart)
    // var simulation = d3.forceSimulation()
    //     .force("x", d3.forceX(chartWidth /2).strength(0.05))
    //     .force("y", d3.forceY(chartHeight/2).strength(0.05))
    //     //keep them from overlapping!
    //     .force("collide", d3.forceCollide(function(d){
    //         return radiusScale(parseFloat(d[expressed]))+4;
    //     }))

    // //pushes bubbles
    // simulation.nodes(csvData)
    //     .on('tick', ticked);

    // //pushes the bubbles and labels away from the top left corner and to the center
    // function ticked(){
    //     circles
    //         .attr("cx", function(d){
    //             return d.x
    //         })
    //         .attr("cy", function(d){
    //             return d.y;
    //         })
    // }

    // //re-sort, resize, and recolor bars
    // var circles = d3.selectAll(".circles")
    //     // // re-sort bars
    //     // .sort(function(a, b){
    //     //     return b[expressed] - a[expressed];
    //     // })
    //     .attr("r", function(d){
    //         return radiusScale(parseFloat(d[expressed]));
    //         //uses attribute value to scale the radius of ea. circle
    //     })
    //     .style("fill", function(d){
    //         return choropleth(d, colorScale);
    //         //use color scale from choropleth for bubbles
    //     })
    //     .attr('stroke', '#000')
    //     .attr('stroke-width', '0.5px')
    //     .on("click", function(d){
    //         console.log(d[expressed])
    //     });
};



//function to create coordinated vis -- bubble chart (EDIT: going with the bar chart instead)
function setChart(csvData, colorScale){
    //chart dimensions
    var chartWidth = window.innerWidth * 0.53,
        chartHeight = 590;
        leftPadding = 2,
        rightPadding = 2,
        topBottomPadding = 2,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";


    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");


    var chartBckgrnd = chart.append("rect")
        .attr("class", "chartBckgrnd")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);


    //create scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([0, chartHeight])
        .domain([0, 105]);

    //set bars for each chicago neighborhood/community
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed] - a[expressed]
            //sorts from tallest to shortest/ largest to smallest
        })
        .attr("class", function(d){
            return "bars " + d.area_num_1;
        })
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / csvData.length);
        })
        .attr("height", function(d, i){
            return 590 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

//don't need this since i'll have a labeled axis
    //     //annotate bars with attribute value text
    // var numbers = chart.selectAll(".numbers")
    //     .data(csvData)
    //     .enter()
    //     .append("text")
    //     .sort(function(a, b){
    //         return a[expressed]-b[expressed]
    //     })
    //     .attr("class", function(d){
    //         return "numbers " + d.area_num_1;
    //     })
    //     .attr("text-anchor", "middle")
    //     .attr("x", function(d, i){
    //         var fraction = chartWidth / csvData.length;
    //         return i * fraction + (fraction - 1) / 2;
    //     })
    //     .attr("y", function(d){
    //         return chartHeight - yScale(parseFloat(d[expressed])) + 15;
    //     })
    //     .text(function(d){
    //         return d[expressed];
    //     });

    //text element for bar graph/chart title
    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text( expressed + " in each community");

    //vertical axis
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place the veritcal axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

};




})(); //last line of main.js
