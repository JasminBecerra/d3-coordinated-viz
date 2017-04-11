// main js file


//anonymous function to move variables to local scope
(function(){

//pseudo-global variables
var attrArray = ["HardshipIndex", "PercentAged16Unemployed", "PercentAged25WithoutHighSchoolDiploma", "PercentAgedUnder18orover64", "PercentHouseholdsBelowPoverty", "PercentofHousingCrowded"]; 
//removed "PerCapitaIncome",  between hardship index and unemployment, need to figure out how to change axis later

//list of attributes up there
var expressed = attrArray[0]; //initial attribute

//chart dimensions
var chartWidth = window.innerWidth * 0.56,
    chartHeight = 590;
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 3,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create scale to size bars proportionally to frame
var yScale = d3.scaleLinear()
    .range([590, 0])
    .domain([0, 100]);

//////IGNORE: this was used for the radius scale-- after final lab is due, I 
//////plan on coming back and figuring out how to fully implement the bubble chart
////my only porblem was updating the bubbles
// //scale the radius for each circle NOW A GLOBAL VARIABLE
// var radiusScale = d3.scaleSqrt()
//     .range([5, 45])
//     .domain([0, chartHeight/2]);

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = window.innerWidth * 0.38,
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
        .rotate([87.75, 0, 0])
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
        var csvKey = csvRegion.community.replace(/ /g, '_'); //the CSV primary key = community
        // *****for every occurence of the "community" key, all spaces between individual key names must be replaced!!!!!

        //loop through geojson regions to find correct region
        for (var a=0; a<chicagoCommunities.length; a++){

            var geojsonProps = chicagoCommunities[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.community.replace(/ /g, '_'); //the geojson primary key

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
                return "communities " + d.properties.community.replace(/ /g, '_');
            })
            .attr("d", path)
        //     .style("fill", function(d){
        //     return colorScale(d.properties[expressed]);
        // })
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            //highlights when you mouse over a community or bar
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            //closes out the highlight
            .on("mouseout", function(d){
            dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        var desc = communities.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');


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

//moved up here
//function to create coordinated vis -- bubble chart (EDIT: going with the bar chart instead)
function setChart(csvData, colorScale){
    // //chart dimensions
    // var chartWidth = window.innerWidth * 0.56,
    //     chartHeight = 590;
    //     leftPadding = 25,
    //     rightPadding = 2,
    //     topBottomPadding = 3,
    //     chartInnerWidth = chartWidth - leftPadding - rightPadding,
    //     chartInnerHeight = chartHeight - topBottomPadding * 2,
    //     translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

// svg for bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");


    var chartBckgrnd = chart.append("rect")
        .attr("class", "chartBckgrnd")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", translate);


    // //create scale to size bars proportionally to frame
    // var yScale = d3.scaleLinear()
    //     .range([590, 0])
    //     .domain([0, 100]);

    //set bars for each chicago neighborhood/community
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed] - a[expressed]
            //sorts from tallest to shortest/ largest to smallest
        })
        .attr("class", function(d){
            return "bar " + d.community.replace(/ /g, '_');
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        // .attr("x", function(d, i){
        //     return i * (chartInnerWidth / csvData.length) + leftPadding;
        // })
        // .attr("height", function(d, i){
        //     return 590 - yScale(parseFloat(d[expressed]));
        // })
        // .attr("y", function(d, i){
        //     return yScale(parseFloat(d[expressed])) + topBottomPadding;
        // })
        // .style("fill", function(d){
        //     return choropleth(d, colorScale);
        // });

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
        .attr("x", 70)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text(expressed + " in each Chicago Community");

    //vertical axis
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place vertical axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for the chart
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", translate);


    updateChart(bars, csvData.length, colorScale);

};
// end of setChart function


//moved here
//update the chart
//changed csvData.length to n in paramters
function updateChart(bars, n, colorScale){
    //position the bars on chart
    bars.attr("x", function(d, i){
        return i * (chartInnerWidth / n) + leftPadding;
    })
    //resize the height of bars/size of bars
    .attr("height", function(d, i){
        return 590 - yScale(parseFloat(d[expressed]));
    })
    .attr("y", function(d, i){
        return yScale(parseFloat(d[expressed])) + topBottomPadding;
    })
    //update the color based on choropleth color scale
    .style("fill", function(d){
        return choropleth(d, colorScale);
    });

    var chartTitle = d3.select(".chartTitle")
        .text(expressed + " in each Chicago Community");
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
//^

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
        .transition()
        .duration(1000)
        .style("fill", function(d){

            return choropleth(d.properties, colorScale)
        });


    //resize, re-sort,and recolor the bars in graph
    var bars = d3.selectAll(".bar")
        //sorting
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        //adds the transition animation
        .transition()
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);

    //call updateChart function
    updateChart(bars, csvData.length, colorScale);

        // .sort(function(d, i){
        //     return i* (chartInnerWidth / csvData.length) + leftPadding;
        // })
        // //resize the bars
        // .attr("x", function(d, i){
        //     return 590 - yScale(parseFloat(d[expressed]));
        // })
        // .attr("y", function(d, i){
        //     return yScale(parseFloat(d[expressed])) + topBottomPadding;
        // })
        // //recolor bars with choropleth color scale
        // .style("fill", function(d){
        //     return choropleth(d, colorScale);
        // });


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
//end of changeAttribute function


//function to highlight chicago neighborhoods and bars
function highlight(props){
    // var name = props.area_num_1
    //change stroke
    var selected = d3.selectAll("." + props.community.replace(/ /g, '_'))
        .style("stroke", "#F9AA4B")
        .style("stroke-width", "2.5");

    setLabel(props);


        // // //check highlight
        // console.log(props);
};

//to dehighlight the map and bar elements
function dehighlight(props){
    var selected = d3.selectAll("." + props.community.replace(/ /g, '_'))
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    //selects all the neighborhoods selected
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };

    //remove info label
    d3.select(".infolabel")
        .remove();

};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + props.community + "</b>";
        //changed so that label includes neighborhood name.

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.community.replace(/ /g, '_') + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};

//function to move info label with mouse
function moveLabel(){

    // get the label width
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //user coords of moving mouse event to set label coords
    var x1 = d3.event.clientX +10,
        y1 = d3.event.clientY -75,
        x2 = d3.event.clientX - labelWidth -10,
        y2 = d3.event.clientY +25;

    // //use coordinates of mousemove event to set label coordinates
    // var x = d3.event.clientX + 10,
    //     y = d3.event.clientY - 75;

    //horiz. label coord, overflow testing
    var x = d3.event.clientX > window.innerWidth - labelWidth -20 ? x2 : x1;
    //vert label coord, overflow testing
    var y = d3.event.clientY <75 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};



})(); //last line of main.js
