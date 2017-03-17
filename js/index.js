//->String.prototype
~function (pro) {
    //->queryURLParameter:获取URL地址中的参数值以及HASH值
    function queryURLParameter() {
        //->PARAMETER
        var obj = {},
            reg = /([^?=&#]+)=([^?=&#]+)/g;
        this.replace(reg, function () {
            obj[arguments[1]] = arguments[2];
        });

        //->HASH
        reg = /#([^?=&#]+)/;
        if (reg.test(this)) {
            obj['hash'] = reg.exec(this)[1];
        }
        return obj;
    }

    //->formatTime:按照指定的模板把时间字符串格式化
    function formatTime(template) {
        template = template || '{0}年{1}月{2}日 {3}时{4}分{5}秒';
        var ary = this.match(/\d+/g);
        return template.replace(/\{(\d)\}/g, function () {
            var index = arguments[1],
                content = ary[index];
            content = content || '00';
            return content;
        });
    }

    pro.queryURLParameter = queryURLParameter;
    pro.formatTime = formatTime;
}(String.prototype);

//->计算每一个区域的高度
~function () {
    //JQ:innerWidth/innerHeight/outerWidth/outerHeight =>JS:clientWidth/clientHeight/offsetWidth/offsetHeight
    changeHeight();
    //动态控制元素的高
    function changeHeight() {
        var winH = $(window).innerHeight(),
            $conBody = $('.conBody'),
            $menu = $conBody.children('.menu'),
            $match = $conBody.find('.match');
        var h = winH - 64 - 20 - 20;
        $conBody.css('height', h);
        $menu.css('height', h - 2);
        $match.css('height', h - 82 - 20);
    }

    $(window).on('resize', changeHeight);
    //->window.onresize:浏览器窗口的大小发生改变就会触发这个事件执行
}();

//->MATCH RENDER
var matchRender = (function () {
    var $matchFn = $.Callbacks(),
        $matchScroll = null;
    var $match = $('.match'),
        $wrapper = $match.children('.wrapper');
    //->bindHTML:绑定数据
    $matchFn.add(bindHTML);
    function bindHTML(data, columnId) {
        if(Number(columnId)!==100101){
            var templateStr = $('#matchTemplate').html();
            var resultStr = ejs.render(templateStr, {matchData: data});
            $wrapper.html(resultStr);
        }else{
            var gaming = $('#gamesTemplate').html();
            var resultGameStr = ejs.render(gaming, {gamesData: data});
            $wrapper.html(resultGameStr);
        }


        //->绑定完成数据后,刷新滚动区域,定位到具体的区域
        if ($matchScroll) {
            $matchScroll.refresh();
            $matchScroll.scrollTo(0, 0);
        }
    }

    //->实现局部滚动
    $matchFn.add(bindScroll);
    function bindScroll(data, columnId) {
        if (!$matchScroll) {
            $matchScroll = new IScroll('.match', {
                scrollbars: true,
                mouseWheel: true
            });
        }
        //->第一次还需要滚动到选中日期的位置
        var tarT = $(".calender .wrapper>a[class='bg']").attr('data-time');
        var $tar = $wrapper.children(".matchInfo[data-time='" + tarT + "']");
        if ($tar.length > 0) {
            $matchScroll.scrollToElement($tar[0], 300);
        }
        //$matchFn.remove(bindScroll);
    }

    //->scrollTo:滚动到具体的某一个列表位置
    function scrollTo(time) {
        var $tar = $wrapper.children(".matchInfo[data-time='" + time + "']");
        if ($tar.length > 0) {
            $matchScroll.scrollToElement($tar[0], 300);
        }
    }

    return {
        init: function (startTime, endTime, columnId) {
            //->GET DATA
            $.ajax({
                url: 'http://matchweb.sports.qq.com/kbs/list?columnId=' + columnId + '&startTime=' + startTime + '&endTime=' + endTime,
                dataType: 'jsonp',
                success: function (result) {
                    if (result && result.code == 0) {
                        var data = result.data;
                        $matchFn.fire(data, columnId);
                    }
                }
            });
        },
        scrollTo: scrollTo
    }
})();

//->CALENDAR RENDER
var calendarRender = (function () {
    var $calender = $('.calender'),
        $wrapper = $calender.find('.wrapper');
    var curL = parseFloat($wrapper.css('left'));
    var maxL = 0, minL = 0;
    var $calendarFn = $.Callbacks();

    //->EJS绑定页面中的数据
    $calendarFn.add(function (today, data, columnId) {
        var templateStr = $('#calendarTemplate').html();
        var resultStr = ejs.render(templateStr, {calendarData: data});
        $wrapper.html(resultStr).css('width', data.length * 110);
    });
    //->开始定位到今天日期的位置或者今天日期相近的位置
    $calendarFn.add(function (today, data, columnId) {
        var $link = $wrapper.children('a'),
            $tar = $link.filter("[data-time='" + today + "']");
        if ($tar.length === 0) {
            var flag = false;
            $link.each(function (index, item) {
                var itemTime = $(item).attr('data-time').replace(/-/g, ''),
                    todayTime = today.replace(/-/g, '');
                if (itemTime > todayTime) {
                    $tar = $(item);
                    flag = true;
                    return false;
                }
            });
            if (!flag) {
                $tar = $link.eq($link.length - 1);
            }
        }
        var curL = -$tar.index() * 110 + 110 * 3;
        curL = curL > maxL ? maxL : (curL < minL ? minL : curL);
        $tar.addClass('bg');
        $wrapper.css('left', curL);

        //->根据起始的日期和结束的日期获取比赛的列表信息
        var firIn = Math.abs(parseFloat($wrapper.css('left')) / 110),
            lasIn = firIn + 6;
        matchRender.init($link.eq(firIn).attr('data-time'), $link.eq(lasIn).attr('data-time'), columnId);
    });
    //->点击左右切换按钮实现日期区域的滚动(事件委托)
    $calendarFn.add(function (today, data, columnId) {
        var $link = $wrapper.children('a');
        function move(){
            curL = Math.round(curL / 110) * 110;//->防止过快点击出现每一次运动不是运动七个而出现了半个A展示在页面中的问题
            curL = curL > maxL ? maxL : (curL < minL ? minL : curL);
            $wrapper.stop().animate({left: curL}, 300, function () {
                //->运动完成后,让现有七个中的第一个日期选中
                var firIn = Math.abs(curL / 110),
                    lasIn = firIn + 6;
                $link.each(function (index, item) {
                    firIn === index ? $(item).addClass('bg') : $(item).removeClass('bg');
                });

                //->根据起始的日期和结束的日期获取比赛的列表信息
                matchRender.init($link.eq(firIn).attr('data-time'), $link.eq(lasIn).attr('data-time'), columnId);
            });
        }
        $calender.on('click', function (ev) {
            var tar = ev.target|| ev.srcElement,
                tarTag = tar.tagName.toUpperCase(),
                $tar = $(tar);
            if (tarTag === 'SPAN') {//->点击的SPAN,让事件源都变成其父级元素
                tar = tar.parentNode;
                tarTag = tar.tagName.toUpperCase();
                $tar = $(tar);
            }
            if (tarTag !== 'A') return;
            //->左按钮 或 右按钮
            if ($tar.hasClass('cal-left') || $tar.hasClass('cal-right')) {
                $tar.hasClass('cal-left') ? curL += 770 : curL -= 770;
                move();
                return;
            }
            //->WRAPPER中的A:让比赛列表区域滚动到具体的某一个位置
            $tar.addClass('bg').siblings().removeClass('bg');
            matchRender.scrollTo($tar.attr('data-time'));
        });
        var $wrappers = $('#wrapper');
        $wrappers.on('click', function (ev) {
            var tar = ev.target || ev.srcElement,
                tarTag = tar.tagName.toUpperCase(),
                $tar = $(tar);
            if (tarTag === 'SPAN') {//->点击的SPAN,让事件源都变成其父级元素
                tar = tar.parentNode;
                tarTag = tar.tagName.toUpperCase();
                $tar = $(tar);
            }
            if (tarTag === "I") {
                tar = tar.parentNode.parentNode;
                tarTag = tar.tagName.toUpperCase();
                $tar = $(tar);
            }
            if (tarTag !== 'A') return;
            if ($tar.hasClass('arrow-left') || $tar.hasClass('arrow-right')) {
                $tar.hasClass('arrow-left') ? curL += 770 : curL -= 770;
                move();
            }
        })

    });

    return {
        init: function (columnId) {
            //->GET DATA
            $.ajax({
                url: 'http://matchweb.sports.qq.com/kbs/calendar?columnId=' + columnId,
                type: 'get',
                dataType: 'jsonp',
                success: function (result) {
                    if (result && result.code == 0) {
                        var data = result['data'],
                            today = data['today'];
                        data = data['data'];
                        minL = -(data.length - 7) * 110;
                        $calendarFn.fire(today, data, columnId);
                    }
                }
            });
        }
    }
})();

//->MENU RENDER
var menuRender = (function () {
    var ary = [
        {'title': 'NBA', 'HASH': 'nba', 'columnId': '100000'},
        {'title': 'CBA', 'HASH': 'cba', 'columnId': '100008'},
        {'title': '英超', 'HASH': 'pl', 'columnId': '8'},
        {'title': '西甲', 'HASH': 'laliga', 'columnId': '23'},
        {'title': '意甲', 'HASH': 'seriea', 'columnId': '21'},
        {'title': '欧冠', 'HASH': 'ucl', 'columnId': '5'},
        {'title': '德甲', 'HASH': 'bundesliga', 'columnId': '22'},
        {'title': '法甲', 'HASH': 'l1', 'columnId': '24'},
        {'title': 'NHL', 'HASH': 'nhl', 'columnId': '100005'},
        {'title': 'NFL', 'HASH': 'nfl', 'columnId': '100005'},
        {'title': '亚冠', 'HASH': 'afc', 'columnId': '605'},
        {'title': '中超', 'HASH': 'csl', 'columnId': '208'},
        {'title': '综合', 'HASH': 'others', 'columnId': '100002'},
        {'title': '电竞', 'HASH': 'esports', 'columnId': '100101'},
        {'title': '欧洲世预赛', 'HASH': 'wcp-eu', 'columnId': '336'},
        {'title': '亚洲世预赛', 'HASH': 'wcp-as', 'columnId': '341'},
        {'title': '南美世预赛', 'HASH': 'wcp-sa', 'columnId': '342'}
    ];

    var menuScroll = null,
        $menu = $('.menu'),
        $menuUL = $menu.children('ul');

    //->bindEvent:给所有的MENU绑定点击事件
    function bindEvent() {
        var $oLink = $menuUL.find('a');
        $oLink.on('click', function () {
            var _this = this;
            $oLink.each(function (index, item) {
                item === _this ? $(item).addClass('bg') : $(item).removeClass('bg');
            });

            //->改变右侧区域的内容
            calendarRender.init($(_this).attr('data-id'));
        });
    }

    //->positionMenu:开始加载页面的时候让其中一个LI选中
    function positionMenu() {
        var curHASH = window.location.href.queryURLParameter()['hash'];
        curHASH = curHASH || 'nba';
        var $tar = $menuUL.find("a[href='#" + curHASH + "']");
        if ($tar.length === 0) {
            $tar = $menuUL.find('a').eq(0);
        }
        $tar.addClass('bg');

        //->ISCROLL定位到选中的位置
        menuScroll.scrollToElement($tar[0], 300);

        //->定位完成后在右侧显示对应的数据
        calendarRender.init($tar.attr('data-id'));
    }

    return {
        init: function () {
            //->EJS模板引擎绑定数据
            $menuUL.html(ejs.render($('#menuTemplate').html(), {menuData: ary}));

            //->实现局部滚动(IScroll.js)
            menuScroll = new IScroll('.menu', {
                scrollbars: true,
                bounce: false,
                mouseWheel: true
            });

            //->开始加载页面的时候让其中一个LI选中
            positionMenu();

            //->给所有的MENU绑定点击事件
            bindEvent();
        }
    };
})();
menuRender.init();
