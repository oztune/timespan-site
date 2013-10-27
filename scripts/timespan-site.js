/*
To figure out:
- Documentation page
- Unit tests
*/

(function () {
    'use strict';

    angular.module('timespan-site', [])
        .constant('examples', [
            'last week',
            'today',
            'ytd',
            'this quarter',
            'q2 2012',
            'past 50 days'
        ])
        .controller('example', function ($scope, $timeout, examples) {
            var timeout = null,
                focusTimeout;

            $scope.dateInput = '';
            $scope.state = 'start';
            $scope.examples = examples;
            $scope.examplesLimit = 4;

            $scope.setInput = function (value) {
                $scope.dateInput = value;
                setTimeout(function () {
                    $('input').select();
                });
            };

            $scope.$watch('focused', function (value, oldValue) {
                if (value === oldValue) return;
                if ($scope.state === 'start') $scope.state = 'empty';

                $timeout.cancel(focusTimeout);

                if (!value) {
                    focusTimeout = $timeout(function () {
                        $scope.notFocused = true;
                    }, 500);
                } else {
                    $scope.notFocused = false;
                }
            });

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
                    $scope.state = 'loading';
                    timeout = $timeout(function () {
                        $scope.state = 'invalid';
                    }, 300);
                }
            });
        })
        .directive('focused', function ($parse) {
            return {
                restrict: 'A',
                link: function (scope, el, attrs) {
                    var parsed = $parse(attrs.focused);
                    el.focus(function () {
                        parsed.assign(scope, true);
                        scope.$apply();
                    });
                    el.blur(function () {
                        parsed.assign(scope, false);
                        scope.$apply();
                    });
                }
            };
        })
        .directive('flipThrough', function () {
            return {
                restrict: 'A',
                scope: true,
                link: function (scope, el, attrs) {
                    var list = scope.$eval(attrs.flipThrough),
                        toUse;

                    change();

                    function change () {
                        var index, value;

                        if (!toUse || toUse.length === 0) toUse = [].concat(list);

                        index = Math.floor(Math.random() * toUse.length);
                        value = toUse[index];

                        toUse.splice(index, 1);

                        scope.flipThrough = value;
                        
                        el.stop(true, true)
                            .css('top', '-100%')
                            .animate({
                                'top': '0%'
                            }, 300)
                            .delay(2000)
                            .animate({
                                'top': '100%'
                            }, 300, function () {
                                change();
                                scope.$apply();
                            });
                    }
                }
            };
        });
}());