//# sourceURL=timeseries.js

'use strict';

window.smartRApp.controller('TimeseriesController', [
    '$scope',
    'smartRUtils',
    'commonWorkflowService',
    function($scope, smartRUtils, commonWorkflowService) {

        commonWorkflowService.initializeWorkflow('timeseries', $scope);

        $scope.fetch = {
            running: false,
            disabled: false,
            button: {
                disabled: false,
                message: ''
            },
            loaded: false,
            conceptBoxes: {
                highDimensional: {concepts: [], valid: false}
            }
        };

        $scope.runAnalysis = {
            running: false,
            disabled: true,
            scriptResults: {},
            params: {
                transformation: 'raw'
            }
        };

        $scope.$watch(function() {
            return $scope.fetch.conceptBoxes.highDimensional.concepts.length;
        },
        function() {
            $scope.fetch.button.disabled = false;
            $scope.fetch.button.message = '';
        });

        $scope.$watchGroup(['fetch.running', 'runAnalysis.running'],
            function(newValues) {
                var fetchRunning = newValues[0],
                    runAnalysisRunning = newValues[1];

                // clear old results
                if (fetchRunning) {
                    $scope.runAnalysis.scriptResults = {};
                }

                // disable tabs when certain criteria are not met
                $scope.fetch.disabled = runAnalysisRunning;
                $scope.runAnalysis.disabled = fetchRunning || !$scope.fetch.loaded;
            }
        );

    }]);