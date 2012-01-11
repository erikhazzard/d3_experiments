/* ========================================================================    
 *
 * map.js
 * ----------------------
 *
 * Function definition to generate the actual map
 *
 * TODO: Scaling countries
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
    //Reset the flag that keeps track if a convex hull has been created
    //  for the continent
    MAP_GEN.map_params.continent_convex_hull_func_called = false;

    //Get width and height of the svg element
    var h = $('#map')[0].offsetHeight;
    var w = $('#map')[0].offsetWidth;

    //-----------------------------------
    //Create nodes for each continent. These are static nodes which
    //  country nodes will go to
    //-----------------------------------
    //Get the number of continents 
    var num_continents = MAP_GEN._data.children.length;
    //And colors for the cirlces
    var color = d3.scale.category10();

    //Show a status update
    MAP_GEN.functions.console_log('Creating treemap');

    //How big to scale the country circles.  Smaller scale = larger circles
    var force_diagram_country_scale = MAP_GEN.config.force_diagram_country_scale;

    //-----------------------------------
    //TREEMAP
    //
    //Get Treemap of data so we know starting positions for continents
    //-----------------------------------
    var treemap = d3.layout.treemap()
        .size([w, h])
        .value(function(d) { return d.size; });

    //Select and setup the svg element 
    var svg = d3.select("#treemap_hidden").append("svg:svg")
        .attr("width", w)
        .attr("height", h)
        .append("svg:g")
            .attr("transform", "translate(-.5,-.5)");

    //Store reference to cells 
    MAP_GEN.treemap_cells = []; 

    //Create a cell for each treemap element
    var cell = svg.data([MAP_GEN._data]).selectAll("g")
        .data(treemap)
        .enter().append("svg:g")
            .attr("class", "cell")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

    cell.append("svg:rect")
        .attr("width", function(d) { return d.dx; })
        .attr("height", function(d) { return d.dy; })
        .style("fill", function(d) { 
            //TODO: Do this the right way....
            if(d.children && d.parent !== undefined){
                MAP_GEN.treemap_cells.push(d);
            }
            return d.children ? color(d.data.name) : null; }
        );

    //-----------------------------------
    //FORCE CHART
    //
    //Create force chart to lay out continents
    //
    //-----------------------------------
    //Show a status update
    MAP_GEN.functions.console_log('Creating force chart');
    //Create nodes for continents
    var nodes = d3.range(num_continents).map(function(i) {
        //Store reference to current cell
        var cur_cell = MAP_GEN.treemap_cells[i];

        //Set a random y factor
        //  Don't place it too far above or below the center
        if(cur_cell.y < (h/2.5)){
            var random_factor_y = (Math.random() * 20) * -1;
        }else{
            var random_factor_y = (Math.random() * 100); 
        }

        //Set random x factor
        var random_factor_x = (Math.random() * 70);

        //====================================================================
        //Initial continent center points
        //====================================================================
        return {
            //type: Math.random() * num_continents | 0,
            radius: 0,
            fixed:true,
            //Type is from 0 to n, where n is the number of
            //  continents
            type:i,
            
            //Randomize: TODO? Improve randomization
            //x: Math.random() * w,
            //y: Math.random() * h
            
            //Set x,y to the tree map position
            //  Base in center of treemap, but randomize a bit
            x: (cur_cell.x + (cur_cell.dx / 2)), //+ random_factor_x,
            y: (cur_cell.y + (cur_cell.dy / 2)) //+ random_factor_y
        };
    });

    //Setup force
    var force = d3.layout.force()
        .gravity(0)
        .charge(0)
        .nodes(nodes)
        .size([w, h]);

    force.start();

    //Create SVG element
    svg = d3.select("#map").append("svg:svg")
        .attr("width", w)
        .attr("height", h);

    //Store a reference to the svg
    MAP_GEN._svg = svg;

    //Add in circles for each continent
    var country_circles_group = MAP_GEN._svg.append('svg:g')
        .attr('id', 'country_circles_group');
    country_circles_group.selectAll("circle")
        .data(nodes)
        .enter().append("svg:circle")
            .attr("r", function(d) { return d.radius; })
            .style("fill", function(d, i) { return color(d.type); });

    //-----------------------------------
    //Tick function
    //-----------------------------------
    force.on("tick", function(e) {
        //Setup some config variables
        var q = d3.geom.quadtree(nodes),
            //k determines how fast to run the force diagram
            k = e.alpha * 1.5,
            i = 0,
            n = nodes.length,
            o;

        //Run collison detection
        while (++i < n) {
            o = nodes[i];
            if (o.fixed) continue;
            c = nodes[o.type];
            //Set position
            //o.x += (c.x - o.x) * k;
            //o.y += (c.y - o.y) * k;

            //CHECK FOR BOUNDING BOX
            o.x = Math.max(
                o.radius, Math.min(w-o.radius,
                    o.x + ((c.x - o.x) * k))
            );

            o.y = Math.max(
                o.radius, Math.min(h-o.radius,
                    o.y + ((c.y - o.y) * k))
            );

            q.visit(collide(o));
        }

        //When the force is over, trigger function to 
        //  draw convex hull
        if(e.alpha < 0.0050037){
            //Call the convex hull creation function if it hasn't been
            //  called yet
            if(MAP_GEN.map_params.continent_convex_hull_func_called === false){
                //Get x,y, and radius values for each country
                //Store a copy of the nodes
                var country_nodes = force.nodes();
                for(i in country_nodes){
                    if(country_nodes.hasOwnProperty(i)){
                        //NOTE: We DONT add the very first node, because the
                        //  first node represents the continent centroid.
                        //  We only want country centroids
                        var temp_node = country_nodes[i];
                        //See if a list for the current country's continent
                        //  exist.  If not, this is the first iteration of a
                        //  country in a continent
                        if(MAP_GEN._polygon_data[temp_node.type] === undefined){
                            MAP_GEN._polygon_data[temp_node.type] = [];
                        }
                        //The array exists by now, so add the country info
                        // Note: DON'T add it if the radius is 0, which means
                        // the node is a continent centroid.  We want only
                        // country centroids
                        if(temp_node.radius > 0){
                            MAP_GEN._polygon_data[temp_node.type].push({
                                x: temp_node.x,
                                y: temp_node.y,
                                radius: temp_node.radius
                            })
                        }
                    }
                }

                //Show a status update
                MAP_GEN.functions.console_log('Force diagram finished');

                //Setup convex hull functions
                MAP_GEN.functions.generate_continent_convex_hulls();
            }
        }

        //Move all the circles
        svg.selectAll("circle")
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    });

    //========================================================================
    //
    //Create point for each country
    //
    //========================================================================
    var x_pos = 0;
    var y_pos = 0;
    var country_radius = 0;
    for(var continent in MAP_GEN._data.children){
        if(MAP_GEN._data.children.hasOwnProperty(continent)){
            for(country in MAP_GEN._data.children[continent].children){
                if(MAP_GEN._data.children[continent].children.hasOwnProperty(
                    country)){
                    //Create points for each country
                    //TODO: Randomize position slightly
                    x_pos = MAP_GEN.treemap_cells[continent].children[ country].x 
                        + Math.random() * 1; 
                    y_pos = MAP_GEN.treemap_cells[continent].children[
                        country].y
                        + Math.random() * 1;
                    country_radius = MAP_GEN._data.children[
                        continent].children[country].percentage * (
                            //Multiply the percentage of each country by the
                            //  average viewport size ( w + h / 2), and then
                            //  divide that value so the radius isn't so big
                            //NOTE:
                            //  the last number is a scaling factor. The 
                            //  smaller the factor, the larger the country
                            //  circles will be
                            (w + (h / 2)) / force_diagram_country_scale
                        );
                    if(country_radius < 3){
                        country_radius = 3;
                    }

                    var node = {
                        //---------------
                        //SET RADIUS
                        //(Important): Set sisze of each country
                        //---------------
                        //TODO: Use some sort of log like scale to size countries
                        //  so they are still porportional, but small ones don't
                        //  get too distorted by large data
                        //Set radius based on country percentage of total data
                        radius: country_radius,
                        type: continent,
                        x: x_pos,
                        y: y_pos,
                        px: x_pos,
                        py: y_pos
                    };


                    //-------------------
                    //Draw circles for each country
                    //-------------------
                country_circles_group.append("svg:circle")
                        .data([node])
                        .attr("cx", function(d) { return d.x; })
                        .attr("cy", function(d) { return d.y; })
                        .attr("r", function(d) { return d.radius - 2; })
                        .style("fill", function(d) {return color(d.type);})
                    nodes.push(node);
                }
            }
        }
    }
    //Resume the force
    force.resume();

    //========================================================================
    //Collision function
    //========================================================================
    function collide(node) {
        var r = node.radius + 5,
          nx1 = node.x - r,
          nx2 = node.x + r,
          ny1 = node.y - r,
          ny2 = node.y + r;
      return function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== node)) {
          var x = node.x - quad.point.x,
              y = node.y - quad.point.y,
              l = Math.sqrt(x * x + y * y),
              r = node.radius + quad.point.radius;
          if (l < r) {
            l = (l - r) / l * .5;
            node.px += x * l;
            node.py += y * l;
          }
        }
        return x1 > nx2
            || x2 < nx1
            || y1 > ny2
            || y2 < ny1;
      };
    }

}
/* ========================================================================    
 *
 * generate_continent_convex_hulls()
 *
 * ======================================================================== */
MAP_GEN.functions.generate_continent_convex_hulls = function(){
    //Generate convex hulls for each continent.  The convex hull will be
    //  generated from vertices from each country.  These vertices will be
    //  generated by creating a bunch of points around the circle, using
    //  the country's center point, radius, and various angles to generate
    //  vertices
    MAP_GEN.map_params.continent_convex_hull_func_called = true;

    //Continent vertices contains the vertices for the entire continent
    //  NOTE: This is for the convex hull, which is not being used anymore
    var single_continent_vertices = [];
    //Continent_verticies will be an array of single_continent_vertices
    //NOTE: not really used yet
    var continent_vertices = [];
    var random_factor = undefined;
    var country_key = undefined;

    //IN PROGRESS NOTE: Here we're creating paths for
    //  the continent borders and the clipping.  
    //  We have one group for each.  This works OK, but 
    //  we run into issues if continents are close together then
    //  the voronoi paths will show up in continents that they
    //  shouldn't
    //
    //  So, create multiple clipping paths, one for each continent
    
    //Create another group that will draw the continent borders (the 
    //  group we created above will clip the continent polygons)
    var continent_group_border = MAP_GEN._svg.append('svg:g')
        .attr('id', 'continent_borders_group');

    //Create a group for the continent polygons
    var continent_border_polygon = MAP_GEN._svg.append('svg:g')
        .attr('id', 'continent_borders_polygon');
    
    //Create a group for EACH continent polygon
    var continent_group_clip_array = [];
    //NOTE: Because we'll be applying a clip path to EACH voronoi
    //  diagram path, we gotta make sure that we have a clip path for
    //  EACH _country_, which will be the clipping path for its parent
    //  continent
    var clip_index_count = 0;

    for(i in MAP_GEN._polygon_data){
        if(MAP_GEN._polygon_data.hasOwnProperty(i)){
            for(j in MAP_GEN._polygon_data[i]){
                if(MAP_GEN._polygon_data[i].hasOwnProperty(j)){
                    //Add a clip path for each continent group
                    continent_group_clip_array.push(
                        MAP_GEN._svg.append('svg:clipPath')
                            .attr('id', 'continent_borders_clip_'
                                + clip_index_count)
                    );
                    clip_index_count += 1;
                }
            }
        }
    }
    //Reset the clip_index_count, since we'll be using it again below
    clip_index_count = 0;

    //-----------------------------------
    //
    //Build country clip paths 
    //
    //-----------------------------------
    //Setup continent vertices based on polygon data of each country
    for(i in MAP_GEN._polygon_data){
        if(MAP_GEN._polygon_data.hasOwnProperty(i)){
            //Reset the single_continent_vertices for each continent
            //-----------------------------------
            single_continent_vertices = [];

            //Go through each country and add to single_continent_vertices
            //-----------------------------------
            for(j in MAP_GEN._polygon_data[i]){
                if(MAP_GEN._polygon_data[i].hasOwnProperty(j)){
                    //Store reference to this current country polygon
                    country_vertex = MAP_GEN._polygon_data[i][j]; 

                    //Add the current vertex to the list of hull vertices
                    c_v_x = country_vertex.x;
                    c_v_y = country_vertex.y;
                    //Setup a random factor which will allow us to create a bounding
                    //  box that doesn't look exactly like a square every time (
                    //  this is most useful for small continents which have one or
                    //  two countries)
                    random_factor = MAP_GEN.config.convex_hull_randomize_points

                    //The radius (c_v_r) determines how far out to place the
                    //  vertices for the convex hull.  The larger the radius,
                    //  the further out the convex hull will extent.  
                    //  A radius of 1 will pretty much completely cover
                    //  the entire continent, but may be 'too much' and cause
                    //  overlaps for nearby continents
                    c_v_r = country_vertex.radius / 
                        MAP_GEN.config.convex_hull_distance_factor;
                    
                    //TODO: Create multiple verties for each country
                    //TODO: Do this better, also create more vertices
                    single_continent_vertices.push([
                        (c_v_x + random_factor()) 
                            - (c_v_r + random_factor()),
                        (c_v_y + random_factor())
                            - (c_v_r + random_factor())
                    ]);
                    single_continent_vertices.push([
                        (c_v_x + random_factor()) 
                            + (c_v_r + random_factor()),
                        (c_v_y + random_factor())
                            - (c_v_r + random_factor())
                    ]);
                    single_continent_vertices.push([
                        (c_v_x + random_factor()) 
                            + (c_v_r + random_factor()),
                        (c_v_y + random_factor())
                            + (c_v_r + random_factor())
                    ]);
                    single_continent_vertices.push([
                        (c_v_x + random_factor()) 
                            - (c_v_r + random_factor()),
                        (c_v_y + random_factor())
                            + (c_v_r + random_factor())
                    ]);
                }
            }

            //========================================================================
            //Setup jagged borders based on convex hull of points created above
            //========================================================================
            //Now we've created the continent vertices, we'll need to
            //  loop each country in the continent again to set up the
            //  clip path
            for(j in MAP_GEN._polygon_data[i]){
                if(MAP_GEN._polygon_data[i].hasOwnProperty(j)){
                    //Create the clipping path using convex hull, which will 
                    // limit the voronoi diagram drawn later
                    continent_group_clip_array[clip_index_count].selectAll(
                        "path" + clip_index_count)
                        .data([d3.geom.hull(single_continent_vertices)])
                        .enter().append("svg:path")
                        .attr('id', function(d,z){
                            return 'continent_clip_path_' + z})
                        .attr('class', 'continent_clip_path')
                        .attr("d", function(d) { 
                            //Set the country key to be a combination of i 
                            // and j
                            //  i is the current continent key 
                            country_key = i;
                            return MAP_GEN.functions.generate_jagged_continent_borders(
                                d,
                                country_key);
                    });

                    //We're done with the clipping path array item, so increase
                    //  the count for it
                    clip_index_count += 1;
                }
            }


            //-----------------------------------
            //CONVEX HULL clip path and polygon
            //NOTE: This is no longer being used
            //Create Clipping Paths and Polygon
            //-----------------------------------
            /*
            //CLIPPING PATH
            //Create a convex hull based on the current continent's countries
            //Set up the clip, which will limit what the coronoi diagram shows
            continent_group_clip.selectAll("path" + i)
              .data([d3.geom.hull(single_continent_vertices)])
              .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
              .enter().append("svg:path")
                .attr('class', 'continent_clip_path')
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

            //POLYGON BORDER
            //Do it again for just the border
            continent_group_border.selectAll("path" + i)
              .data([d3.geom.hull(single_continent_vertices)])
              .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
              .enter().append("svg:path")
                .attr('class', 'continent_border_path')
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
            */

            continent_border_polygon.append("svg:path")
                .attr('id', function(d,z){
                    return 'continent_border_polygon' + z})
                .attr('class', 'continent_border_path')
                .attr("d", function(d) { 
                    //Set the country key to be a combination of i 
                    // and j
                    //  i is the current continent key 
                    country_key = i;
                    return MAP_GEN.functions.generate_jagged_continent_borders(
                        undefined,
                        country_key);
            });

            //-----------------------------------
            //Reset the continent vertices for the next iteration
            //-----------------------------------
            continent_vertices.push(single_continent_vertices);
            single_continent_vertices = [];
        }
    }


    //Hide the county circles
    d3.select('#country_circles_group').selectAll('circle').style(
        'fill', 'none');
    
    //Draw voronoi diagram
    MAP_GEN.functions.generate_voronoi_countries();
}

/* ========================================================================    
 * Generate jagged_continent_borders path string
 * ======================================================================== */
MAP_GEN.functions.generate_jagged_continent_borders = function(d, 
    country_key){
    //This function takes in an array of points (d) and returns a path
    //  string which can be used to generate paths (clipping / polygon
    //  paths)
    //It also takes in a country_key which is used to 'cache' this
    //  function.  This function will save the resulting path string
    //  in MAP_CONFIG.jagged_border_paths[country_key]
    //See if the country key was passed in and if it already exists
    if(country_key !== undefined){
        if(MAP_GEN.jagged_border_paths[country_key] !== undefined){
            //The path string already exists, so return it
            return MAP_GEN.jagged_border_paths[country_key];
        }
    }
    if(d === undefined){ return false; }

    //Country vertex contains the vertex for a single country
    var country_vectex = [];
    var random_factor = undefined;
    var jagged_step_amount = MAP_GEN.config.jagged_step_amount;
    var jaggedness_factor = MAP_GEN.config.jaggedness_factor;

    var use_x_coord = true;
    var use_y_coord = true;
    var jagged_vertex = [];

    //Use x1, x2 and y1, y2 to keep things clearer
    //  This gets set in the for loop below
    var x1 = 0;
    var x2 = 0;
    var y1 = 0;
    var y2 = 0;

    var num_iteraions = 0;
    var i_jagged = 0;

    //We have the points for the convex hull already,
    //  so let's randomize it a bit
    //reset the variable
    jagged_borders = [];

    //Loop through the continent's vertices and
    //  add them, along with intermediate points (to
    //  create the jagged effect) to the jagged_borders
    //  array
    for(k=0, d_len=d.length; k < d_len; k++){

        //Use x1, x2 and y1, y2 to keep things clearer
        x1 = d[k][0];
        y1 = d[k][1];

        //Add the current vertex to the jagged_borders
        jagged_borders.push([
            x1,
            y1
        ]);

        //If we're not at the final vertex, then add 
        //  some points in between this vertex and the
        //  next one
        //if(k==2){

        if(k + 1 < d_len){
            //Set x2 and y2 to the next vertex coords
            x2 = d[k+1][0];
            y2 = d[k+1][1];
        }else{
            //We're at the final vertex so set the next
            //  vertex to be the very first vertex of the set
            x2 = d[0][0];
            y2 = d[0][1];
        }

        
        //Get the number of iterations
        //See if the X or Y is the 'limited' dimension (whatver
        //  difference is larger, we'll use it to see how get the
        //  number of iterations)
        if(Math.abs(x1-x2) > Math.abs(y1-y2)){
            //Get the number of iterations based on the X difference
            num_iterations = (Math.abs(x1-x2) / jagged_step_amount);
        }else{
            //Same concept as above, but with X
            //Get the number of iterations based on the Y difference
            num_iterations = (Math.abs(y1-y2) / jagged_step_amount);
        }

        for(i_jagged=0;i_jagged<num_iterations;i_jagged++){
            //Add some random vertices
            // We'll do this in a loop so we can add
            // an arbitrary amount of jaggedness

            //The way this works is we add a vertex
            //  in between the current point and the
            //  next one (this doesn't happen if we're 
            //  at the last index
            //The 'in between' points will be added
            //  based on some 'step' variable (
            //  as opposed to recursively getting
            //  midpoints or something).  The step
            //  variable will be either negative
            //  or positive depending if the
            //  next continent border vertex is
            //  greater or less than the current
            //  one
            //
            //We need to see which coords need to be checked.
            //  For instance, if the coords look like
            //  (19,0) to (22,0) then we don't need to check for
            //  the y coord when we're doing the step comparisons.
            //
            //  The check uses whatever step factor that was
            //  specified above
            //
            //  If vertex A (d[k]) and vertex B (d[k+1]) form a
            //  straight line, then we only need to check for one
            //  coord dimension (check for x if the line 
            //  is horizontal, y if the line is vertical)
            //
            //  If they form a diagonal line, we need to check for
            //  BOTH
            check_x_coord = false;
            check_y_coord = false;
            //We need to keep track of if
            //  the x and y coords should be used.
            //  If the step_amount goes over the
            //  next coordinates location, we dont
            //  want to use it
            use_x_coord = true;
            use_y_coord = true;
            
            //xj is x1 + local_step_amount, which is defined in
            // the checks below (xj might be negative)       
            //Reset xj and yj to 0
            yj = 0
            xj = 0

            //By default, the jagged_vertex
            //will contain the next 
            //  point's coords
            jagged_vertex = [
                x2,
                y2
            ];
            
            //The current step amount is equal to
            //  the base step amount * the current
            //  iteration
            local_step_amount = (jagged_step_amount
                * i_jagged);

            //---------------
            //Check for use_xy_coord variables
            //---------------
            //X
            //-----------
            //Check to see if we need to make the
            //  step variable positive or negative
            if(x1 < x2){
                //Positive amount 
                //Get xj 
                xj = x1 + local_step_amount;
                
                //Set the check_x_coord variable 
                //  The check is done by seeing if x1 plus the 
                //  step amount exceeds x2.  If it doesn't, we
                //  need to check the x coord
                if(x1 + jagged_step_amount <= x2){
                    check_x_coord = true

                    //Check if this amount exceeds
                    //  the next vertex
                    //This is ignored if check_x_coord is false
                    if(xj >= x2){
                        //Dont use the x coord
                        use_x_coord = false;
                    }
                }
            }else{
                //Negative amount
                local_step_amount = (local_step_amount 
                    * -1);
                xj = x1 + local_step_amount;

                //Set check_x_coord
                //  Use greater than since we're using negative coords
                if(x1 + (jagged_step_amount * -1) >= x2){
                    check_x_coord = true;
                }
                //Set use_x_coord
                if(xj <= x2){
                    //Dont use the x coord
                    use_x_coord = false;
                }
            }

            //-----------
            //Y
            //-----------
            //NOTE: Coord starts in top left, but this doesn't
            //  affect the logic we need to do to compare y1 and y2
            //reset local step count
            local_step_amount = (jagged_step_amount
                * i_jagged);

            if(y1 < y2){
                //Positive amount 
                yj = y1 + local_step_amount;

                //Set check_y_coord
                if(y1 + jagged_step_amount <= y2){
                    check_y_coord = true
                }

                //Set use_y_coord
                if(yj >= y2){
                    use_y_coord = false;
                }
            }else{
                //Negative amount
                local_step_amount = (local_step_amount 
                    * -1);
                yj = y1 + local_step_amount;
                
                //Set check_x_coord
                //  Use greater than since we're using negative coords
                if(y1 + (jagged_step_amount * -1) >= y2){
                    check_y_coord = true;
                }
                if(yj <= y2){
                    //Dont use the x coord
                    use_y_coord = false;
                }
            }

            //-----------------------
            //
            //Check for diagonal lines and set slope
            //
            //-----------------------
            if(check_x_coord === true && check_y_coord === true){
                //This is a diagonal line

                //See if the X or Y is the 'limited' dimension (whatver
                //  difference is larger, we'll use it to see how get the
                //  number of iterations)
                if(Math.abs(x1-x2) > Math.abs(y1-y2)){
                    //Set yj.  Get the 'local step amount' (y1-y2 / num_iterations)
                    yj = ( Math.abs(y1-y2) / num_iterations );
                    //The current yj is based on current iteration
                    yj = i_jagged * yj;
                    //If y1 is >= y2, make yj negative
                    if(y1>=y2) { yj *= -1 }
                    //Set yj to be y1 + yj, which means set the current y value to
                    //  be the yj we set above plus the starting y1 value
                    yj = y1 + yj;
                    //Because we just set yj, we will _always_ want to use it
                    jagged_vertex[1] = yj;

                }else{
                    //Set xj.  Get the 'local step amount' 
                    xj = ( Math.abs(x1-x2) / num_iterations );
                    //The current xj is based on current iteration
                    xj = i_jagged * xj;
                    if(x1>=x2) { xj *= -1 }
                    xj = xj + x1;
                    jagged_vertex[0] = xj;
                }
            }

            //-----------------------
            //
            //Setup jagged vertex
            //
            //-----------------------
            //Note: Because we check for diagnoal lines above, this
            //  will really only apply for horizontal or vertical lines
            //Setup X and Y Coords for jagged_vertex
            //  Determine if the base should be xj/yj
            //  or if it should stay as x1 / x2 (for 
            //  straight line segments)
            if(check_x_coord === true){
                if(use_x_coord === true){
                    jagged_vertex[0] = xj;
                }
            }

            if(check_y_coord === true){
                if(use_y_coord === true){
                    jagged_vertex[1] = yj;
                }
            }

            //-----------------------
            //Setup jagged vertex values
            //-----------------------
            // X Coord
            //-----------------------
            jagged_vertex[0] += (
                (jaggedness_factor * -1)
                    + (Math.random() 
                    * (jaggedness_factor * 2))
                );

            //Occasionally make the borders 'really' jagged
            if(Math.random() * 100 < MAP_GEN.config.jagged_extra_random_percent_x){
                jagged_vertex[0] += (
                    (Math.random() 
                    * ((jaggedness_factor * 2) 
                        * MAP_GEN.config.jagged_extra_random_scale_x))
                )
            }

            // Y Coord
            //-----------------------
            jagged_vertex[1] += (
                (jaggedness_factor * -1)
                    + (Math.random() 
                    * (jaggedness_factor * 2))
                );

            //Occasionally make the borders 'really' jagged
            if(Math.random() * 100 < MAP_GEN.config.jagged_extra_random_percent_y){
                jagged_vertex[1] += (
                    (Math.random() 
                    * ((jaggedness_factor * 2)
                        * MAP_GEN.config.jagged_extra_random_scale_y))
                )
            }
        
            //Add the point
            jagged_borders.push(
                [ jagged_vertex[0],
                    jagged_vertex[1]
                ]
            );
        }
    }

    //Store the resulting string (cache the result of this function)
    if(country_key !== undefined){
        MAP_GEN.jagged_border_paths[country_key] = 'M' 
            + jagged_borders.join('L') + 'Z'; 
    }

    //Return the path
    return MAP_GEN.jagged_border_paths[country_key];

}
/* ========================================================================    
 *
 * generate_voronoi_countries()
 *
 * ======================================================================== */
MAP_GEN.functions.generate_voronoi_countries = function(){
    //TODO: Do a voronoi diagram for EACH continent, not just a single diagram
    //
    /*This is how we would scale it
    .attr('transform', function(d,i){
        console.log(MAP_GEN.treemap_cells[i]);
        ret = 'translate(' 
            + (-d[0][0] * (.8 - 1)) + ', ' 
            + (-d[0][1] * (.8 - 1)) 
            + ') scale(.8)';
        return ret;
    })
    */
    //
    //Show status update
    MAP_GEN.functions.console_log('Drawing voronoi diagram for countries');

    var h = $('#map')[0].offsetHeight;
    var w = $('#map')[0].offsetWidth;
    var country_group = undefined;

    //Set vertices for each country of each continent
    vertices = {};
    vertices_all = [];

    //TODO: Add points right outside the polygons so the voronoi diagram 
    //  doesn't get messed up?
    for(var continent in MAP_GEN._polygon_data){
        if(MAP_GEN._polygon_data.hasOwnProperty(continent)){
            vertices[continent] = [];
            for(country in MAP_GEN._polygon_data[continent]){
                if(MAP_GEN._polygon_data[continent].hasOwnProperty(country)){
                    //Add the polygon center point vertex to the vertices array
                    vertices[continent].push([
                        MAP_GEN._polygon_data[continent][country].x,
                        MAP_GEN._polygon_data[continent][country].y
                    ]);

                    vertices_all.push([
                        MAP_GEN._polygon_data[continent][country].x,
                        MAP_GEN._polygon_data[continent][country].y
                    ]);
                }
            }
        }
    }

    country_group = MAP_GEN._svg.append('svg:g')
        //OLD WAY: Apply a clip path to ONLY the entire voronoi diagram
        //NEW WAY: Apply a clip path to each voronoi path based on its
        //  parent continent.  See the code below
        //NOTE: We'll still need to apply a clipping path to the entire
        //  diagram 
        //.attr('clip-path', 'url(#continent_borders_clip)')
        .attr('id', 'country_borders_group');

    //Add countries to the group
    country_group.selectAll(".country_border")
        .data(d3.geom.voronoi(vertices_all))
        .enter().append("svg:path")
            .attr("class", function(d, i) { 
                return i ? "q" + (i % 9) + "-9 country_border" : "country_border"; 
            })
            .attr('clip-path', function(d,i){
                return "url(#continent_borders_clip_" + i + ")";
            })
            .attr('id', function(d,i){
                return 'country_voronoi_' + i;
            })
            .attr("d", function(d) { 
                // d contains an array of points
                //  so let's just add some new points in between each set
                var data_points = [];
                var d_length=d.length;

                for(var i=0; i<d_length; i++){
                    //Push the first point
                    data_points.push(d[i]);

                    //Randomize the borders a little bit.
                    //Push a point in between this index and the next
                    // if(i + 1 !== d_length){
                    //     data_points.push([
                    //         //push x
                    //         ((d[i][0] + d[i+1][0]) / 2) + 2,
                    //         //push y
                    //         ((d[i][1] + d[i+1][1]) / 2) + 2
                    //     ]);
                    // }
                }

                return "M" + data_points.join("L") + "Z"; 
            });
    console.log(vertices);
    
    /* DOESNT WORK Yet
    for(continent in MAP_GEN._data.children){
        console.log(continent);
        country_group = MAP_GEN._svg.append('svg:g')
            //OLD WAY: Apply a clip path to ONLY the entire voronoi diagram
            //NEW WAY: Apply a clip path to each voronoi path based on its
            //  parent continent.  See the code below
            //NOTE: We'll still need to apply a clipping path to the entire
            //  diagram 
            //.attr('clip-path', 'url(#continent_borders_clip)')
            .attr('id', 'country_borders_group');

        //Add countries to the group
        country_group.selectAll(".country_border")
            .data(d3.geom.voronoi(vertices[continent]))
            .enter().append("svg:path")
                .attr("class", function(d, i) { 
                    return i ? "q" + (i % 9) + "-9 country_border" : "country_border"; 
                })
                .attr('clip-path', function(d,i){
                    return "url(#continent_borders_clip_" + i + ")";
                })
                .attr('id', function(d,i){
                    return 'country_voronoi_' + i;
                })
                .attr("d", function(d) { 
                    // d contains an array of points
                    //  so let's just add some new points in between each set
                    var data_points = [];
                    var d_length=d.length;

                    for(var i=0; i<d_length; i++){
                        //Push the first point
                        data_points.push(d[i]);

                        //Randomize the borders a little bit.
                        //Push a point in between this index and the next
                        // if(i + 1 !== d_length){
                        //     data_points.push([
                        //         //push x
                        //         ((d[i][0] + d[i+1][0]) / 2) + 2,
                        //         //push y
                        //         ((d[i][1] + d[i+1][1]) / 2) + 2
                        //     ]);
                        // }
                    }

                    return "M" + data_points.join("L") + "Z"; 
                });
    }
    */

    MAP_GEN.functions.console_log('Completed drawing map!', true); 

    //TESTING
    /*
    MAP_GEN._svg.selectAll('path')
             .attr('d', '')
         .append('svg:path')
             .style('fill', '#336699')
             .style('stroke', '#000000')
             .attr('d', '')
    */

    /* Generating voronoi diagrams for each continent / country 

        var country_voronoi = [];
        for(continent in MAP_GEN.treemap_cells){
            if(MAP_GEN.treemap_cells.hasOwnProperty(continent)){

                for(country in MAP_GEN.treemap_cells[continent].children){
                    if(MAP_GEN.treemap_cells[continent].children.hasOwnProperty(country)){
                        console.log(MAP_GEN.treemap_cells[continent].children[country]);
                        country_voronoi.push(
                            [MAP_GEN.treemap_cells[continent].children[country].x +
                                MAP_GEN.treemap_cells[continent].children[country].dx / 2,
                            MAP_GEN.treemap_cells[continent].children[country].y +
                                MAP_GEN.treemap_cells[continent].children[country].dy / 2]
                        );
                    }
                }

            }
        }


        // SECOND Voronoi Diagram
        var diagram_2 = svg.append('g')
            .attr('id', 'diagram_2');

        diagram_2.selectAll("path")
            .data(d3.geom.voronoi(country_voronoi))
          .enter().append("path")
            .attr("opacity", '.6')
            .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

        // THIRD Voronoi Diagram
        continent_voronoi = [];
        for(continent in MAP_GEN.treemap_cells){
            if(MAP_GEN.treemap_cells.hasOwnProperty(continent)){
                continent_voronoi.push(
                    [
                        MAP_GEN.treemap_cells[continent].x +
                            MAP_GEN.treemap_cells[continent].dx / 2,
                        MAP_GEN.treemap_cells[continent].y + 
                            MAP_GEN.treemap_cells[continent].dy / 2
                    ]
                );
            }
        }
        var diagram_3 = svg.append('g')
            .attr('id', 'diagram_3');

        diagram_3.selectAll("path")
            .data(d3.geom.voronoi(continent_voronoi))
          .enter().append("path")
            .attr("opacity", '.6')
            .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
    */
}
