library(jsonlite)

main <- function(transformation="raw") {
    output <- list()

    #Save input data for debugging/development purposes
    json <- toJSON(fetch_params)
    write(json, file="fetch_params.json")
    save(fetch_params, file="fetch_params.Rda")
    json <- toJSON(loaded_variables)
    write(json, file="loaded_variables.json")
    save(loaded_variables, file="loaded_variables.Rda")
    
    all_variable_names = list()
    variable_appendix = 1

    for(v in 1:length(loaded_variables))
    {
        len <- length(loaded_variables[[v]])
        probes = names(loaded_variables[[v]])
        
        #Find variable name from fetch_params
        variable_name <- "Unknown"
        variable_info <- fetch_params[[1]][[v]]
        variable_titles <- names(fetch_params[[1]][[v]])
        for(i in 1:length(variable_info))
        {
            if(variable_titles[[i]] == "name")
            {
                variable_name <- variable_info[[i]]
                #Dont allow duplicated variable names (append number in case that happens)
                if(variable_name %in% all_variable_names)
                {
                    variable_name <- paste(c(variable_info[[i]], variable_appendix), collapse=" ")
                    variable_appendix = variable_appendix + 1
                }
                all_variable_names[[length(all_variable_names) + 1]] <- variable_name
            }
        }

        #Iterate through probes (1 = Row.Label, 2 = biomarker, 3 = first probe)
        for(i in 3:len)
        {
            #Extract probe
            probe <- probes[[i]]

            #Extract value (list of all measurements, measurement name is in the first probe column)
            values <- list()
            for (k in 1:length(loaded_variables[[v]][[i]])) {
                #Format is a list of columns with value and probeID as name
                measurement <- loaded_variables[[v]][[1]][[k]]
                value <- loaded_variables[[v]][[i]][[k]]
                values[[length(values) + 1]] <- c(measurement, value)
            }

            value <- 0
            is_numeric <- TRUE
            #Single numeric measurement
            if(length(values) == 1 && startsWith(values[[1]][[1]], "n_")) {
                value <- as.double(values[[1]][[2]])
                #Transform value based on log settings
                if(value != 0) { #exclude 0^2 == 1
                    if(transformation == "raw") {
                        value <- 2 ^ value
                    }
                    else if(transformation == "log10") {
                        value <- log10(2 ^ value)
                    }
                }
            }
            #Merge categorial measurements
            else {
                is_numeric <- FALSE
                value <- ""
                for(v1 in 1:length(values)) {
                    for(v2 in 1:length(values)) {
                        if(is.na(values[[v2]][[2]])) {
                            next
                        }
                        m_parts = unlist(strsplit(values[[v2]][[1]], "_"))
                        if(m_parts[[length(m_parts)]] == toString(v1 - 1)) {
                            ascii = round(2 ^ as.double(values[[v2]][[2]]))
                            value <- paste(value, intToUtf8(ascii), sep="")
                        }
                    }
                }
            }

            #Split probe to extract subject, probe order and datetime
            probe_parts = unlist(strsplit(probe, "_"))

            #Add line to output: (Item, Numeric, Patient-ID, Sequence number, Datetime, value)
            output[[length(output) + 1]] <- c(variable_name, is_numeric, probe_parts[[2]], probe_parts[[3]], probe_parts[[4]], value)
        }
    }

    #Write data for javascript visualization
    json <- toJSON(output, pretty=TRUE)
    write(json, file="timeseries.json")

    #End
    list(messages="Finished successfully")
}
