/* ========================================================================    
 *
 * radar.js
 * ----------------------
 *
 * Function definition to generate the radar chart
 *
 *
 * ======================================================================== */
RADAR.functions.generate_radar = function( data ){
    //If no data object was passed in, use the RADAR._data object
    if(data === undefined){
        //Store local reference to map data
        var data = RADAR._data;
    }
    //Empty the radar
    $('#radar').empty();

    //Get width and height of the svg element
    var h = $('#radar')[0].offsetHeight;
    var w = $('#radar')[0].offsetWidth;
    var x = undefined,
        y = undefined;
    var center = [
        w/2,
        h/2
    ];
    //Get radius
    var radius = 0;

    //Radius should be half of the smallest of width or height
    if(h > w){
        radius = w/2;
    }else{
        radius = h/2;
    }

    //Temp index we'll use in loops
    var index = 0;
    //Current value to use when looping through data
    var cur_value = 0;

    //array of points to use for the radar polygon
    var radar_points = [];
    //store the max value
    var max_radar_value = RADAR.config.get_max_radar_value();

    //svg elements
    var radar_group, 
        radar_axes, 
        radar_polygon_circle_group,
        radar_circle_group,
        radar_polygon_group;

    //-----------------------------------
    //-----------------------------------
    //And colors for the cirlces
    var color = d3.scale.category10();

    //Show a status update
    RADAR.functions.console_log('Creating Chart');

    //-----------------------------------
    //Setup svg object
    //-----------------------------------
    //Create SVG element
    svg = d3.select('#radar').append('svg:svg')
        .attr('width', w)
        .attr('height', h);

    //Store a reference to the svg
    RADAR._svg = svg;
    //-----------------------------------
    //
    //Update radar range input
    //
    //-----------------------------------
    $('#radar_range').attr('min', RADAR._data.highest_value); 
    $('#radar_range').attr('value', RADAR._data.chart_limit); 
    $('#radar_range').attr('max', RADAR._data.total_values); 

    //-----------------------------------
    //
    //Generate radar chart
    //
    //-----------------------------------
    //Add a group to contain the entire radar chart
    radar_group = svg.append('svg:g')
        .attr('id', 'radar_group_1')
    
    //Create group for axes
    radar_axes = radar_group.append('svg:g')
        .attr('id', 'radar_axes_1')
    
    //Set index to 1
    index=0;

    //Draw lines for each attribute, starting from origin
    for(datum in RADAR._data.children){
        if(RADAR._data.children.hasOwnProperty(datum)){
            //Store x,y so we don't have to recalculate everytime
            x = (Math.cos(index*2*Math.PI/6) * radius) + center[0]
            y = (Math.sin(index*2*Math.PI/6) * radius) + center[1]
            cur_value = RADAR._data.children[datum].value;

            //-------------------------------
            //Draw a line for each axis
            //-------------------------------
            radar_axes.append('line')
                    .attr('class', 'axes_line')
                    .attr('id', 'axes_' + datum)
                    .attr('x1', center[0])
                    .attr('x2', x)
                    .attr('y1', center[1])
                    .attr('y2', y);

            //-------------------------------
            //Add a text label
            //-------------------------------
            radar_axes.append('text')
                    .attr('class','axis_text')
                    .attr('x', x) 
                    .attr('y', y)
                    .attr('dx', function(d){
                        if(x<center[0]){
                            return -50;
                        }else{
                            return 50;
                        }
                    })
                    .attr("text-anchor", 'middle')
                    .attr('transform', function(){
                        /* TODO: Rotate on tangent
                        var ret_rotate = 'rotate('
                            + index*60 
                            + ', '
                            + (Math.round((Math.cos(index*2*Math.PI/6) * radius) + center[0]))
                            + ','
                            + (Math.round((Math.sin(index*2*Math.PI/6) * radius) + center[1]))
                            + ')';
                        console.log(ret_rotate);
                        return ret_rotate;
                        */
                    })
                    .text(datum)

            //-------------------------------
            //Add a point to the radar polygon
            //-------------------------------
            radar_points.push([
                //X point
                ((cur_value / max_radar_value) * (x-center[0]) 
                + center[0]),
                
                //Y point
                ((cur_value / max_radar_value) * (y-center[1]) 
                + center[1])
            ]);

            //Increase index
            index+=1;
        }
    }

    //-----------------------------------
    //Setup Radar polygon
    //-----------------------------------
    //Add group
    radar_polygon_circle_group = radar_group.append('svg:g')
        .attr('id', 'radar_polygon_circle_group_1')
        .attr('class', 'radar_polygon_circle_group_1');

    //Add circles
    radar_polygon_circle_group.append('svg:g')
        .attr('id', 'radar_circle_group_1')
        .attr('class', 'radar_circle_group')
        .selectAll('circle')
        .data(radar_points)
        .enter()
            .append('circle')
            .attr('cx', function(d,i){
                return d[0];
            })
            .attr('cy', function(d,i){
                return d[1];
            })
        .attr('r', '5');

    //Add polygon
    radar_polygon_circle_group.append('path')
        .attr('id', 'radar_polygon_1')
        .attr('class', 'radar_polygon')
        .attr('d', function(d,i){
           return 'M' + radar_points.join('L') + 'Z';
        })

    RADAR.functions.console_log('Done');
}

/* ========================================================================    
 *
 * Interactive functions
 *
 * ======================================================================== */
RADAR.functions.update_max_radar_value = function(){
    //This function is triggered whenever the range input changes

    //Update the max radar value
    RADAR._data.chart_limit= parseInt(
        $('#radar_range').attr('value'), 10);

    //Regenerate the radar
    RADAR.functions.generate_radar();
}
