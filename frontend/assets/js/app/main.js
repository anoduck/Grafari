/**
 * MiSearch main.js
 * PA 27-10-2014
 */

var SEARCH_TAG_FIX = "";

var SERVER_URL = "http://localhost:8080/";
//var SERVER_URL = "http://minf-mip-g2.informatik.haw-hamburg.de:80/"; 

var DEBUG_IMAGE = true;

require(['../common'], function () {

    require(['jquery', 'isotope', 'queryToggle', 'fancybox', 'underscore', 'searchAPI'], function ($, isotope, queryToggle, fancybox) {

        // make Isotope a jQuery plugin
        $.bridget('isotope', isotope);


        console.log('Setting up ...');
        miSearch_init();

        $('.result').on('click', '.subQuery, .mainQuery', function () {
            $('#queryinput').val($(this).text());
        });

        $('.fancybox').fancybox({
            padding: 0,
            openEffect: 'elastic'
        });

        $('#results').on('click', '.tags-icon', function () {
            var tagIconElement = $(this);

            if (tagIconElement.attr('data-status') == '0') {
                tagIconElement.attr('data-status', '1');

                var userId = tagIconElement.attr('data-id');
                retrieveTagsForId(userId, tagIconElement);
            }
        });

        $(document).on('click', '.subQuery.active', function () {
            $('#queryinput').val($(this).text());
        });
        
        $(document).on('click', '.subQuery', function () {
            if(!$(this).hasClass('active')){
                $(this).addClass('active');
                var subQueryID = $(this).attr('data-id');
                showSubQuery(subQueryID);
            }
        });

        /**
         * Initial Page Setup
         */
        function miSearch_init() {
            // Setup Button Handler
            miSearch_reg_btn();

            // Example text for the demo
            // $(".form-control").val("All people who live in Germany AND ( people who are self-employed OR NOT people who are homeless )");
            $("#queryinput").val("All people who live in Hamburg");
        }

        function retrieveTagsForId(userId, tagIconElement) {

            if (tagIconElement === null || userId === null) {
                console.log("retrieveTagsForId: MISSING PARAMS");
                return 0;
            }

            console.log("Get tags for id:" + userId);

            if (!userData.getTagsById(userId)) {

                tagIconElement.addClass('tags-icon-spinner');

                // if (DEBUG_IMAGE) {
                    $.ajax({
                        type: "GET",
                        url: SERVER_URL + "tags/id/" + userId,
                        //url: "http://141.22.69.63:8080/tags/id/" + userId,
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        success: function (data, status, jqXHR) {
                            console.log('-->success', data, status, jqXHR);
                            console.log('tags:', $.parseJSON(jqXHR.responseText));

                            var response = $.parseJSON(jqXHR.responseText);
                            var tags = response[userId];

                            userData.setTagsById(userId, tags);

                            var formattedTags = tags.join(", ");

                            tagIconElement.parent().find('.tags-text').text(formattedTags);

                            tagIconElement.removeClass('tags-icon-spinner');

                            //user not allowed to do another tag search on the same profile
                            //tagIconElement.attr('data-status','1');
                        },
                        error: function (jqXHR, status) {
                            console.log("\n\n\n Token erneuert? \n\n\n");
                            console.log('-->error', jqXHR, status);

                            tagIconElement.removeClass('tags-icon-spinner');
                        }
                    });
                // } else {
                //     console.log("Image search not active! set DEBUG_IMAGE to true");
                // }

            }
        }

        /**
         * Register Page-Handler
         */
        function miSearch_reg_btn() {

            var $brandRow = $('#brandRow');
            var $resultWell = $('#resultWell');
            var $queryHistory = $('#queryHistory');
            var $resultSpinner = $('#resultSpinner');
            var $results = $('#results');
            var $formInput = $('#queryinput');
            var $currentQuery = $('#currentQuery');

            $('#btn_search').click(function () {

                // Save new Query in History
                queryHistory.add($formInput.val());
                updateHistoryBtns();
                
                var tokens = search._tokenize($formInput.val());
                $currentQuery.empty();
                $currentQuery.append(make_Current_Query($formInput.val()));
                registerSubQueryHandlers();
                
                $brandRow.removeClass('center');
                $resultSpinner.removeClass('hidden');
                
                setTimeout(function () {
                     make_Users();
                }, 1500);
               
            });
            
            $("#queryinput").keyup(function (event) {
                if (event.keyCode == 13) {
                    $("#btn_search").click();
                }
            });


            $('#btn_clear').click(function () {
                $resultWell.addClass('hidden');
                $brandRow.addClass('center');
                $resultSpinner.removeClass('hidden');
                $results.addClass('hidden');
            });


            $("#taginput").keyup(function (event) {
                if (event.keyCode == 13) {
                    $("#btn_tag_search").click();
                }
            });
            $('#btn_tag_search').click(function () {

                resetUserTagSearchView();
                $("#btn_tag_search").removeClass('btn-success').removeClass('btn-danges');

                SEARCH_TAG_FIX = $("#taginput").val();

                if (SEARCH_TAG_FIX == "") {
                    return 0;
                }

                userData.getAllIds().forEach(function (userId) {
                    var tagIconElement = $("#results").find('[data-id="' + userId + '"]');

                    retrieveTagsForId(userId, tagIconElement);
                });

                setTimeout(function () {
                    var foundIds = userData.getIdsByTag(SEARCH_TAG_FIX);

                    if (foundIds.length > 0) {
                        markIdWithClassName(foundIds, "tagFound");
                        showUsersWithTagSearch();
                        $("#btn_tag_search").addClass('btn-success').removeClass('btn-danger');
                    } else {
                        $("#btn_tag_search").addClass('btn-danger').removeClass('btn-success');
                    }

                }, 1500);


            });

        }

        // History Btn handlers

        var $historyNextBtn = $('#historyNextBtn');
        var $historyPrevBtn = $('#historyPrevBtn');
        var $formInput = $('#queryinput');
        var $currentQuery = $('#currentQuery');

        /**
         * Update Query-History Buttons
         */
        function updateHistoryBtns() {
            console.log('updating HistoryBtns');

            if (queryHistory.idx === 0) {

                // Current Query is the only Query present in History
                if (queryHistory.idx === (queryHistory.history.length - 1)) {
                    $historyNextBtn.attr('disabled', 'disabled');
                    $historyNextBtn.off('click');

                    $historyPrevBtn.attr('disabled', 'disabled');
                    $historyPrevBtn.off('click');

                    // Current Query is the first but not only in History
                } else if (queryHistory.idx != (queryHistory.history.length - 1)) {
                    $historyNextBtn.removeAttr('disabled');
                    $historyNextBtn.off('click').on('click', function () {
                        nextQuery();
                    });

                    $historyPrevBtn.attr('disabled', 'disabled');
                    $historyPrevBtn.off('click');
                }
            } else {

                // Current Query is the last Query present in History
                if (queryHistory.idx === (queryHistory.history.length - 1)) {
                    $historyNextBtn.attr('disabled', 'disabled');
                    $historyNextBtn.off('click');

                    $historyPrevBtn.removeAttr('disabled');
                    $historyPrevBtn.off('click').on('click', function () {
                        previousQuery();
                    });

                    // Current Query is neither first nor last in History
                } else if (queryHistory.idx != (queryHistory.history.length - 1)) {
                    $historyNextBtn.removeAttr('disabled');
                    $historyNextBtn.off('click').on('click', function () {
                        nextQuery();
                    });

                    $historyPrevBtn.removeAttr('disabled');
                    $historyPrevBtn.off('click').on('click', function () {
                        previousQuery();
                    });
                }
            }

        }

        /**
         * Select previously called Query in History
         */
        function previousQuery() {
            console.log('Calling previous Query');
            var query = queryHistory.previous();
            updateHistoryBtns();

            // Show Query in Search-Field
            $formInput.val(query);

            make_Users();

            var tokens = search._tokenize(query);
            $currentQuery.empty();
            $currentQuery.append(make_Current_Query(query));
            registerSubQueryHandlers();
        }

        /**
         * Select next called Query in History
         */
        function nextQuery() {
            console.log('Calling next Query');
            var query = queryHistory.next();
            updateHistoryBtns();

            // Show Query in Search-Field
            $formInput.val(query);

            make_Users();

            var tokens = search._tokenize(query);
            $currentQuery.empty();
            $currentQuery.append(make_Current_Query(query));
            registerSubQueryHandlers();
        }

        function init_isotope() {
            var $container = $('#results');
            // init
            $container.isotope({
                // options
                itemSelector: '.result',
                layoutMode: 'fitRows'
            });
        }

        function make_Current_Query(query) {
            var queryDivs = '';
            var tokens = search._tokenize(query).reverse();
            var querycounter = 0;
            while (!tokens.empty()) {
                var cur = tokens.pop();
                if (typeof cur === "string") {
                    queryDivs += '<li class="subQuery active" data-id="%">' + cur + '<i class="fa fa-times fa-1"></i></li>';
                    querycounter++;
                } else {
                    if (cur.name === "(") {
                        queryDivs += '<li class="token">(</li><li><ul class="subQueryList">';
                    } else if (cur.name === ")") {
                        queryDivs += '</ul></li><li class="token">)</li>';
                    } else {
                        queryDivs += '<li class="token">' + cur.name + '</li>';
                    }
                }
            }
            queryDivs += '<li id="addTagBtn" class="subQuery tag"><i class="fa fa-plus-circle"> Image Tag</i></li><li id="tagToken" class="token hidden">AND</li></ul>';
            
            // Replace placeholders in Subqueries String with actual SubQuery-IDs
            for(var idx=querycounter; idx>0; idx--){
                console.log(idx);
                queryDivs = queryDivs.replace('%', idx-1);
            }

            // Hide TagSearch Form
            $('#tagSearch').addClass('hidden');
            return queryDivs;
        }
        
        function registerSubQueryHandlers(){
            console.log('registering SubQuery Handlers')
            
            $('.subQuery > i').off('click').on('click', function(e){
                var isActive = !$(this).parent('li').hasClass('active');
                var subQueryID = $(this).parent('li').attr('data-id');
                console.log('Toggle SubQuery with ID: '+subQueryID+' isActive='+isActive);
                
                // Toogle Active Class
                if(!isActive){
                    $(this).parent('li').removeClass('active');
                    hideSubQuery(subQueryID);
                    
                    e.stopPropagation();
                }
            });
        
            
            $('#addTagBtn').off('click').on('click', function(e){
                $(this).addClass('hidden');
                $('#tagToken').removeClass('hidden');
                $('#tagSearch').removeClass('hidden');
                
                e.stopPropagation();
            });
        }

        var addLink = function (elementId, element, count) {
            $.ajax({
                type: "GET",
                url: "https://ajax.googleapis.com/ajax/services/search/web?v=1.0&q=" + element.replace(/ /g, "+"),
                dataType: "jsonp",
                success: function (data) {
                    var spanId = elementId + count;
                    if (!data.responseData) {
                        $(spanId).html(element);
                    } else {
                        var unescapedUrl = data.responseData.results[0].unescapedUrl.toString();
                        if (unescapedUrl) {
                            if (unescapedUrl.indexOf("facebook.com") >= 0) {
                                $(spanId).html('<a class="fancybox" href="' + unescapedUrl + '">' + element + '</a>');
                            } else {
                                $(spanId).html('<a class="fancybox" data-fancybox-type="iframe" href="' + unescapedUrl + '">' + element + '</a>');
                            }
                        } else {
                            $(spanId).html(element);
                        }
                    }
                },
                error: function (jqXHR, status) {
                    console.log('-->2error', jqXHR, status)
                }
            });
        }

        var createInfoElement = function (spanText) {
            return '</br>&#183;' + spanText;
        }

        function make_Users() {
            
            var $brandRow = $('#brandRow');
            var $resultWell = $('#resultWell');
            var $queryHistory = $('#query');
            var $resultSpinner = $('#resultSpinner');

            $resultWell.removeClass('hidden');
            $queryHistory.removeClass('hidden');

            
            userData.retrieveData(function (response) {
                var users = response.users;
                
                inativeSubQueries = {};

                // if (DEBUG_IMAGE) {
                //     for (i = 0; i <= 9; i++) {
                //         users.shift();
                //     }
                // }

                userData.setData(users);
                
                var $results = $('#results');
                $results.isotope('destroy');
                $results.empty();

                var universitySpanCount = 1, workcount = 1, placecount = 1;

                while (!users.empty()) {
                    var user = users.shift();
                    var userUrl = 'https://www.facebook.com/' + user.id;
                    var userId = user.id.replace(/\./g, "-");
                    var subQueryIds = user.subqueries;
                    $results.append('<div id="' + userId + '" class="result'
                    + ' well userWell" data-id="'+subQueryIds+'"></div>');
                    var userDiv = $('#' + userId);

                    //userDiv.append('<a class="media-left" href="#">');
                    userDiv.append('<a href="' + userUrl + '" target="_blank"><img class="user-img" src="' + user.pictureurl + '" alt="' + user.name + '"></img></a>');
                    var infotext = '<div class="userInfo"><b>' + '<a href="' + userUrl + '" target="_blank">' + user.name + '</a>';

                    /*while (!user.query.empty()) {
                     userDiv.addClass('' + user.query.pop());
                     }*/
                    if (user.hasOwnProperty("gender")) {
                        if (user.gender === "male") {
                            infotext += ' &#9794';
                        } else if (user.gender === "female") {
                            infotext += ' &#9792';
                        }
                    }


                    if (user.hasOwnProperty("age")) {
                        infotext += user.age;
                    }
                    if (user.hasOwnProperty("relationship")) {
                        infotext += '</br>' + user.relationship;
                    }
                    if (user.hasOwnProperty("employer")) {
                        if (user.hasOwnProperty("profession")) {
                            if (user.profession === "unemployed") {
                                infotext += createInfoElement('worked at ' + user.employer);
                            } else if (user.profession === "") {
                                infotext += createInfoElement('works at ' + user.employer);
                            } else {
                                infotext += createInfoElement(user.profession + ' at ' + user.employer);
                            }
                        } else {
                            var workText = 'works at <span id="work' + workcount + '"></span>';
                            addLink("#work", user.employer, workcount);
                            workcount++;
                            infotext += createInfoElement(workText);
                        }
                    }
                    if (user.hasOwnProperty("studies")) {
                        var studieText = 'studies ' + user.studies;
                        if (user.hasOwnProperty("university")) {
                            studieText += ' at ' + '<span id="uni' + universitySpanCount + '"></span>';
                            addLink("#uni", user.university, universitySpanCount);
                            universitySpanCount++;
                        }
                        infotext += createInfoElement(studieText);
                    }
                    if (user.hasOwnProperty("lives")) {
                        var placeText = 'lives in <span id="place' + placecount + '"></span>';
                        addLink("#place", user.lives, placecount);
                        placecount++;
                        infotext += createInfoElement(placeText);
                    }
                    if (user.hasOwnProperty("from") && user.from !== user.lives) {
                        infotext += createInfoElement('used to live in ' + user.from);
                    }
                    infotext += '</b>';

                    // add tags-section to user div
                    infotext += '<div class="user-div-tags"><div data-id="' + user.id + '" data-status="0" class="tags-icon tags-icon-default"></div><div class="tags-text"></div></div>';
                    infotext += '</div><br>';

                    userDiv.append(infotext);


                }


                $resultSpinner.addClass('hidden');
                $results.removeClass('hidden');

                // init
                $results.isotope({
                    // options
                    itemSelector: '.result'
                });

                queryToggle.toggle();
            });
        }
    });
});

// History for all Query made by User

var queryHistory = {
    history: [],
    idx: 0,
    add: function (query) {
        if (typeof query === 'string') {
            this.history.push(query);
            this.idx = this.history.length - 1;
        } else throw 'invalid Query to be saved in History';
    },
    current: function () {
        return this.history[this.idx];
    },
    next: function () {
        return this.history[++this.idx];
    },
    previous: function () {
        if (this.idx === 0) {
            return null;
        } else return this.history[--this.idx];
    }
};


var userData = {
    data: {},
    retrieveData: function (callback) {
        var searchString = $('#queryinput').val()
        var searchEncoded = searchString.replace(/ /g, "%20")
        $.ajax({
            type: "GET",
            //url: "http://141.22.69.63:8080/search/" + searchEncoded,
            url: SERVER_URL + "search/" + searchEncoded,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data, status, jqXHR) {
                $('#resultSpinner').addClass('hidden');
                $('.tag-search-row').removeClass('hidden');
                console.log('-->success', data, status, jqXHR);
                console.log('json string', $.parseJSON(jqXHR.responseText));
                callback.call(this, $.parseJSON(jqXHR.responseText));

            },
            error: function (jqXHR, status) {
                alert('Unknown Error occured!');
                console.log("\n\n\n Token erneuert? \n\n\n");
                console.log('-->error', jqXHR, status)
            }
        });
    },
    setData: function (data) {
        this.data = clone(data);
    },
    getData: function () {
        return this.data;
    },
    getUserById: function (id) {
        for (var key in this.data) {
            var obj = this.data[key];
            for (var prop in obj) {
                // important check that this is objects own property
                // not from prototype prop inherited
                if (obj.hasOwnProperty(prop) && obj["id"] == id) {
                    return key;
                }
            }
        }
    },
    getAllIds: function () {
        var ids = [];
        for (var obj in this.data) {
            if ('id' in this.data[obj]) {
                ids.push(this.data[obj]["id"]);
            }
        }
        return ids;
    },
    getIdsByTag: function (searchTag) {
        var ids = [];

        for (var user in this.data) {
            var obj = this.data[user];
            if ('tags' in obj && typeof obj["tags"] != 'undefined') {
                obj["tags"].forEach(function (tag) {
                    if (tag == searchTag) {
                        found = true;
                        ids.push(obj.id)
                    }
                });
            }
        }
        return ids;
    },
    setTagsById: function (id, tags) {
        var user = this.getUserById(id);
        this.data[user]["tags"] = tags;
    },
    getTagsById: function (id) {
        var user = this.getUserById(id);
        return this.data[user].tags;
    }
};

//--- Helper funcs ------------------------------
function clone(obj) {
    if (obj == null || typeof(obj) != 'object') {
        return obj;
    }

    var temp = new obj.constructor();
    for (var key in obj) {
        temp[key] = clone(obj[key]);
    }
    return temp;
}

// ids []
function markIdWithClassName(ids, className) {
    if (ids != null && className != null) {
        ids.forEach(function (id) {
            $('#' + id.replace(/\./g, "-")).addClass(className);
        });
    }
}

var inactiveSubQueries = {};

function showSubQuery(id){
    inactiveSubQueries[id] = null;
    
    updateResults();
}

function hideSubQuery(id){
    inactiveSubQueries[id] = true;
    
    updateResults();
}

function updateResults(){
    $('#results > .result').each(function(){
        var userId = $(this).attr('id').replace(/-/g, '.');
        
        var user = userData.getData()[userData.getUserById(userId)];
        
        if(!user){
            throw 'User not found';
        }
        
        var subQueries = user.subqueries;
        console.log('checking Result with subqueries: ', subQueries, inactiveSubQueries);
        
        var setVisible = false;
        
        for(var idx=0; idx<subQueries.length; idx++){
            if(!inactiveSubQueries[subQueries[idx]]){
                setVisible = true;
                break;
            }
        }
        
        if(setVisible){
            console.log('showing');
            $(this).addClass('activeSubQuery');
        } else {
            console.log('hiding')
            $(this).removeClass('activeSubQuery');
        }
    });
    
    //TODO Check if Tags are active
    // if (tagsActive){
    //  showUsersWithTagSearch;
    // } else {
    $('#results > .result').hide();
    $('#results > .result.activeSubQuery').show();
    resetUsers();
    // }
}

function showUsersWithTagSearch() {

    $("#results > .result").hide();
    $("#results > .tagFound.activeSubQuery").show();
    $("#results > .tagFound").show();
    resetUsers();

}

function resetUserTagSearchView() {

    $(".result").removeClass("tagFound");
    $("#results > .result").show();
    $("#results > .result.activeSubQuery").show();
    resetUsers();
}

/**
 * Trigger Isotop-Reset
 */
function resetUsers(){
     setTimeout(function () {
            $('#results').isotope();
        }, 100);
}
