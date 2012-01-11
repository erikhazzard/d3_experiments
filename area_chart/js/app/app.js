/* ========================================================================    
 *
 * app.js
 * ----------------------
 *
 * Function definition to generate the chart
 *
 *
 * ======================================================================== */
APP.functions.generate_chart = function( data ){
    //If no data object was passed in, use the APP._data object
    if(data === undefined){
        //Store local reference to map data
        var data = APP._data;
    }
    //Empty the chart
    $('#chart').empty();

    //Get width and height of the svg element
    var h = $('#chart')[0].offsetHeight,
        w = $('#chart')[0].offsetWidth,
        x = undefined,
        y = undefined,
        //Temp index we'll use in loops
        index = 0,
        area_chart = undefined,
        chart_extra_group = undefined,
        chart_extra = undefined,
        //Current value to use when looping through data
        cur_value = 0,
        //array of points to use for the chart polygon
        chart_points = [],
        //store the max value
        max_chart_value = APP.config.get_max_chart_value(),
        //svg elements
        chart_group, 
        chart_axes, 
        //And colors for the cirlces
        color = d3.scale.category10(),
        //Scales
        x_scale = d3.scale.linear()
            .domain([0,data.length-1])
            .range([0,w]),
        y_scale = d3.scale.linear()
            .domain([0,d3.max(data, function(datum){
                //Get highest value, add a value so it doesn't
                //  go to the top of the screen
                return datum.value + 30;
            })])
            .rangeRound([0,h]);

    //Show a status update
    APP.functions.console_log('Creating Chart');

    //-----------------------------------
    //Setup svg object
    //-----------------------------------
    //Create SVG element
    svg = d3.select('#chart').append('svg:svg')
        .attr('width', w)
        .attr('height', h);

    //Store a reference to the svg
    APP._svg = svg;

    //-----------------------------------
    //
    //Generate chart chart
    //
    //-----------------------------------
    //Add a group to contain the entire chart chart
    chart_group = svg.append('svg:g')
        .attr('id', 'chart_group')
    
    //Create group for axes
    chart_axes = chart_group.append('svg:g')
        .attr('id', 'chart_axes')

    //------------------------------------------ 
    //Create 'ticks'
    //------------------------------------------ 
    chart_extra_group = chart_group.append('svg:g')
            .attr('id', 'chart_extra')

    chart_extra = chart_extra_group.append('svg:g')
            .attr('id', 'chart_lines')
        .selectAll('g#chart_extra')
        .data(x_scale.ticks(data.length))
        .enter()

    //Append background color bands
    chart_extra.append('rect')
        .attr('class', function(d,i){
            return i % 2 ? 'even' : 'odd'; 
        })
        .attr('x', function(d,i){
            return x_scale(i);
        })
        .attr('width', function(d,i){
            return w/(data.length-1);
        })
        .attr('y', 0)
        .attr('height', h)

    //Add text labels
    chart_extra.append("text")
        .attr("x", x_scale)
        .attr("y", 0)
        .attr("dy", 30)
        .attr("text-anchor", "left")
        .text(function(d,i){
            return data[i].date;
        });

    //------------------------------------------ 
    //Create the area chart
    //------------------------------------------ 
    area_chart = chart_group.append('svg:g')
        .attr('id', 'chart')
        .data([data])
            .append('path')
                .attr('d', d3.svg.area()
                .x(function(d,i) { 
                    return x_scale(i); 
                })
                .y0(h - 1)
                .y1(function(d) { 
                    //subtract h from y_scale to flip
                    //  it
                    return h - y_scale(d.value);
                }));

    APP.functions.console_log('Done');
}

/* ========================================================================    
 *
 * Interactive functions
 *
 * ======================================================================== */
APP.functions.update_max_chart_value = function(){
    //This function is triggered whenever the range input changes

    //Update the max chart value
    APP._data.chart_limit= parseInt(
        $('#chart_range').attr('value'), 10);

    //Regenerate the chart
    APP.functions.generate_chart();
}
