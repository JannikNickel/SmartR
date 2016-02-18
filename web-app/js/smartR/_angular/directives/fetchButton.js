
window.smartRApp.directive('fetchButton', ['rServeService', 'smartRUtils', function(rServeService, smartRUtils) {
    return {
        restrict: 'E',
        scope: {
            conceptMap: '=',
            showSummaryStats: '=',
            summaryData: '='
        },
        template: '<input type="button" value="Fetch Data"><span style="padding-left: 10px;"></span>',
        link: function(scope, element) {
            var template_btn = element.children()[0];
            var template_msg = element.children()[1];

            template_btn.onclick = function() {

                var showSummary = scope.showSummaryStats;

                template_btn.disabled = true;
                template_msg.innerHTML = 'Fetching data, please wait <span class="blink_me">_</span>';

                var conceptKeys = smartRUtils.conceptBoxMapToConceptKeys(scope.conceptMap);

                rServeService.loadDataIntoSession(conceptKeys).then(
                    function(msg) { template_msg.innerHTML = 'Success: ' + msg; },
                    function(msg) { template_msg.innerHTML = 'Failure: ' + msg; }
                ).finally(function() {
                        if (showSummary) {
                            rServeService.executeSummaryStats('fetch').then (
                                function(msg) {

                                    template_msg.innerHTML = 'Success: ' + msg;
                                    scope.summaryData = {
                                        img : '--',
                                        result : ['--']
                                    };
                                    console.log(scope.summaryData);
                                },
                                function(msg) { template_msg.innerHTML = 'Failure: ' + msg; }
                            );
                        } 
                        template_btn.disabled = false;
                        
                });

            };
        }
    };
}]);
