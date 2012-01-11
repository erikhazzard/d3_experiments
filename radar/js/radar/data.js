/* ========================================================================    
 *
 * data.js
 * ----------------------
 *
 *  Functions related to data
 *
 * ======================================================================== */
//============================================================================
//
//generate_data
//
//============================================================================
RADAR.functions.generate_data_and_radar = function(params){
    //Take in file name direction, and generate an object containing the data
    //  and extra info about it (percentages, vaules)
    //Get parameters
    if(typeof(params) === 'string' || typeof(params) !== 'object'){
        var directory = '';
        var file_name = params;
        var data_conversion_func = RADAR.functions.data_convert_from_json; 
        var randomize = false;
    }else if(typeof(params) === 'object'){
        var directory = params.directory;
        if(directory === undefined){
            directory = 'data/';
        }
        var file_name = params.file_name;
        if(file_name === undefined){
            file_name = 'dataset.json'; 
        }
        
        var data_conversion_func = params.data_conversion_func;
        if(data_conversion_func === undefined){
            data_conversion_func = RADAR.functions.data_convert_from_json;
        }
        var randomize = params.randomize;
        if(randomize === undefined){
            randomize = false; 
        }
    }

    var d3_data;
    //They could pass in a csv, but assume a json
    var data_type = 'json';
    if(file_name.search(/\.csv/gi) !== -1){
        data_type = 'script';
    }


    //The purpose of this function is to turn the passed in JSON to a d3
    //  friendly json string. 
    //  TODO: Accept more variety of data

    //Clear out any existing data object
    RADAR._data = {};

    //Send a request to get the data.  When it finishes, perform operations
    //  on the data
    $.ajax({
        //url: '/' + directory + file_name,
        url: directory + file_name,
        type: 'GET',
        dataType: data_type,
        success: function(data_res){
            //---------------------------
            //Call function which parses JSON response and returns an object
            //  containing the data in a format D3 can use
            //  (Function passed in)
            //---------------------------
            d3_data = data_conversion_func(data_res, randomize);

            //---------------------------
            //Set MAP_DATA._data to equal the d3_data object we've built
            //---------------------------
            RADAR._data = d3_data;

            //---------------------------
            //GENERATE MAP
            //---------------------------
            return RADAR.functions.generate_radar(
                RADAR._data
            )

        },
        failure: function(){
            console.log('could not load data');
        }
    });
}

//============================================================================
//
//convert from json (based on sample json file)
//
//============================================================================
RADAR.functions.data_convert_from_json = function(json_res, randomize){
    if(randomize === undefined){
        randomize = false;
    }
    var temp_data = {'children': {}}

    var d3_data = {
        name: 'Map Data',
        children: []
    };
    var cur_children = [];
    var cur_child = {};

    var total_values_combined = 0;
    var highest_value = 0;
    
    //---------------------------
    //Setup the _data object.  We'll determine percentages below
    //---------------------------
    for(datum in json_res.data){
        if(json_res.data.hasOwnProperty(datum)){
            //Setup temp data object
            temp_data.children[datum] = {
                value: json_res.data[datum],
                percentage: 0
            };
            //Randomize data?
            if(randomize === true){
                temp_data.children[datum].value = Math.round(
                    Math.random() * 120
                );
            }
            //Add to total values
            total_values_combined += temp_data.children[datum].value;
            //Set highest value if necessary
            if(temp_data.children[datum].value > highest_value){
                highest_value = temp_data.children[datum].value;
            }
        }
    }

    //---------------------------
    //Setup percentages
    //---------------------------
    for(datum in temp_data.children){
        if(temp_data.children.hasOwnProperty(datum)){
            //Set percentage
            temp_data.children[datum].percentage = (
                temp_data.children[datum].value / total_values_combined);
        }
    }
    
    //---------------------------
    //Setup some meta data
    //---------------------------
    //Store total amount
    temp_data.total_values = total_values_combined;
    //Store highest amount 
    temp_data.highest_value = highest_value;
    //Store highest radar value
    temp_data.chart_limit = highest_value;

    d3_data = temp_data;
    return d3_data;
}
