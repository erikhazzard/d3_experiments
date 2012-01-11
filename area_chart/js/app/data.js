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
APP.functions.generate_data_and_chart = function(params){
    //Take in file name direction, and generate an object containing the data
    //  and extra info about it (percentages, vaules)
    //Get parameters
    if(typeof(params) === 'string' || typeof(params) !== 'object'){
        var directory = '';
        var file_name = params;
        var data_conversion_func = APP.functions.data_convert_from_json; 
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
            data_conversion_func = APP.functions.data_convert_from_json;
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
    APP._data = {};

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
            APP._data = d3_data;

            //---------------------------
            //GENERATE MAP
            //---------------------------
            return APP.functions.generate_chart(
                APP._data
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
APP.functions.data_convert_from_json = function(json_res, randomize){
    var i, val, i_len;
    if(randomize === undefined){
        var randomize = false;
    }

    d3_data = json_res.data;

    //Randomize some data if requested
    if(randomize === true){
        d3_data = [];
        i_len = parseInt(Math.random() * 20) + 3;
        for(i=0; i<i_len; i++){
            val = parseInt(Math.random() * 100);
            d3_data.push({
                date: val,
                value: val
            });
        }
    }

    return d3_data;
}
