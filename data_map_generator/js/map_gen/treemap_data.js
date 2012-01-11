/* ========================================================================    
 *
 * data.js
 * ----------------------
 *
 *  Functions related to data
 *
 * ======================================================================== */
//============================================================================
//generate_data
//============================================================================
MAP_GEN.functions.generate_data_and_map = function(params){
    //Take in file name direction, and generate an object containing the data
    //  and extra info about it (percentages, vaules)
    //Get parameters
    if(typeof(params) === 'string'){
        var directory = '';
        var file_name = params;
    }else if(typeof(params) === 'object'){
        var directory = params.directory;
        if(directory === undefined){
            directory = 'data/';
        }
        var file_name = params.file_name;
        if(file_name === undefined){
            file_name = 'dataset.json'; 
        }
        //TODO: Allow for passing if on keys for continents / countries / value 
        //  etc. 
    }

    //The purpose of this function is to turn the passed in JSON to a d3
    //  friendly json string. 
    //  TODO: Accept more variety of data

    //Clear out any existing data object
    MAP_GEN._data = {};
    var temp_data = {}
    var d3_data = {
        name: 'Map Data',
        children: []
    };
    var cur_children = [];
    var cur_child = {};

    //Send a request to get the data.  When it finishes, perform operations
    //  on the data
    $.ajax({
        url: '/' + directory + file_name,
        type: 'GET',
        dataType: 'json',
        success: function(json_res){
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
                            }

                        //Add the country's value to continent's value
                        temp_data[continents[item]].value += values[item];
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
                                size: temp_data[continent][country].value
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

            //---------------------------
            //Set MAP_DATA._data to equal the d3_data object we've built
            //---------------------------
            MAP_GEN._data = d3_data;
            console.log(MAP_GEN._data);

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
