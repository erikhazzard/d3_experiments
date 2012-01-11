/* ========================================================================    
 *
 * generate_map.js
 * ----------------------
 *
 * Function definition to generate the actual map
 *
 * ======================================================================== */
MAP_GEN.functions.generate_map = function( map_data ){
    //If no data object was passed in, use the MAP_GEN._data object
    if(map_data === undefined){
        //Store local reference to map data
        var map_data = MAP_GEN._data;
    }

    //Empty the map div each time this function gets called
    $('#map').empty();
    
    //Setup the D3 Treemap.  We'll use the treemap layout, but modify the
    //  generated shapes to look like continents / countries
    var w = document.getElementById('map').offsetWidth;
    var h = document.getElementById('map').offsetHeight;
    var color = d3.scale.category20c();
    var coords = [];
    var use_rect = false;

    var treemap = d3.layout.treemap()
        .padding(4)
        .size([w, h])
        .value(function(d) { return d.size; });

    var svg = d3.select("#map")
        .append("svg:svg")
        .attr("width", w)
        .attr("height", h)
        .append("svg:g")

    //Create a 'cell to hold each 'continent' in the treemap
    var cell = svg.data([map_data]).selectAll("g")
        .data(treemap)
        .enter().append("svg:g")
        .attr("class", "cell")
        .attr("transform", function(d) { 
            if(d.parent !== undefined){
                var scaling_constant = Math.random() * 20;
            }else{
                var scaling_constant = 0;
            }
            var transform_string = '';

            if(d.children){
                transform_string = "translate(" 
                    + d.x + ',' + d.y + ')';
                    //+ (d.x + scaling_constant) + "," 
                    //+ (d.y + scaling_constant) + ")"; 
            }else{
                transform_string = "translate(" 
                    + d.x + ',' + d.y + ')';
                    //+ (d.x + scaling_constant) + "," 
                    //+ (d.y + scaling_constant) + ")"; 
            }
            return transform_string;
            if(use_rect === true){
                return transform_string;
            }else{
                return '';
            }
        });

    //Create a polyline for each item.  It will be like a rect,
    //  but contain random points betwen the bounding box
    cell.append("svg:polyline")
        //Set a stroke width, stronger for continents
        .attr('stroke-width', function(d){
            return d.children ? '10' : '5';
        })
        .attr('points', function(d){
            if(d.parent === undefined){
                //If this is the parent node, don't draw lines
                return '';
            }


            //Return list of points based on coordinates
            //Start in top left
            coords = [
                //[d.x, d.y]
            ]

            //TODO: Don't let loop go over dx
            var num_iterations = 25;
            var dx_step = (d.dx - d.x) / (num_iterations * 1.0);
            var dy_step = (d.dy - d.y) / (num_iterations * 1.0);


            function random_step(coord, random_num){
                //return coord
                return Math.round(coord + ( (random_num * 10) - 5) );
            }
            
            //Get coords from (x,y) to (dx, y)
            for(var i=0; i<num_iterations; i++){
                coords.push([
                    //Constant x
                    (d.x + dx_step * i),
                    //Random y
                    random_step(d.y, Math.random())
                ])
            }

            //Get coords from (dx,y) to (dx, dy)
            for(var i=num_iterations; i>=0; i--){
                coords.push([
                    //Random x
                    random_step(d.dx, Math.random()),
                    //Constant y
                    (d.dy - (dy_step * i))
                ])
            }

            //Get coords from (dx,dy) to (x, dy)
            for(var i=num_iterations; i>=0; i--){
                coords.push([
                    //Constant x
                    (d.x + dx_step * i),
                    //Random y
                    random_step(d.dy, Math.random())
                ])
            }

            //Get coords from (x,dy) to (x, y)
            for(var i=num_iterations; i>=0; i--){
                coords.push([
                    //Random x
                    random_step(d.x, Math.random()),
                    //Constant y
                    (d.y + dy_step * i)
                ])
            }
            return coords.join(' ');

        })
        //Give it some style
        .style("fill", function(d) { 
            if(d.parent === undefined){
                //If node does not have parent, it's the top node,
                //  so give it a blue water color
                return '#336699';
            }
            return d.children ? '#968144' : '#AD903E'; 
            //return d.children ? color(d.data.name) : null; 
          })
        .style('stroke','#232323')
        .style('stroke-width', '3px');

    //Create a rect for each item
    if(use_rect == true){
        cell.append("svg:rect")
            .attr("width", function(d) { return d.dx; })
            .attr("height", function(d) { return d.dy; })
            .attr("opacity", 1)
            .style("fill", function(d) { 
                if(d.parent === undefined){
                    //If node does not have parent, it's the top node,
                    //  so give it a blue water color
                    return '#336699';
                }
                return d.children ? '#968144' : '#AD903E'; 
                //return d.children ? color(d.data.name) : null; 
              })
    }

    //Draw text
    cell.append("svg:text")
        .attr("x", function(d) { return d.dx / 2; })
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.children ? null : d.data.name; });

}
