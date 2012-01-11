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
MAP_GEN.functions.generate_data_and_map = function(params){
    //Take in file name direction, and generate an object containing the data
    //  and extra info about it (percentages, vaules)
    //Get parameters
    if(typeof(params) === 'string' || typeof(params) !== 'object'){
        var directory = '';
        var file_name = params;
        var data_conversion_func = MAP_GEN.functions.data_convert_from_json; 

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
            data_conversion_func = MAP_GEN.functions.data_convert_from_json;
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
    MAP_GEN._data = {};

    //Send a request to get the data.  When it finishes, perform operations
    //  on the data
    $.ajax({
        url: '/' + directory + file_name,
        type: 'GET',
        dataType: data_type,
        success: function(data_res){
            //---------------------------
            //Call function which parses JSON response and returns an object
            //  containing the data in a format D3 can use
            //  (Function passed in)
            //---------------------------
            d3_data = data_conversion_func(data_res);

            //---------------------------
            //Set MAP_DATA._data to equal the d3_data object we've built
            //---------------------------
            MAP_GEN._data = d3_data;

            //---------------------------
            //GENERATE MAP
            //---------------------------
            return MAP_GEN.functions.generate_map(
                MAP_GEN._data
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
MAP_GEN.functions.data_convert_from_json = function(json_res){
    var temp_data = {}

    var d3_data = {
        name: 'Map Data',
        children: []
    };
    var cur_children = [];
    var cur_child = {};

    var total_values_combined = 0;
    //We're assuming our data is set up a certain way here, so later we
    //  we can make this exensible
    var continents = json_res.fields[1].keys;
    var countries = json_res.fields[0].data;
    var values = json_res.fields[2].data;
    
    //---------------------------
    //Setup the _data object.  We'll determine percentages below
    //---------------------------
    for(item in continents){
        if(continents.hasOwnProperty(item)){
            if(continents[item] !== '' 
                && continents[item] !== null){
                //Get the continent
                if( temp_data[continents[item]] === undefined){
                    //If the continent hasn't already been create, it,
                    //  create it
                    temp_data[continents[item]] = {
                        value: 0
                    };
                }

                //And the country
                //  Note: Countries are unique for each continent,
                //  so we don't need to worry about defining them
                //  multiple times
                temp_data[continents[item]][
                    countries[item]] = {
                        value: values[item]
                    };

                //Add the country's value to continent's value
                temp_data[continents[item]].value += values[item];
                total_values_combined += values[item];
            }
        }
    }

    //---------------------------
    //Convert to d3 json string
    //---------------------------
    //TODO: Cities / Towns
    //NOTE: If we wanted even more details (say, cities, or towns
    //  for example), we could just write this as a recursive function
    //  but for now we'll keep it simple
    for(continent in temp_data){
        //Get each continent
        if(temp_data.hasOwnProperty(continent)){
            //Get each country
            //Make sure cur_children is empty before we 
            //  loop through countries.  Cur children will
            //  contain the children of the current property
            //  we're looking at (in this case, we're looking at
            //  continents, so cur_children will be an array of
            //  countries)
            cur_children = [];
            for(country in temp_data[continent]){
                //Make sure we are looking at a country, not
                //  a value property (note: we cannot do a typeof
                //  check because country might be null, and 
                //  typeof(null === 'object')
                if(temp_data[continent].hasOwnProperty(country)
                    && country !== 'value'
                    && country !== null ){
                    cur_child = {
                        name: country,
                        size: temp_data[continent][country].value,
                        percentage: (
                            temp_data[continent][country].value
                            / total_values_combined
                        )
                    };
                    cur_children.push(cur_child);
                }
            }
            //After each country collection has finished, push the
            //  children to the d3 list
            d3_data.children.push({
                name: continent,
                children: cur_children});
        }
    }

    return d3_data;
}

//============================================================================
//
//convert from csv 
//
//============================================================================
MAP_GEN.functions.data_convert_from_csv = function(data_res){
    //Temp data will be the object we use to build our d3_data object
    var temp_data = {}

    var d3_data = {
        name: 'Map Data',
        children: []
    };
    var cur_children = [];
    var cur_child = {};

    var total_values_combined = 0;

    //Get data from CSV into an object
    data_res = data_res.replace("\r", "\n").replace(/"/gi,'');


    var csv_split_on_newline = data_res.split('\n');
    var csv_len=csv_split_on_newline.length;

    var csv_cur_line = []; 
    var cur_continent = '',
        cur_country= '';
    var cur_value = 0;

    //---------------------------
    //Setup the _data object.  We'll determine percentages below
    //---------------------------
    //Loop through data and build temp_data object
    //  NOTE: Don't use i==0, since that will be the csv column headings
    for(var i=csv_len-1; i>=1; i--){
        csv_cur_line = csv_split_on_newline[i].split(',');
        cur_continent = csv_cur_line[1];
        cur_country = csv_cur_line[0];
        cur_value = parseInt(csv_cur_line[3],10);
        if(isNaN(cur_value) === true){
            cur_value = 0;
        }
        

        //Set up the empty 'parent' (continent) node
        if(temp_data[cur_continent] === undefined){
            temp_data[cur_continent] = {
                value: 0
            };
        }

        //And the country
        //  Note: Countries are unique for each continent,
        //  so we don't need to worry about defining them
        //  multiple times
        temp_data[cur_continent][cur_country] = {
            value: cur_value
        };

        //Add the country's value to continent's value
        temp_data[cur_continent][cur_country].value += cur_value;

        //Add to the total values
        total_values_combined += cur_value;
    }


    //---------------------------
    //Convert to d3 json string
    //---------------------------
    //TODO: Cities / Towns
    //NOTE: If we wanted even more details (say, cities, or towns
    //  for example), we could just write this as a recursive function
    //  but for now we'll keep it simple
    for(continent in temp_data){
        //Get each continent
        if(temp_data.hasOwnProperty(continent)){
            //Get each country
            //Make sure cur_children is empty before we 
            //  loop through countries.  Cur children will
            //  contain the children of the current property
            //  we're looking at (in this case, we're looking at
            //  continents, so cur_children will be an array of
            //  countries)
            cur_children = [];
            for(country in temp_data[continent]){
                //Make sure we are looking at a country, not
                //  a value property (note: we cannot do a typeof
                //  check because country might be null, and 
                //  typeof(null === 'object')
                if(temp_data[continent].hasOwnProperty(country)
                    && country !== 'value'
                    && country !== null ){
                    cur_child = {
                        name: country,
                        size: temp_data[continent][country].value,
                        percentage: (
                            temp_data[continent][country].value
                            / total_values_combined
                        )
                    };
                    cur_children.push(cur_child);
                }
            }
            //After each country collection has finished, push the
            //  children to the d3 list
            d3_data.children.push({
                name: continent,
                children: cur_children});
        }
    }

    return d3_data;
}
