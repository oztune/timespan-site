(function () {
    'use strict';
    angular.module('timespan-site', [])
        .controller('example', function ($scope, $timeout) {
            $scope.dateInput = '';
            $scope.state = 'start';

            var timeout = null;

            $scope.$watch('dateInput', function (value, oldValue) {
                if (value === oldValue) return;

                $timeout.cancel(timeout);

                if (!value) {
                    $scope.state = 'empty';
                    return;
                }

                var span = timespan(value),
                    start = span.start(),
                    end = span.end(),
                    valid = start && end;

                if (valid) {
                    $scope.state = 'valid';
                    $scope.start = start.format('LLL');
                    $scope.end = end.format('LLL');
                } else {
                    // Give it a sec
                    $scope.state = 'empty';
                    timeout = $timeout(function () {
                        $scope.state = 'invalid';
                    }, 300);
                }
            });
        });
}());