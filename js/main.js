//begin script when window loads
(function(){
    
    
    
    //"global" variables for the data join
    var attrArray = ["geoID","spirits_gal", "wine_gal", "beer_gal", "spirits_AA", "wine_AA", "beer_AA", "pop_21", "craft_distill", "craft_beer", "spirits_tax" , "wine_tax", "beer_tax", "spirits_gal_per", "wine_gal_per", "beer_gal_per", "total_aa_per_cap"];
    
    var expressed = attrArray[13];
    
    
    var chartWidth = 200;
    var chartHeight = 650;
    var colorScale;

    var chart = d3.select(".chartDiv")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    
    window.onload = setMap();
    
    //set up choropleth map
    function setMap(){
        
        
        //map frame dimensions
        var width = 700,
            height = 500;

        var map = d3.select(".mapDiv")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create projection
        var projection = d3.geoAlbersUsa().scale(width).translate([width/2.7, height/2.5]);

        //create path generator
        var path = d3.geoPath()
            .projection(projection);

        //use promises to load data
        Promise.all([
            d3.json("data/states.topojson"),
            d3.csv("data/data.csv")])
            .then(function(data) {
                //convert topojson to features
                var USstates = topojson.feature(data[0], data[0].objects.states).features;
                var csvLoaded = data[1];
                
                colorScale = makeColorScale(csvLoaded);
                setChart(csvLoaded, colorScale);
             //   scatterplot(csvLoaded);
            
                //loop through the csv to assign each set of the csv 
                for(var i=0; i<data[1].length; i++){
                    var csvState = data[1][i];
                    var csvID = csvState.GEOID;

                    for(var a=0; a<USstates.length; a++){

                        var geojsonProps = USstates[a].properties;
                        var geojsonID = geojsonProps.GEOID;

                        if (geojsonID == csvID){
                            attrArray.forEach(function(attr){
                                var val = parseFloat(csvState[attr]).toFixed(2);
                                geojsonProps[attr] = val;
                            })

                        };

                    };
                };
            
                
            
                
                //draw our features with our path generator
                var states = map.selectAll(".states")
                    .data(USstates)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("class", function(d){ return "states geoID" + d.properties.GEOID;} )
                    .style("fill", function(d){
                        //console.log(d.properties[expressed]);
                        return colorScale(d.properties[expressed])})
                    .on("mouseover", function(d){highlight(d.properties)})
                    .on("mouseout", function(d){dehighlight(d.properties, colorScale)})
                    .on("mousemove", moveLabel);
            
                //add white boundaries
                var boundaries = topojson.mesh(data[0], data[0].objects.states, (a, b) => a !== b);
                map.append("path")
                    .datum(boundaries)
                    .attr("fill", "none")
                    .attr("stroke", "white")
                    .attr("stroke-linejoin", "round")
                    .attr("d", path);

                //change map with radio buttons        
                const buttons = d3.selectAll('input');
                buttons.on('change', function(d){
                    console.log('button changed to ' + this.value)
                    changeAttribute(this.value, csvLoaded);
                });
            
             //   //resize map with window resize
              //  d3.select(window)
                //    .on("resize", sizeChange);


        });
    }
    
    function makeColorScale(data){
        var colorClasses = ["#f0f9e8", "#bae4bc", "#7bccc4","#43a2ca", "#0868ac"];
        
        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);
           
        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function(d) { return +d[expressed]}),
            d3.max(data, function(d) { return +d[expressed]})
        ];
        
        //assign two-value array as scale domain
        colorScale.domain(minmax);
        console.log(colorScale.quantiles());
        console.log(d3.max(data, function(d) { return +d[expressed]; }));
        return colorScale;
    };
    
    
    //function for updating map when radio button selections are changed
    function changeAttribute(attribute, csvData)
    {
        //change the expressed attribute
        expressed = attribute;
        console.log("attribute is now" + attribute);
    
        
        //recreate the color scale
        colorScale = makeColorScale(csvData);
        
        var t = d3.transition()
            .duration(500);
        
        //recolor the enumeration districts
        var states = d3.selectAll(".states").transition(t)
            .style("fill", function(d){
                        return colorScale(d.properties[expressed])});
        
        var max = d3.max(csvData, function(d){return +d[expressed]});
        var xScale = d3.scaleLinear()
            .range([0, chartWidth])
            .domain([0, max]);
        
        //resort, resize and recolor bars
        var bars = d3.selectAll(".bars")
            .sort(function(a,b){
                return d3.descending(+a[expressed], +b[expressed]);})
            .transition(t)
            .attr("y", function(d, i){return i * (chartHeight/csvData.length);})
            .attr("height", chartHeight/csvData.length - 1)
            .attr("width", function(d){return xScale(+d[expressed])})
            .style("fill", function(d){return colorScale(+d[expressed]);})
            ;
            
        
        var numbers = d3.selectAll(".numbers")
            .sort(function(a,b){
                return d3.descending(a[expressed], +b[expressed]);})
            .text(function(d){return d[expressed]});
        
    }
    
  
    //function for highlighting
    function highlight(props){
        //change stroke
        var selected = d3.selectAll(".geoID" + props.GEOID)
            .style("fill", "yellow");
        setLabel(props);
        pieChart(props);
            
    }
    
    //function for dehighlighting
    function dehighlight(props){
        var mapSelection = d3.selectAll(".states.geoID" + props.GEOID)
            .style("fill", colorScale(props[expressed]));
        var barSelection = d3.selectAll(".bars.geoID" + props.GEOID)
            .style("fill", mapSelection.style("fill"));
         d3.select(".infolabel")
            .remove();
        d3.select(".pie")
            .remove();
        d3.selectAll(".scatter.geoID" + props.GEOID)
            .style("fill", "black")
    }
    
  
    //function for changing map size
    function sizeChange(){
        
        scale = window.innerWidth * .8;

        translate = [scale/2.3, 500];
       
            
        d3.selectAll("svg")
            .attr("transform",  "scale(" + scale/650 + ")")
            .attr("translate", "[" + scale + "," + scale +"]");
	}
    
    //function set chart
    function setChart(csvData, colorScale){
        
        var max = d3.max(csvData, function(d){return +d[expressed]});
 
        var xScale = d3.scaleLinear()
            .range([0, chartWidth])
            .domain([0, max]);
     
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .attr("class", function(d){
                                    return "bars geoID" + d.GEOID;
                                      })
            .sort(function(a,b){
                return d3.descending(+a[expressed], +b[expressed]);})
            //.attr("x", function(d){
                //return xScale(parseFloat(d[expressed]/d["pop_21"]));
               // })
            .attr("y", function(d, i){return i * (chartHeight/csvData.length);})
            .attr("height", chartHeight/csvData.length - 1)
            .attr("width", function(d){return xScale(+d[expressed])})
            .style("fill", function(d){return colorScale(+d[expressed]);})
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);
            
        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a,b){
                return d3.descending(+a[expressed], +b[expressed]);})
            .attr("class", function(d){return "numbers " + d.GEOID;})
            .attr("text-anchor", "middle")
            .attr("x", 15)
            .attr("y", function(d, i){
                var fraction = chartHeight / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .text(function(d){
                return d[expressed];});
            
    }
    
    //function to create dynamic label
    function setLabel(props){
        
        //label content
        var split = expressed.split("_", 1);
        var labelAttribute = "<h4>" + props[expressed] + " gallons of " + split + "</h4>";
        
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.expressed + "_label")
            .html(labelAttribute);
        
        var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.NAME);
        
    }
    
    //function to create pie chart for each state in pop up
    function pieChart(props){
        var w = 120;
        var h = 120;
        var r = h/2;
        
        var newColor = d3.scaleOrdinal()
            .domain(["spirits", "wine", "beer"])
            .range(d3.schemeBlues[3]);
        
        newLabels = newColor.domain();
        
        var pieData = [props.spirits_AA, props.wine_AA, props.beer_AA];
        
        var pied = d3.pie();
        var data = pied(pieData);
        
        var arc = d3.arc()
            .outerRadius(r)
            .innerRadius(0);
        
        var pie = d3.select(".mapDiv")
            .append("svg")
            .attr("class", "pie");
        
        var labels = pie.append("g")
            .attr("class", "labels");
        
        var arcs = pie.selectAll("g.arc")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "arc")
            .attr("transform", "translate(" + r + "," + r + ")");
        
        arcs.append("path")
            .attr("fill", function(d, i){return newColor(i)})
            .attr("d", arc);
        
        arcs.append("text")
            .attr("transform", function(d){return "translate(" + arc.centroid(d) + ")";})
            .attr("text-anchor", "middle")
            .text(function(d, i){return newLabels[i]});
    }
    
    function moveLabel(){
        //use coordinates of mousemove event to set label coordinates
        var x = d3.event.clientX + 10,
            y = d3.event.clientY - 75;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    
/*    //create a scatterplot
    function scatterplot(csv){
        var scatter = d3.select("body")
            .append("svg")
            .attr("width", 250)
            .attr("height", 250)
            .attr("class", "scatter");
        
        xMax = d3.max(csv, function(d){return d["craft_distill"]});
        yMax = d3.max(csv, function(d){return d["spirits_gal_per"]})
        var xScale = d3.scaleLinear()
            .domain([0, xMax])
            .range([0, 250]);
        
        var yScale = d3.scaleLinear()
            .domain([0, yMax])
            .range([250, 0])
        
        scatter.selectAll("circle")
            .data(csv)
            .enter()
            .append("circle")
            .attr("class", function(d){
                                    return "scatter geoID" + d.GEOID;
                                      })
            .attr("cx", function(d){return xScale(d.craft_distill)})
            .attr("cy", function(d){return yScale(d.spirits_gal_per)})
            .attr("r", 3);
        
        scatter.selectAll("text")
            .data(csv)
            .enter() 
            .append("text")
            .text(function(d){return "gals: " + d.spirits_gal_per + ", distills: " + d.craft_distill})
            .attr("x", function(d){return xScale(d.craft_distill)})
            .attr("y", function(d){return yScale(d.spirits_gal_per)})
    }*/

    
    
    
    
})();


