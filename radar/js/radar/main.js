/* ========================================================================    
 *
 * main.js
 * ----------------------
 *
 *  Main 'bootstrapping' script
 *
 * ======================================================================== */
//============================================================================
//Main App Object
//============================================================================
var RADAR = {
    //RADAR is the name space for this app.  

    //define the _data object, which is contains all the continents, countries,
    //  and info about htem
    _data: {

    },

    //Reference to SVG element
    _svg: undefined,

    //Functions
    functions: {
        console_log: function(message, hide_loading_bar){
            if(hide_loading_bar === undefined){
                var hide_loading_bar = false;
            }
            //Logs a message to the console div
            $('#footer #console #console_text').html(message);

            if(hide_loading_bar === true){
                $('#console_loading_bar').css('display','none');
            }
        },
        
        //Function to update radar when the radar range slider is updated 
        update_max_radar_value: function(){}
    },

    config: {
        get_max_radar_value: function(){
            //Returns the highest value for the radar chart
            return RADAR._data.chart_limit;
        }
    }
};

//============================================================================
//
//UTILITY Functions
//
//============================================================================

//============================================================================
//
//Page setup
//
//============================================================================
//============================================================================
//Page Resize (call generate_map)
//============================================================================
//============================================================================
//Page Load
//============================================================================
$(document).ready(function(){
    //When page loads, call generate data func to setup data and generate
    //  the map
    RADAR.functions.generate_data_and_radar({
        randomize: true,
        directory: 'data/',
        file_name: 'data.json'

        //file_name: 'site_traffic.csv'
        //,data_conversion_func: MAP_GEN.functions.data_convert_from_csv
    });

    //Add even to update the radar when the range input is updated
    $('#radar_range').bind('change', function(e){ 
        RADAR.functions.update_max_radar_value();
    })

    //Regenerate the radar when window is resized
    $(window).resize(function(){
        //Whenever the window is resized, call the generate_map function
        RADAR.functions.generate_radar(
            RADAR._data    
        );
    });
});
