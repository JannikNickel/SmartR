//# sourceURL=d3Timeseries.js

'use strict';

window.smartRApp.directive('timeseries', [
    'smartRUtils',
    'rServeService',
    '$rootScope',
    function(smartRUtils, rServeService, $rootScope) {

    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        templateUrl: $rootScope.smartRPath +  '/js/smartR/_angular/templates/timeseries.html',
        link: function (scope, element) {
            var ctrlDiv = element.children()[0];
            var vizDiv = element.children()[1];

            /**
             * Watch data model (which is only changed by ajax calls when we want to (re)draw everything)
             */
            scope.$watch('data', function () {
                $(vizDiv).empty();
                if (! $.isEmptyObject(scope.data)) {
                    smartRUtils.prepareWindowSize(1000, 1000);
                    create_linegraph(scope, vizDiv, ctrlDiv)
                }
            });
        }
    };

    function parse_date(datestring) {
        //Output from R replaces ' ', '-' and `:` with '.'
        let reg = /(\d{4}).(\d{2}).(\d{2}).(\d{2}).(\d{2}).(\d{2})/;
        let array = reg.exec(datestring)
        return new Date((+array[1]), (+array[2]) - 1, (+array[3]), (+array[4]), (+array[5]), (+array[6]))
    }

    function transform_dataset(data) {
        //Transform and load data (Format: List of (Item, Subject, Probe order, datetime, value))
        //Group by item and subject
        var grouped_data = {}
        for (let i = 0; i < data.length; i++){
            let element = data[i]
            let item = element[0]
            let isNumeric = element[1] == "TRUE"
            let subject = element[2]
            let probe = element[3]
            let datetime = element[4]
            let realdatetime = parse_date(datetime)
            let value = isNumeric ? parseFloat(element[5]) : element[5]
            
            if (item in grouped_data == false) {
                grouped_data[item] = {}
            }
            if (subject in grouped_data[item] == false) {
                grouped_data[item][subject] = []
            }

            grouped_data[item][subject].push([probe, realdatetime, value, null, isNumeric])
        }

        //Create a numeric value for each categorial item value and use it as value
        let itemValuesDict = {}
        for(let i_key in grouped_data)
        {
            let allValues = []
            for(let s_key in grouped_data[i_key])
            {
                //Skip for numerical items
                if(grouped_data[i_key][s_key][0][4] == true){
                    break;
                }

                let array = grouped_data[i_key][s_key]
                array.forEach(element => {
                    if(allValues.indexOf(element[2]) == -1){
                        allValues.push(element[2])
                    }
                });
            }

            itemValuesDict[i_key] = []
            if(allValues.length > 0){
                allValues.sort()
                for(let s_key in grouped_data[i_key]) {
                    let array = grouped_data[i_key][s_key]
                    for(let i = 0; i < array.length;i++) {
                        let temp = array[i][2];
                        array[i][2] = allValues.indexOf(array[i][2])
                        array[i][3] = temp;
                    }
                }
                itemValuesDict[i_key] = allValues
            }
        }

        //Sort probes for each subject and find the first datetime
        function compareProbes(a, b) {
            if(a[0].length < b[0].length) {
                return -1
            }
            if(a[0].length > b[0].length) {
                return 1;
            }
            return a[0].localeCompare(b[0])
        }
        var first_datetimes = {}//Store first probe time for each patient
        for(let i_key in grouped_data)
        {
            for(let s_key in grouped_data[i_key])
            {
                let array = grouped_data[i_key][s_key]
                array.sort(compareProbes)
                grouped_data[i_key][s_key] = array

                array.forEach(element => {
                    if(first_datetimes[s_key] == undefined || element[1] < first_datetimes[s_key]) {
                        first_datetimes[s_key] = element[1]
                    }
                });
            }
        }

        //Change times to minutes since first datetime of all items for each patient to compare between patients
        //Also search min and max for fast axis scaling
        var min_time = 0
        var max_time = 0
        for(let i_key in grouped_data)
        {
            for(let s_key in grouped_data[i_key])
            {
                let array = grouped_data[i_key][s_key]
                for (let i = 0; i < array.length; i++) {
                    let offset = Math.abs(array[i][1] - first_datetimes[s_key]) / (60 * 1000)
                    array[i][1] = offset

                    if(offset < min_time){min_time = offset}
                    if(offset > max_time){max_time = offset}
                }
                grouped_data[i_key][s_key] = array
            }
        }

        return {
            data: grouped_data,
            tmin: min_time,
            tmax: max_time,
            itemValues: itemValuesDict
        }
    }

    function create_linegraph(scope, vizDiv, ctrlDiv) {
        ///////////////////////////////////////////////////
        /// Transform data                              ///
        ///////////////////////////////////////////////////
        var data = scope.data
        //console.log("raw")
        //console.log(data)

        //Transform the data in a dictionary grouped by item and then patients + calculate min/max time for one shared x axis
        var transformed_data = transform_dataset(data)
        var groupedData = transformed_data["data"]
        var minTime = transformed_data["tmin"]
        var maxTime = transformed_data["tmax"]
        var itemValues = transformed_data["itemValues"]
        var itemCount = Object.keys(groupedData).length

        //console.log("transformed")
        //console.log(groupedData)

        ///////////////////////////////////////////////////
        /// Read ui settings                            ///
        ///////////////////////////////////////////////////
        //var transformationSelect = smartRUtils.getElementWithoutEventListeners("ts_valueTransformation");
        //var scaleSelect = smartRUtils.getElementWithoutEventListeners("ts_timeScale");
        var lineWidthRange = smartRUtils.getElementWithoutEventListeners('ts_lineWidth');
        lineWidthRange.min = 0.5;
        lineWidthRange.max = 3;
        lineWidthRange.value = (maxTime - minTime) > 90 ? 1 : 2;//Determine line width based on time frame
        lineWidthRange.step = 0.5;
        lineWidthRange.addEventListener('input', function() {
            d3.selectAll(".line").each(function(d) {
                d3.select(this).style("stroke-width", lineWidthRange.value)
            });
            d3.selectAll("circle").each(function(d) {
                let circle = d3.select(this)
                if(circle.attr("id") == undefined || circle.attr("id").startsWith("legend_") == false) {
                    circle.attr("r", lineWidthRange.value * 2)
                }
            });
        });
        var showDataPointsCheck = smartRUtils.getElementWithoutEventListeners('ts_renderDataPoints');
        showDataPointsCheck.checked = true;
        showDataPointsCheck.addEventListener('change', function() {
            d3.selectAll("circle").each(function(d) {
                let circle = d3.select(this)
                if(circle.attr("id") == undefined || circle.attr("id").startsWith("legend_") == false) {
                    circle.style("visibility", showDataPointsCheck.checked ? "visible" : "hidden")
                }
            });
        });

        //var valueTransformMode = transformationSelect.selectedIndex;
        //var scaleMode = scaleSelect.selectedIndex;
        var ctrlLineWidth = lineWidthRange.value

        ///////////////////////////////////////////////////
        /// Create svg                                  ///
        ///////////////////////////////////////////////////
        //Size settings
        var legendWidth = 220
        var margin = {top: 30, right: (30 + legendWidth), bottom: 50, left: 150}
        var totalWidth = 1250
        var totalHeight = 500
        var width = totalWidth - margin.left - margin.right
        var height = totalHeight - margin.top - margin.bottom
        var itemHeight = height / itemCount
        var itemMargin = itemCount > 1 ? 5 : 0

        //Scale functions
        var x = d3.scale.linear().range([0, width])
        
        //Create svg image
        var svg = d3.select(vizDiv).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        
        //Create a tooltip html element in the visualization div
        var tooltipElement = document.createElement("p")
        tooltipElement.classList.add("tooltip")
        vizDiv.appendChild(tooltipElement)
        var tooltip = d3.select(".tooltip")
        
        //Graph render settings
        var dataPointRadius = ctrlLineWidth * 2 // 4
        var lineWidth = ctrlLineWidth //2
        var dataColors = [
            "#DC143C", "#0000CD", "#008000", "#FFD700", "#FF6347", "#20B2AA", "#9400D3", "#90EE90", "#A52A2A"
        ];
        
        //x axis is shared between all measurements -> Share time for all entries and create axis
        var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(5)
        x.domain([minTime, maxTime])
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)

        svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", width * 0.5)
            .attr("y", height + margin.bottom * 0.75)
            .text("Time since first measurement (minutes)")

        var patientLegendEntries = {}
        var itemIndex = 0
        //Iterate through all items
        for(let i_key in groupedData) {

            //Scale the y axis for this item [0, maxvalue]
            let maxvalue = 0
            for(let s_key in groupedData[i_key]) {
                groupedData[i_key][s_key].forEach(element => {
                    if(element[2] > maxvalue){
                        maxvalue = element[2]
                    }
                });
            }
            let y = d3.scale.linear().range([itemHeight * (itemIndex + 1) - itemMargin, itemHeight * itemIndex + itemMargin])
            y.domain([0, maxvalue])

            //Create the y axis for this measurement
            let yAxis = null
            if(itemValues[i_key].length > 0){ //Ordinal axis
                yAxis = d3.svg.axis().scale(y).orient("left").ticks(itemValues[i_key].length - 1).tickFormat(function(d) {
                    return itemValues[i_key][Math.round(d)]
                })
            }
            else{
                yAxis = d3.svg.axis().scale(y).orient("left").ticks(5)
            }
            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)

            svg.append("text")
                .attr("class", "y label")
                .attr("text-anchor", "middle")
                .attr("x", -itemHeight * itemIndex - itemHeight * 0.5)
                .attr("y", -margin.left * 0.75)
                .attr("transform", "rotate(-90)")
                .text(i_key.replaceAll(".", " ").trim()) //R replaces whitespace and special chars with .

            //Create a line and data points for each patient for the current item
            let colorIndex = 0
            for(let s_key in groupedData[i_key]) {
                let color = dataColors[colorIndex % dataColors.length]//dataColors[Math.floor(Math.random() * dataColors.length)]
                colorIndex += 1
                patientLegendEntries[s_key] = color

                //Define line functions based on x and y scale
                let line = d3.svg.line()
                    .x(function(d) { return x(d[0])})
                    .y(function(d) { return y(d[1])})

                //Create time/value pairs for the data for easy data access
                let time_value_pairs = []
                let values = groupedData[i_key][s_key]
                let isNumeric = values[0][4] == true;
                values.forEach(element => {
                    time_value_pairs.push([element[1], element[2], element[3]])
                });

                //Add the line to the svg
                if(isNumeric) {
                    svg.append("path")
                        .attr("class", "line")
                        .attr("style", "stroke: " + color + ";" + "stroke-width: " + lineWidth + ";")
                        .attr("d", line(time_value_pairs))
                        .on("mouseover", function(d, index) {
                            d3.select(this).style("stroke-width", d3.select(this).style("stroke-width") + 1)
                        })
                        .on("mouseout", function(d, index) {
                            d3.select(this).style("stroke-width", d3.select(this).style("stroke-width") - 1)
                        })
                }

                //Create a group and add all data points
                svg.append("g").selectAll("circle")
                    .data(time_value_pairs)
                    .enter()
                    .append("circle")
                    .attr("r", dataPointRadius)
                    .attr("cx", function(d) { return x(d[0]) })
                    .attr("cy", function(d) { return y(d[1]) })
                    .on("mouseover", function(d, index) {
                        d3.select(this).attr("r", d3.select(this).attr("r") * 1.75)
                        let time = d[0]
                        let tHours = (time / 60)
                        let hours = Math.floor(tHours)
                        let minutes = Math.round((tHours - hours) * 60)
                        tooltip.text(hours + "h " + minutes + "m - " + (d[2] == null ? d[1].toFixed(2) : d[2]))
                        tooltip.style("transform", "translate(" + (x(d[0]) + margin.left - tooltipElement.offsetWidth * 0.5) + "px," + (y(d[1]) - height - margin.bottom - 10 - tooltipElement.offsetHeight) + "px)")
                    })
                    .on("mouseout", function(d, index) {
                        d3.select(this).attr("r", d3.select(this).attr("r") / 1.75)
                        tooltip.style("transform", "translate(" + 0 + "px," + 0 + "px)")
                        tooltip.text("")
                    })
                    .style("fill", color)
            }

            itemIndex += 1
        }

        //Create patient color legend
        var ly = 0
        var legendMargin = 30
        var legendRadius = 7
        for(let p_key in patientLegendEntries) {
            svg.append("circle")
                .attr("cx", width + legendMargin)
                .attr("cy", ly - legendRadius * 0.5)
                .attr("r", legendRadius)
                .style("fill", patientLegendEntries[p_key])
                .attr("id", "legend_" + p_key)
            
            svg.append("text")
                .attr("x", width + legendMargin + legendRadius * 2 + 5)
                .attr("y", ly)
                .attr("alignment-baseline", "middle")
                .text(p_key)

            ly += 20
        }
    }
}]);