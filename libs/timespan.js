(function (window, moment, DateParser, undefined) {
'use strict';

///////////
// Utils //
///////////

var $date = moment,
    isMoment = $date.isMoment,
    // TODO: Remove these dependencies
    isArray = jQuery.isArray,
    isDate = angular.isDate;

// Date min/max. Null is bigger
// and smaller
function min (a, b) {
    if (!a || !b) return null;
    return a < b ? a : b;
}
function max (a, b) {
    if (!a || !b) return null;
    return a > b ? a : b;
}
function isTimespan (value) {
    return value instanceof timespan;
}

// timespan rules
// - Start and end can be null
// - Invalid input becomes null
// - Start will always be before end (automatic)
function timespan (start, end) {
    return new timespan.fn.init(start, end);
}

timespan.fn = timespan.prototype = {
    _start: null,
    _end: null,

    init: function (start, end) {
        this.range(start, end);
    },

    range: function (a, b) {
        a = parseInput(a);
        b = (b === undefined) ? a : parseInput(b);

        // We allow the parser to include meta data
        // about the date range.
        if (isTimespan(a) && a === b) {
            // TODO: Make this work properly.
            this.meta = a.meta;
        }

        // Handles the case that two different spans are passed in
        // but aren't in order or are overlapping
        if (isTimespan(a) && isTimespan(b) && a !== b) {
            return this.range(min(a._start, b._start), max(a._end, b._end));
        }

        // Clean out any previous values so
        // swapping doesn't occur too early
        this._start = this._end = null;
        this.start(a).end(b);

        return this;
    },

    // start() / end()
    // Beware that while the values returned by these
    // represent the internal values, the internal
    // values may change later making the returned
    // value no longer useful for setting.

    start: function (value) {
        if (arguments.length === 0) return this._start;

        value = parseInput(value);
        if (isTimespan(value)) value = value.start();

        this._start = value && $date(value);

        normalizeDirection(this);

        return this;
    },
    end: function (value) {
        if (arguments.length === 0) return this._end;

        value = parseInput(value);
        if (isTimespan(value)) value = value.end();

        this._end = value && $date(value);

        normalizeDirection(this);

        return this;
    },

    startDate: function () {
        return this._start && this._start.toDate();
    },
    endDate: function () {
        return this._end && this._end.toDate();
    },

    // Setter only works if start() is valid.
    duration: function () {
        var duration;

        if (arguments.length === 0) {
            if (!this.isFinite()) return false;
            if (!this.isValid()) return false;

            return $date.duration(this.end() - this.start());
        } else if (this._start && this._start.isValid()) {
            duration = $date.duration.apply($date, arguments);
            this.end(this.start().clone().add(duration));
            return this;
        }
    },

    isValid: function () {
        if (this._start && !this._start.isValid()) return false;
        if (this._end && !this._end.isValid()) return false;
        return true;
    },
    isFinite: function () {
        return this._start != null && this._end != null;
    },

    // A more loose version of equals
    is: function (value) {
        return this.equals(timespan(value));
    },
    equals: function (span) {
        if (!isTimespan(span)) return false;

        return compare(this, span, function (aStart, aEnd, bStart, bEnd) {
            return aStart === bStart && aEnd === bEnd;
        }, false);
    },

    lerp: function (percent) {
        var start, end;

        if (!this.isValid()) return null;

        start = this._start;
        end = this._end;

        if (!start || !end) return null;

        if (typeof percent !== 'number') percent = 0.5;

        return $date(start + Math.round((end - start) * percent));
    },
    toDate: function (percent) {
        var lerped = this.lerp(percent);
        return lerped && lerped.toDate();
    },
    toArray: function () {
        return [this.startDate(), this.endDate()];
    },
    intersection: function (span) {
        return compare(this, span, function (aStart, aEnd, bStart, bEnd) {
            // Not touching
            if (aStart > bEnd || bStart > aEnd) return null;
            return timespan(Math.max(aStart, bStart), Math.min(aEnd, bEnd));
        }, null);
    },

    toString: function () {
        var start = this._start ? this._start.toDate() : 'null',
            end = this._end ? this._end.toDate() : 'null';
        return start + ' - ' + end;
    },

    // Helpers
    unit: function (unit) {
        var start = this.start(),
            end = this.end();

        return this.range(start && start.startOf(unit),
                            end && end.endOf(unit));
    },

    // Make sure that this span is contained in
    // the given span. If the spans don't intersect,
    // this timespan becomes infinite (null, null).
    clip: function (span) {
        var intersection;

        // Small optimization
        if (span == null) return this;

        intersection = this.intersection(span);
        return this.range(intersection);
    },

    contains: function (span) {
        var intersection = this.intersection(span);
        if (!intersection) return false;
        return intersection.is(span);
    },
    intersects: function (span) {
        return this.intersection(span) != null;
    },

    // Doesn't count intersections
    isBefore: function (span) {
        return compare(this, span, function (aStart, aEnd, bStart, bEnd) {
            return aEnd < bStart;
        }, false);
    },
    // Doesn't count intersections
    isAfter: function (span) {
        return compare(this, span, function (aStart, aEnd, bStart, bEnd) {
            return aStart > bEnd;
        }, false);
    },

    // TODO: Is this useful?
    quantify: function () {
        return quantifyTimespan(this);
    }
};

// This is how jQuery does it
timespan.fn.init.prototype = timespan.fn;

//////////
// Core //
//////////

// Makes sure start is before end
function normalizeDirection(span) {
    var date;

    if (span._start && span._end &&
        span._end < span._start) {

        date = span._start,
        span._start = span._end;
        span._end = date;
    }
}

// Input:
// string | Date | timespan | $date | number (mills)
// Returns either $date(), timespan() or null
//
// Infinity/-Infinity become null
// Doesn't re-wrap values that are already $date or timespan
function parseInput(value) {
    if (isMoment(value) || (isTimespan(value))) return value;

    if (typeof value === 'string') return timespan.parse(value);
    if (value === Infinity || value === -Infinity) value = null;
    if (typeof value === 'number' || isDate(value)) return $date(value);
    if (isArray(value)) return timespan(value[0], value[1]);

    return null;
}

// Same as parseInput, but if the value isn't a
// timestamp it tries to turn it into one. Doesn't wrap
// null though.
function parseTimespan (value) {
    value = parseInput(value);
    if (isTimespan(value)) return value;
    return value && timespan(value);
}

// Span: any valid input
// Returns an array with [number,number]
// If any part of the span is invalid,
// returns null
// null start = -Infinity
// null end = Infinity
function quantifyTimespan(span) {
    var start = -Infinity,
        end = Infinity;

    span = parseTimespan(span);

    if (span) {
        if (!span.isValid()) return null;

        start = (span.start() || start).valueOf();
        end = (span.end() || end).valueOf();
    }

    return [start, end];
}

// Utility for comparing two timespans
// quantitatively.
function compare(a, b, fn, nullValue) {
    a = quantifyTimespan(a);
    if (!a) return nullValue;
    b = quantifyTimespan(b);
    if (!b) return nullValue;

    return fn (a[0], a[1], b[0], b[1]);
}

////////////////
// Extendible //
////////////////

timespan.parse = function (string) {
    var parser = new DateParser(),
        options = timespan.parse.options || {},
        value;

    parser.bias = options.bias;
    parser.today = options.now || new Date();

    value = parser.parse(string);

    if (isArray(value) || isDate(value)) {
        value = timespan(value);
        value.meta = {
            selector: string
        };
        return value;
    }

    return null;
};
timespan.parse.options = {
    bias: -1
};

timespan.date = $date;

window.timespan = timespan;

}(window, window.moment, window.DateParser));