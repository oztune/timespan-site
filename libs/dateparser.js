//"use strict";

var TOK = { //CHANGE TO INTS LATER
    RAWSTRING: 'RAWSTRING',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    DAY_OF_MONTH: 'DAY OF MONTH',
    MONTH: 'MONTH',
    DOW: 'DOW',
    DATE: 'DATE',
    RANGE: 'RANGE',
    POLY: 'POLY',
    REL_ADJ_MID: 'REL ADJ MID',
    REL_ADJ_SFX: 'REL ADJ SFX',
    REL_RANGE_MID: 'REL RANGE MID',
    REL_RANGE_END: 'REL RANGE END',
    RANGE_SEP_MID: 'RANGE SEP MID',
    TIME_UNIT: 'TIME UNIT',
    DURATION: 'TIME DURATION',
    TIME_TIME: 'TIME TIME',
    ADD: 'ADD',
    QUART: 'QUART',
    BEG_END: 'BEG_END',
    NEXT_LAST: 'NEXT_LAST',
    EXPR: 'EXPR',
    RANGE_DRILL: 'RANGE DRIL',
    SLASH_DATE: 'SLASH DATE'
};

var DateParser = (function () {
    var _arrayMap = function (self, fun /*, thisp*/) {
        var len = self.length;
        if (typeof fun != "function")
            throw new TypeError();

        var res = new Array(len);
        var thisp = arguments[2];
        for (var i = 0; i < len; i++) {
            if (i in self)
                res[i] = fun.call(thisp, self[i], i, self);
        }

        return res;
    };

    var _isArray = function (vArg) {
        return Object.prototype.toString.call(vArg) === "[object Array]";
    };

    var _xtokdate = function (y, m, d) {
        if (y < 500) {
            if (y >= 1 && y < 50) y = 2000 + _parseInt(y);
            if (y > 50 && y < 100) y = 1900 + _parseInt(y);
        }
        return new Date(y, (m + 11) % 12, d);
    };

    var _tokdate = function (ctx, y, m, d) {
        m = typeof (m) == "object" ? m[1] : m;
        d = typeof (d) == "object" ? d[1] : d;

        m = typeof (m) == "string" ? _parseInt(m) : m;
        d = typeof (d) == "string" ? _parseInt(d) : d;
        y = typeof (d) == "string" ? _parseInt(y) : y;


        if (m > 12) return false;
        if (d >= 32) return false;


        var dat;
        if (y == null) {
            var x = null;
            var best;
            for (i = -2; i < 4; ++i) {
                var dat_o = _xtokdate(ctx.today.getFullYear() + i, m, d);
                if (ctx.bias > 0 && ctx.today.valueOf() > dat_o.valueOf()) continue; //Disallow Past
                if (ctx.bias < 0 && ctx.today.valueOf() < dat_o.valueOf()) continue; //Disallow Future
                var diff = Math.abs(ctx.today.valueOf() - dat_o.valueOf())
                if (x == null || diff < x) { x = diff; best = i; }
            }
            dat = _xtokdate(ctx.today.getFullYear() + best, m, d);
        } else {
            y = typeof (y) == "object" ? y[1] : y;
            y = typeof (d) == "string" ? _parseInt(y) : y;
            var dat = _xtokdate(y, m, d);
        }
        return isNaN(d.valueOf()) ? false : [TOK.DATE, dat];
    };

    //TODO:Really need better Date Stuff Here
    var _adjust_date = function (dati, adj, dir) {
        var dat = new Date(dati.valueOf());
        var day = 24 * 3600 * 1000;
        var dms = dat.getMonth() + dat.getFullYear() * 12;
        switch (adj.length) {
            case 5:
            case 4:
            case 3:
                var of = dat.valueOf();
                of += day * adj[2] * dir;
                dat = new Date(of);

                //if ( dat.getSecounds() == 59 ) dat = new Date(of + 1000); // Leep Second
                //if ( dat.getSecounds() == 1 ) dat = new Date(of - 1000); // Leep Second
                if (dat.getHours() == 23) dat = new Date(of + 3600 * 1000); // DST 
                if (dat.getHours() == 1) dat = new Date(of + -3600 * 1000); // DST

                dms = dat.getMonth() + dat.getFullYear() * 12;
            case 2:
                dms += adj[1] * dir;
            case 1:
                dms += adj[0] * 12 * dir;
                break;
        }
        dat.setMonth(dms % 12);
        dat.setYear(dms / 12);
        return dat;
    };

    var _parseInt = function (x) {
        return Math.floor(Number(x));
        //return parseInt(('' + x).replace(/ /g, '').replace(/^0*/d, ''));
    };

    var _pindex = function (m, s) {
        var val;
        for (var i = 0, icount = m.length; i < icount; ++i) {
            if (i <= s) continue;
            //val = m[i];
            //if (val !== undefined && ('' + val).length > 0) {
            if (m[i] != undefined) {
                return i - s;
            }
        }
    };

    var _order_dates = function (d1, d2) {
        return d1.valueOf() > d2.valueOf() ? [d2, d1] : [d1, d2];
    };

    var _align_date = function (d, tv) {
        if (tv.length == 3) {
            switch (tv[2]) {
                case 7:
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
                default:
                    return d
            }
        } else if (tv.length == 2) {
            return new Date(d.getFullYear(), d.getMonth(), 1);
        } else {
            return new Date(d.getFullYear(), 0, 1);
        }
    };

    var _str2ex = function (str) {
        if (typeof (str) != "string") return str;
        return new RegExp(str, "i");
    };

    function DateParser() {
        // if user accidentally omits the new keyword, this will 
        // silently correct the problem...
        if (!(this instanceof DateParser))
            return new DateParser();

    }

    DateParser.prototype = {
        today: new Date(), //Current Time
        bias: 0,
        addDate: function (name, date) {
            this._user_tokens.splice(0, 0, [_str2ex(name), function () { return [TOK.DATE, date]; } ])
        },
        addDateRange: function (name, d1, d2) {
            this._user_tokens.splice(0, 0, [_str2ex(name), function () { return [TOK.RANGE, _order_dates(d1, d2)]; } ])
        },
        aliasString: function (name, result) {
            this._aliased_strings.splice(0, 0, [_str2ex(name), result]);
        },
        parse: function (str) {
            return this.parseFull(str)[0];
        },
        parseFull: function (str) {
            //str = str.replace(/\s+\-\s+/g, ' to ');
            var tokens = this.tokenize(str, true);
            var fin = this.buildast(tokens);
            if (fin == undefined) return undefined;
            if (fin[0] == TOK.DATE) return [fin[1], fin];
            if (fin[0] == TOK.RANGE) return [[fin[1][0], fin[1][1]], fin];
            return [undefined, fin];
        },
        parseRange: function (str) {
            var x = this.parse(str);

            if (_isArray(x)) return x;

            if (x == undefined) return undefined;
            return [x, x];
        },
        tokenize: function (str, replace) {
            //var mtokens = this._tokens;
            var mtokens = this._user_tokens.concat(this._tokens);

            var tokens = [[TOK.STRING, str, [[0, str.length]]]];
            tnextround:
            while (true) {
                for (var om = 0, omcount = tokens.length; om < omcount; ++om) {
                    if (tokens[om][0] != TOK.STRING) continue;
                    var toktext = tokens[om][1];
                    var string_offset = tokens[om][2][0];
                    for (var oc = 0, occount = mtokens.length; oc < occount; ++oc) {
                        var match = mtokens[oc][0].exec(toktext);
                        if (match) {
                            var ml = match[0].length;
                            var mv;
                            for (var mi = 1, mc = match.length; mi < mc; ++mi) {
                                mv = match[mi];
                                if (mv !== undefined && ('' + mv).length <= 0) {
                                    match[mi] = undefined;
                                }
                            }
                            var newtok = mtokens[oc][1].call(this, match);
                            newtok[2] = [[TOK.RAWSTRING, string_offset[0] + match.index, ml]];
                            tokens.splice(om, 1);

                            var right = toktext.substr(match.index + ml);
                            var left = toktext.substr(0, match.index);
                            if (/^[\s,]*$/.test(right) == false) tokens.splice(om, 0,
                    [TOK.STRING, right, [[string_offset[0] + match.index + ml, string_offset[1] - (match.index + ml)]]]);
                            tokens.splice(om, 0, newtok);
                            if (/^[\s,]*$/.test(left) == false) tokens.splice(om, 0, [TOK.STRING, left, [[string_offset[0], match.index]]]);
                            continue tnextround;
                        }
                    }
                    if (replace)
                        for (var i = 0, icount = this._aliased_strings.length; i < icount; ++i) {
                            var x = this._aliased_strings[i];
                            var match = x[0].exec(toktext);
                            if (match) {
                                var ml = match[0].length

                                var sstr = match[0].replace(x[0], x[1]);
                                tokens.splice(om, 1);
                                var list = this.tokenize(sstr, false);
                                var left = toktext.substr(0, match.index);
                                var right = toktext.substr(match.index + ml);
                                var oo = _parseInt(om);
                                if (/^[\s,]*$/.test(left) == false) {
                                    tokens.splice(oo, 0, [TOK.STRING, left, [[string_offset[0], match.index]]]);
                                    ++oo;
                                }
                                for (var so = 0, socount = list.length; so < socount; ++so) {
                                    list[so][2][0][1] = string_offset[0] + match.index;
                                    list[so][2][0][2] = match[0].length;
                                    tokens.splice(oo, 0, list[so]);
                                    ++oo;
                                }
                                if (/^[\s,]*$/.test(right) == false) {
                                    tokens.splice(oo, 0, [TOK.STRING, right,
              [[string_offset[0] + match.index + ml, string_offset[1] - (match.index + ml)]]]);
                                }
                                continue tnextround;
                            }
                        }
                }
                return tokens;
            }
        },

        buildast: function (tokens) {
            var work;
            nextround:
            while (true) {
                for (var oc = 0, occount = this._ast_rules.length; oc < occount; ++oc) {
                    var rule = this._ast_rules[oc];
                    for (offset = 0, offsetcount = tokens.length; offset < offsetcount; ++offset) {
                        if (this._tryapplyrule(rule, tokens, offset)) {
                            continue nextround;
                        }
                    }
                }
                for (var ocf = 0, ocfcount = this._ast_exact_match.length; ocf < ocfcount; ++ocf) {
                    var rule = this._ast_exact_match[ocf];
                    //if (!rule) continue;
                    if (rule[0].length == tokens.length) {
                        if (this._tryapplyrule(rule, tokens, 0)) {
                            continue nextround;
                        }
                    }
                }
                return tokens.length == 1 && (tokens[0][0] != TOK.RANGE || tokens[0][0] != TOK.DATE) ? tokens[0] : [TOK.JUNK, undefined, tokens];
            }
        },

        _tryapplyrule: function (rule, mtokens, offset) {
            var tokens = [];
            var off = _parseInt(offset);
            if (!rule) return false;
            for (var ro = 0, rocount = rule[0].length; ro < rocount; ++ro) {
                var to = off + _parseInt(ro);
                if (to >= mtokens.length) return false;
                var tt = mtokens[to];
                var rt = rule[0][ro];

                var optional = false;
                if (_isArray(rt)) {
                    rt = rt[0];
                    optional = true;
                }
                if (tt[0] != TOK.POLY) {
                    if (rt != mtokens[to][0]) {
                        if (!optional) return false;
                        --off;
                        tokens[ro] = null;
                    } else {
                        tokens[ro] = mtokens[to];
                    }
                } else {
                    for (var po = 0, pocount = tt[1].length; po < pocount; ++po) {
                        if (rt == tt[1][po][0]) {
                            tokens[ro] = tt[1][po];
                            tokens[ro][2] = tt[2];
                        }
                    }
                    if (tokens[ro] == undefined && !optional) {
                        return false;
                    }
                }
            }

            var result = rule[1].apply(this, tokens);
            if (!(typeof (result) == "object")) {
                return false;
            }
            mtokens.splice(offset, rule[0].length)
            result[2] = tokens;
            result.origin = rule; ;
            mtokens.splice(offset, 0, result)


            return true;
        },
        /* Private Stuff, Or Whatever */
        _tokens: [
          [/[(](.*?)[)]/i, function (m) { return [TOK.EXPR, m[1]]; } ],
          [/\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})( ?[0-9:.]{5,10})?\b/i, function (m) { return _tokdate(this, m[1], m[2], m[3]); } ],
          [/\b(\d{1,4})[\/-](\d{1,4})[\/-](\d{1,4})\b/i, function (m) { return [TOK.SLASH_DATE, [m[1], m[2], m[3]]]; } ],
          [/\b(\d{1,2})[\/-](\d{1,2})\b/i, function (m) { return [TOK.SLASH_DATE, [m[1], m[2]]]; } ],
          [/(going ?)?back (from|until)/i, function (m) { return [TOK.REL_RANGE_MID, -1] } ],
          [/(ago from|prior to)/i, function (m) { return [TOK.REL_ADJ_MID, -1]; } ],
          [/\b(ago)|(from now)\b/i, function (m) { return [TOK.REL_ADJ_SFX, m[1] == undefined ? 1 : -1] } ],
          [/\bnow|today|tonight\b/i, function (m) { return [TOK.DATE, this.today] } ],
          [/\byesterday\b/i, function (m) { return [TOK.DATE, _adjust_date(this.today, [0, 0, -1], 1)]; } ],
          [/\btomorrow\b/i, function (m) { return [TOK.DATE, _adjust_date(this.today, [0, 0, 1], 1)]; } ],
          [/\bfrom|past\b/i, function (m) { return [TOK.REL_ADJ_MID, 1] } ],
          [/\bbefore\b/i, function (m) { return [TOK.REL_ADJ_MID, -1] } ],
          [/\bafter\b/i, function (m) { return [TOK.REL_ADJ_MID, 1] } ],
          [/\b(beginning of)|(end of)\b/i, function (m) { return [TOK.BEG_END, m[1] == undefined ? 1 : -1]; } ],
          [/\b(last)|(this)|(next)\b/i, function (m) { return [TOK.NEXT_LAST, _pindex(m, 0) - 2] } ],
          [/\b(starting|beginning|forward) ?(at|on|from)?/i, function (m) { return [TOK.REL_RANGE_MID, 1] } ],
          [/\s*-\s*|\b(to|:|until|till|up ?to)\b/i, function (m) { return [TOK.RANGE_SEP_MID, 0] } ],
          [/\b(thru|till|through)\b/i, function (m) { return [TOK.RANGE_SEP_MID, 1] } ],
          [/\blater\b/i, function (m) { return [TOK.POLY, [[TOK.REL_RANGE_END, 1], [TOK.REL_ADJ_SFX, 1]]]; } ],
          [/\bthis\b/i, function (m) { return [TOK.NUMBER, 0] } ],
          [/\b\d\d?:\d\d?\b/i, function (m) { return [TOK.TIME_TIME, 0] } ],
          [/\b(?:the ?)?((first|1st)|(second|2nd)|(third|3rd)|(fourth|4th))\b/i, function (m) { return [TOK.POLY, [[TOK.QUART, _pindex(m, 1)], [TOK.DAY_OF_MONTH, _pindex(m, 1)]]] } ],
          [/\b(\d+) score,?\b/i, function (m) { return [TOK.NUMBER, 20 * _parseInt(m[1])]; } ],
          [/\b(\d+)(th|nd|st|rd)?[,]?\b/i, function (m) { return [TOK.POLY, [[TOK.NUMBER, _parseInt(m[1])], [TOK.DAY_OF_MONTH, _parseInt(m[1])]]]; } ],
          [/\b(?:(a|an|one)|(two)|(three)|(four)|(five)|(six)|(seven)|(eight)|(nine)|(ten))\b/i, function (m) { return [TOK.NUMBER, _pindex(m, 0)]; } ],
          [/\b(?:(January)|(February)|(March)|(April)|(May)|(June)|(July)|(Aug[eu]st)|(September)|(October)|(November)|(December)),?\b/i, function (m) {
              return [TOK.MONTH, _pindex(m, 0)];
          } ],
          [/\b((Jan)|(Feb)|(Mar)|(Apr)|(May)|(June?)|(July?)|(Aug)|(Sept?)|(Oct)|(Nov)|(Dec)),?\b/i, function (m) { return [TOK.MONTH, _pindex(m, 1)]; } ],
          [/\b((Mon)|(Tues?)|(Wed(?:nes)?)|(Th?urs?)|(Fri)|(Satu?r?)|(Sun))(days?)?[.,]?\b/i, function (m) { return [TOK.DOW, _pindex(m, 1)]; } ],
          [/ [+] |(\b(add|and|plus)\b)/, function (m) { return [TOK.ADD, 1] } ],
          [/(\b(minus|subtract)\b)/, function (m) { return [TOK.ADD, -1] } ],

          [/\bfortnights?\b/, function () { return [TOK.TIME_UNIT, [0, 0, 14]]; } ],
          [/\b(Days?|Mornings?|Nights?|Sunsets?|Dawns?)|(Weeks?)|(Months?)|(Quarters?)|(Years?)\b/i, function (m) {
              var offsets = [[0, 0, 1], [0, 0, 7], [0, 1], [0, 3], [1]][_pindex(m, 0) - 1];
              return [TOK.TIME_UNIT, offsets];
          } ],

          [/\b(at )?(noon|midnight)\b/i, function (m) { return [TOK.TIME_TIME, 0] } ],
          [/\bin|of\b/i, function (m) { return [TOK.RANGE_DRILL] } ]
        ],

        _ast_rules: [
          [[TOK.EXPR], function (texp) { return this.parseFull(texp[1])[1]; } ],
        //Scalar ops need to be pretty high
          [[TOK.DATE, TOK.ADD, TOK.DURATION], function (tdate, tadd, tdur) { return [TOK.DATE, _adjust_date(tdate[1], tdur[1], tadd[1])]; } ],
          [[TOK.NUMBER, TOK.ADD, TOK.NUMBER], function (tn1, tadd, tn2) { return [TOK.NUMBER, tn1[1] + tn2[1]]; } ],
          [[TOK.SLASH_DATE], function (dat) {
              var num = _arrayMap(dat[1], function (x) { return _parseInt(x); });
              var d1 = _tokdate(this, num[2], num[0], num[1]);
              if (d1 != false) return d1;
              if (num[0] > 31) {
                  d1 = _tokdate(this, num[0], num[1], num[2]);
                  if (d1 != false) return d1;
              }
              d1 = _tokdate(this, num[2], num[1], num[0]);
              if (d1 != false) return d1;
          } ],

          [[TOK.MONTH, TOK.DAY_OF_MONTH, TOK.NUMBER], function (tmon, tn1, tn2) { return _tokdate(this, tn2, tmon, tn1); } ],
          [[TOK.MONTH, TOK.NUMBER, TOK.DAY_OF_MONTH], function (tmon, tn1, tn2) { return _tokdate(this, tn1, tmon, tn2); } ],

          [[TOK.NUMBER, TOK.TIME_UNIT], function (tnum, tunit) { return [TOK.DURATION, _arrayMap(tunit[1], function (x) { return x * tnum[1]; })]; } ],
          [[TOK.RANGE_DRILL, TOK.DURATION], function (drill, dir) { return [TOK.DATE, _adjust_date(this.today, dir[1], 1)]; } ],

          [[[TOK.DAY_OF_MONTH], TOK.DOW, [TOK.RANGE_DRILL], TOK.RANGE], function (tq, tdow, tin, trng) {
              var d = trng[1][0];
              var dd = (tdow[1] % 7) - d.getDay();
              var tqd = 1;
              if (!tq && tin) return false;
              if (tq) tqd = tq[1];
              if (dd < 0) dd += 7;
              d2 = _adjust_date(d, [0, 0, 1], dd);
              d2 = _adjust_date(d2, [0, 0, 7], tqd - 1);
              return [TOK.DATE, d2];

          } ],

          [[TOK.QUART, TOK.TIME_UNIT, [TOK.RANGE_DRILL], TOK.RANGE], function (tq, tu, tin, trng) {
              var d1 = trng[1][0]
              var d2 = _align_date(d1, tu[1]);
              d2 = _adjust_date(d2, tu[1], tq[1] - 1);
              if (d2.valueOf() > trng[1][1]) return false;
              if (tu[1].length == 3 && tu[1][2] == 1) return [TOK.DATE, d2];
              var d3 = _adjust_date(d2, tu[1], 1)
              d3 = _adjust_date(d3, [0, 0, 1], -1)
              if (d3.valueOf() > trng[1][1]) return false;
              return [TOK.RANGE, _order_dates(d2, d3)];

          } ],

          [[TOK.NEXT_LAST, TOK.TIME_UNIT], function (tlast, tunit) {
              var d1 = _align_date(this.today, tunit[1]);
              d1 = _adjust_date(d1, tunit[1], tlast[1])
              var d2 = _adjust_date(d1, tunit[1], 1)
              d2 = _adjust_date(d2, [0, 0, 1], -1)
              return [TOK.RANGE, _order_dates(d1, d2)];
          } ],

          [[TOK.NEXT_LAST, TOK.DOW], function (tlast, tdow) {
              var d1 = _adjust_date(this.today, [0, 0, 1], 0);
              d1 = _align_date(d1, [0, 0, 7]);
              d1 = _adjust_date(d1, [0, 0, 1], tdow[1]);
              //while ( d1.valueOf() < this.today.valueOf() ) 
              //  d1 = _adjust_date(d1, [0,0,7], 1);

              d1 = _adjust_date(d1, [0, 0, 7], tlast[1]);
              return [TOK.DATE, d1];
          } ],
          [[TOK.NEXT_LAST, TOK.MONTH], function (tlast, tmon) {
              if (tlast[1] != 1) return tmon;
              var d1 = _tokdate(this, null, tmon[1])[1]
              d1 = _adjust_date(d1, [1], tlast[1])
              d2 = _adjust_date(d1, [0, 1], 1)
              d2 = _adjust_date(d2, [0, 0, 1], -1)

              return [TOK.DATE, _order_dates(d1, d2)];
          } ],

          [[TOK.DURATION, TOK.REL_ADJ_MID, TOK.DATE], function (tdur, tsep, tdat) { return [TOK.DATE, _adjust_date(tdat[1], tdur[1], tsep[1])]; } ],
          [[TOK.DURATION, TOK.REL_ADJ_SFX, TOK.DATE], function (tdur, tsep, tdat) { return [TOK.DATE, _adjust_date(tdat[1], tdur[1], tsep[1])]; } ], //?? NOT SURE
          [[TOK.DURATION, TOK.RANGE_SEP_MID, TOK.DATE], function (tdur, tsep, tdat) {
              var d2 = _adjust_date(tdat[1], tdur[1], tsep[1])
              return [TOK.RANGE, _order_dates(tdat[1], d2)];
          } ],

          [[TOK.QUART, TOK.TIME_UNIT, TOK.NUMBER], function () {
              if (arguments[1][1].length == 2 && arguments[1][1][1] == 3) {
                  var d1 = _tokdate(this, arguments[2][1], 1, 1);
                  d1 = _adjust_date(d1[1], arguments[1][1], arguments[0][1] - 1)
                  var d2 = _adjust_date(d1, arguments[1][1], 1);
                  d2 = _adjust_date(d2, [0, 0, 1], -1);
                  return [TOK.RANGE, _order_dates(d1, d2)];
              }
              return false
          } ],

          [[TOK.RANGE, TOK.RANGE_SEP_MID, TOK.RANGE], function () {
              var x1 = _order_dates(arguments[0][1][0], arguments[2][1][0]);
              var x2 = _order_dates(arguments[0][1][1], arguments[2][1][1]);
              return [TOK.RANGE, _order_dates(x1[0], x2[1])];
          } ],
          [[TOK.DATE, TOK.RANGE_SEP_MID, TOK.RANGE], function () {
              var x1 = _order_dates(arguments[0][1], arguments[2][1][0]);
              var x2 = _order_dates(arguments[0][1], arguments[2][1][1]);
              return [TOK.RANGE, _order_dates(x1[0], x2[1])];
          } ],
          [[TOK.RANGE, TOK.RANGE_SEP_MID, TOK.DATE], function () {
              var x1 = _order_dates(arguments[2][1], arguments[0][1][0]);
              var x2 = _order_dates(arguments[2][1], arguments[0][1][1]);
              return [TOK.RANGE, _order_dates(x1[0], x2[1])];
          } ],

          [[TOK.BEG_END, TOK.TIME_UNIT], function () {
              if (arguments[1][1].length == 1) {
                  switch (arguments[0][1]) {
                      case -1: return _tokdate(this, this.today.getFullYear(), 1, 1);
                      case 1:
                          var x = _tokdate(this, this.today.getFullYear(), 1, 1);
                          x = _adjust_date(x[1], [1, 0, 0], 1);
                          x = _adjust_date(x, [0, 0, 1], -1);
                          return [TOK.DATE, x];
                      default:
                          return false
                  }
              }
          } ],

          [[TOK.QUART, TOK.TIME_UNIT], function () {
              if (arguments[1][1].length == 2 && arguments[1][1][1] == 3) {
                  var d1 = _tokdate(this, this.today.getFullYear(), 1, 1);
                  d1 = _adjust_date(d1[1], arguments[1][1], arguments[0][1] - 1)
                  var d2 = _adjust_date(d1, arguments[1][1], 1);
                  d2 = _adjust_date(d2, [0, 0, 1], -1);
                  return [TOK.RANGE, _order_dates(d1, d2)];
              }
              return false
          } ],


          [[TOK.DURATION, TOK.REL_RANGE_MID, TOK.DATE], function () {
              var d1 = arguments[2][1];
              var d2 = _adjust_date(d1, arguments[0][1], arguments[1][1]);
              return [TOK.RANGE, _order_dates(d1, d2)];
          } ],
          [[TOK.DATE, TOK.RANGE_SEP_MID, TOK.DURATION, TOK.REL_RANGE_END], function () {
              var d1 = arguments[0][1];
              var d2 = _adjust_date(d1, arguments[2][1], arguments[3][1]);
              return [TOK.RANGE, _order_dates(d1, d2)];
          } ],


          [[TOK.DATE, TOK.RANGE_SEP_MID, TOK.DATE], function (tdat1, trs, tdat2) { return [TOK.RANGE, _order_dates(tdat1[1], tdat2[1])] } ],
          [[TOK.RANGE, TOK.RANGE_SEP_MID, TOK.DATE], function (trng, trs, tdat) {
              var d1 = _order_dates(trng[1][0], tdat[1])[0];
              var d2 = _order_dates(trng[1][1], tdat[1])[1];
              return [TOK.RANGE, _order_dates(d1, d2)]
          } ],
        //Lose Dates  
          [[TOK.DAY_OF_MONTH, TOK.MONTH, TOK.NUMBER], function () { return _tokdate(this, arguments[2], arguments[1], arguments[0]); } ],
          [[TOK.NUMBER, TOK.MONTH, TOK.DAY_OF_MONTH], function () { return _tokdate(this, arguments[0], arguments[1], arguments[2]); } ],

          [[TOK.MONTH, TOK.DAY_OF_MONTH], function () {
              if (arguments[1][1] > 31) {
                  var d1 = _tokdate(this, arguments[1], arguments[0], 1)[1];
                  var d2 = _adjust_date(d1, [0, 1], 1);
                  d2 = _adjust_date(d2, [0, 0, 1], -1);
                  return [TOK.RANGE, _order_dates(d1, d2)];
              }
              return _tokdate(this, null, arguments[0], arguments[1]);
          } ],
          [[TOK.DAY_OF_MONTH, TOK.MONTH], function () {
              if (arguments[0][1] > 32) return false;
              return _tokdate(this, null, arguments[1], arguments[0]);
          } ],


          [[TOK.NUMBER, TOK.DOW, TOK.REL_ADJ_SFX], function () {
              var dt = _align_date(this.today, [0, 0, 7]);
              return [TOK.DATE, _adjust_date(dt, [0, 0, 7 * arguments[0][1]], arguments[2][1])];
          } ],
        //Really last resort sorts of things
          [[TOK.DURATION, TOK.REL_ADJ_SFX], function () { return [TOK.DATE, _adjust_date(this.today, arguments[0][1], arguments[1][1])]; } ],

          [[TOK.NEXT_LAST, TOK.DURATION], function (nl, dur) {
              if (arguments[0][1] != 1) return [TOK.DURATION, dur[1]];
              var d1 = this.today;
              var d2 = _adjust_date(this.today, arguments[1][1], arguments[0][1])
              return [TOK.DATE, _order_dates(d1, d2)];
          } ],
        //Do these somewhere else?
          [[TOK.MONTH], function () {
              var d1 = _tokdate(this, null, arguments[0], 1);
              var d2 = _tokdate(this, d1[1].getFullYear(), 1 + (d1[1].getMonth() + 1) % 12, 0);
              return [TOK.RANGE, _order_dates(d1[1], d2[1])];
          } ],
          [[TOK.DOW], function () {
              var adj = arguments[0][1] - this.today.getDay();
              if (adj < 0 && this.bias > 0) adj += 7;
              if (adj > 0 && this.bias < 0) adj -= 7;
              return [TOK.DATE, _adjust_date(this.today, [0, 0, 1], adj)];
          } ],
          [[TOK.TIME_TIME], function () { return []; } ],
          [[TOK.STRING], function () { return []; } ],
          [[TOK.NUMBER], function (num) {
              if (num[1] > 1000 && num[1] < 5000) {
                  var d1 = _tokdate(this, num[1], 1, 1);
                  var d2 = _adjust_date(d1[1], [1], 1);
                  d2 = _adjust_date(d2, [0, 0, 1], -1);
                  return [TOK.RANGE, [d1[1], d2]];
              }
              return false;
          } ]
        ],

        _ast_exact_match: [
        //Implied Now
          [[TOK.RANGE_SEP_MID, TOK.DATE], function () {
              var d1 = this.today
              var d2 = arguments[1][1];
              return [TOK.RANGE, _order_dates(d1, d2)];
          } ],
          [[TOK.MONTH, TOK.DAY_OF_MONTH], function () {
              var x = arguments[1][1];
              if (x < 1000 || x > 10000) return false;
              var d1 = _tokdate(this, x, arguments[0], 1);
              var d2 = _tokdate(this, x, _parseInt(arguments[0][1]) + 1, 0);
              return [TOK.RANGE, _order_dates(d1[1], d2[1])];
          } ],
          [[[TOK.REL_ADJ_MID], TOK.DURATION], function () {
              var d1 = this.today;
              var d2 = _adjust_date(d1, arguments[1][1], -1);
              return [TOK.RANGE, _order_dates(d1, d2)];
          } ]
        ],

        _aliased_strings: [
          [/\bhence\b/i, "from today"],
          [/\bYTD\b/i, "until beginning of year"],
          [/\bQ ?1\b/i, "First Quarter"],
          [/\bQ ?2\b/i, "Second Quarter"],
          [/\bQ ?3\b/i, "Third Quarter"],
          [/\bQ ?4\b/i, "Fourth Quarter"],
          [/New Year'?s?( ?Day)?/i, "1 January"],
          [/Groundhog( ?Day)?/i, "2 February"],
          [/Lincoln'?s? Birthday/i, "12 February"],
          [/Valentine'?s?( ?Day)?i/, "14 February"],
          [/Presidents( ?Day)?/, "3rd Monday of Feburary"],
          [/St. Patrick'?s?( ?Day)?/i, "17 March"],
          [/April Fools?'?( ?Day)?/i, "1 April"],
          [/Earth\sDay/i, "22 April"],
          [/Arbor( ?Day)?/i, "last Friday of April"],
          [/Mother'?s?( ?Day)?/i, "2nd Sunday of May"],
          [/Armed Forces( ?Day)?/i, "3rd Saturday in May"],
          [/Memorial( ?Day)?/, "Last Monday in May"],
          [/Flag( ?Day)?/i, "14 June"],
          [/Father'?s?( ?Day)?/i, "3rd Sunday of June"],
          [/Independence( ?Day)?/i, "4 July"],
          [/Labor( ?Day)?/i, "first Monday of September"],
          [/Patriot( ?Day)?/i, "11 September"],
          [/Constitution( ?Day)?/i, "17 September"],
          [/Columbus( ?Day)?/i, "2nd Monday of October"],
          [/Halloween/i, "31 October"],
          [/All Saints( ?Day)?/i, "1 November"],
          [/Veterans( ?Day)?/i, "11 November"],
          [/Thanks ?giving/i, "4th Thursday of November"],
          [/Pearl Harbor Remembrance( ?Day)?/i, "7 December"],
          [/Christmas Eve/i, "24 December"],
          [/Christmas( ?Day)?/i, "25 December"],
          [/Kwanzaa/, "26 December"],
          [/New Year'?s? Eve/i, "31 December"]
        ],
        _user_tokens: [
        ]
    };

    DateParser.arrayMap = function (self, fun /*, thisp*/) {
        return _arrayMap(self, fun, arguments[2]);
    };

    DateParser.isArray = function (vArg) {
        return _isArray(vArg);
    };

    return DateParser;
} ());