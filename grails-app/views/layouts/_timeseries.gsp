<script type="text/ng-template" id="timeseries">
<div ng-controller="TimeseriesController">
    <tab-container>
        <workflow-tab tab-name="Fetch Data" disabled="fetch.disabled">
            <concept-box style="display: inline-block;"
                         concept-group="fetch.conceptBoxes.highDimensional"
                         type="HD"
                         min="1"
                         max="-1"
                         label="High Dimensional Variables"
                         tooltip="Select one or more high dimensional time series variables that you would like to have displayed.">
            </concept-box>
            <br/>
            <br/>
            <hr class="sr-divider">
            <fetch-button concept-map="fetch.conceptBoxes"
                          loaded="fetch.loaded"
                          running="fetch.running"
                          disabled="fetch.disabled"
                          allowed-cohorts="[1]">
            </fetch-button>
        </workflow-tab>

        <workflow-tab tab-name="Run Analysis" disabled="runAnalysis.disabled">
            <div class="heim-input-field sr-input-area">
                <h2>Data transformation:</h2>
                <fieldset class="heim-radiogroup">
                    <label>
                        <input type="radio"
                               ng-model="runAnalysis.params.transformation"
                               value="raw" checked> Raw Values
                    </label>
                    <label>
                        <input type="radio"
                               ng-model="runAnalysis.params.transformation"
                               value="log2"> Log2
                    </label>
                    <label>
                        <input type="radio"
                               ng-model="runAnalysis.params.transformation"
                               value="log10"> Log10

                    </label>
                </fieldset>
            </div>
            <hr class="sr-divider">
            <run-button button-name="Create Graph"
                        store-results-in="runAnalysis.scriptResults"
                        script-to-run="run"
                        arguments-to-use="runAnalysis.params"
                        filename="timeseries.json"
                        running="runAnalysis.running">
            </run-button>
            <!--<capture-timeseries-button filename="timeseries.svg" target="timeseries"></capture-timeseries-button>-->
            <br/>
            <br/>
            <timeseries data="runAnalysis.scriptResults"></timeseries>
        </workflow-tab>

    </tab-container>

</div>

</script>