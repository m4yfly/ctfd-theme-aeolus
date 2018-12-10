var challenges;
var user_solves = [];
var templates = {};

window.challenge = new Object();

function loadchal(id) {
    var obj = $.grep(challenges, function (e) {
        return e.id == id;
    })[0];

    if (obj.type === 'hidden') {
        ezal({
            title: "Challenge Hidden!",
            body: "You haven't unlocked this challenge yet!",
            button: "Got it!"
        });
        return;
    }

    updateChalWindow(obj);
}

function loadchalbyname(chalname) {
    var obj = $.grep(challenges, function (e) {
        return e.name == chalname;
    })[0];

    updateChalWindow(obj);
}

function updateChalWindow(obj) {
    $.get(script_root + "/api/v1/challenges/" + obj.id, function (response) {
        var challenge_data = response.data;

        $.getScript(script_root + obj.script, function () {
            $.get(script_root + obj.template, function (template_data) {
                $('#challenge-window').empty();
                var template = nunjucks.compile(template_data);
                window.challenge.data = challenge_data;
                window.challenge.preRender();

                challenge_data['description'] = window.challenge.render(challenge_data['description']);
                challenge_data['script_root'] = script_root;

                $('#challenge-modal').html(template.render(challenge_data));

                $('.challenge-solves').click(function (e) {
                    getsolves($('#challenge-id').val())
                });
                $('.nav-tabs a').click(function (e) {
                    e.preventDefault();
                    $(this).tab('show')
                });

                // Handle modal toggling
                $('#challenge-window').on('hide.bs.modal', function (event) {
                    $("#submission-input").removeClass("wrong");
                    $("#submission-input").removeClass("correct");
                    $("#incorrect-key").slideUp();
                    $("#correct-key").slideUp();
                    $("#already-solved").slideUp();
                    $("#too-fast").slideUp();
                });

                $('#challenge-modal > div > div > div > button').click(function () {
                    $('#challenge-modal').find("div:first-child").fadeOut(300, function () {
                        console.log('faded');
                        $(this).empty();
                    });
                    $('#challenges-pre').removeClass('low-res-hide')
                    history.replaceState('', document.title, window.location.pathname);
                });

                $('#submit-key').click(function (e) {
                    e.preventDefault();
                    $('#submit-key').addClass("disabled-button");
                    $('#submit-key').prop('disabled', true);
                    window.challenge.submit(function (data) {
                        renderSubmissionResponse(data);
                        loadchals(function () {
                            marksolves();
                        });
                    });
                });

                $("#submission-input").keyup(function (event) {
                    if (event.keyCode == 13) {
                        $("#submit-key").click();
                    }
                });

                $(".input-field").bind({
                    focus: function () {
                        $(this).parent().addClass('input--filled');
                        $label = $(this).siblings(".input-label");
                    },
                    blur: function () {
                        if ($(this).val() === '') {
                            $(this).parent().removeClass('input--filled');
                            $label = $(this).siblings(".input-label");
                            $label.removeClass('input--hide');
                        }
                    }
                });

                window.challenge.postRender();

                window.location.replace(window.location.href.split('#')[0] + '#' + obj.name);
            });
        });
    });
}

$("#submission-input").keyup(function (event) {
    if (event.keyCode == 13) {
        $("#submit-key").click();
    }
});


function renderSubmissionResponse(response, cb) {
    var result = response.data;

    var result_message = $('#result-message');
    var result_notification = $('#result-notification');
    var answer_input = $("#submission-input");
    result_notification.removeClass();
    result_message.text(result.message);

    if (result.status === "authentication_required") {
        window.location = script_root + "/login?next=" + script_root + window.location.pathname + window.location.hash;
        return
    }
    else if (result.status === "incorrect") { // Incorrect key
        result_notification.addClass('alert alert-danger alert-dismissable text-center');
        result_notification.slideDown();

        answer_input.removeClass("correct");
        answer_input.addClass("wrong");
        setTimeout(function () {
            answer_input.removeClass("wrong");
        }, 3000);
    }
    else if (result.status === "correct") { // Challenge Solved
        result_notification.addClass('alert alert-success alert-dismissable text-center');
        result_notification.slideDown();

        $('.challenge-solves').text((parseInt($('.challenge-solves').text().split(" ")[0]) + 1 + " Solves"));

        answer_input.val("");
        answer_input.removeClass("wrong");
        answer_input.addClass("correct");
    }
    else if (result.status === "already_solved") { // Challenge already solved
        result_notification.addClass('alert alert-info alert-dismissable text-center');
        result_notification.slideDown();

        answer_input.addClass("correct");
    }
    else if (result.status === "paused") { // CTF is paused
        result_notification.addClass('alert alert-warning alert-dismissable text-center');
        result_notification.slideDown();
    }
    else if (result.status === "ratelimited") { // Keys per minute too high
        result_notification.addClass('alert alert-warning alert-dismissable text-center');
        result_notification.slideDown();

        answer_input.addClass("too-fast");
        setTimeout(function () {
            answer_input.removeClass("too-fast");
        }, 3000);
    }
    setTimeout(function () {
        $('.alert').slideUp();
        $('#submit-key').removeClass("disabled-button");
        $('#submit-key').prop('disabled', false);
    }, 3000);

    if (cb) {
        cb(result);
    }
}

function marksolves(cb) {
    $.get(script_root + '/api/v1/' + user_mode + '/me/solves', function (response) {
        var solves = response.data;
        for (var i = solves.length - 1; i >= 0; i--) {
            var id = solves[i].challenge_id;
            var btn = $('a[value="' + id + '"]');
            btn.addClass('solved-challenge');
            btn.prepend("<i class='fas fa-check corner-button-check'></i>")
        }
        if (cb) {
            cb();
        }
    });
}

function load_user_solves(cb) {
    if (authed) {
        $.get(script_root + '/api/v1/' + user_mode + '/me/solves', function (response) {
            var solves = response.data;

            for (var i = solves.length - 1; i >= 0; i--) {
                var chal_id = solves[i].challenge_id;
                user_solves.push(chal_id);

            }
            if (cb) {
                cb();
            }
        });
    } else {
        cb();
    }
}

function getsolves(id) {
    $.get(script_root + '/api/v1/challenges/' + id + '/solves', function (response) {
        var data = response.data;
        $('.challenge-solves').text(
            (parseInt(data.length) + " Solves")
        );
        var box = $('#challenge-solves-names');
        box.empty();
        for (var i = 0; i < data.length; i++) {
            var id = data[i].account_id;
            var name = data[i].name;
            var date = moment(data[i].date).local().fromNow();
            box.append('<tr><td><a href="teams/{0}">{1}</td><td>{2}</td></tr>'.format(id, htmlentities(name), date));
        }
    });
}


function generate_tree(challenges) {
    var tree = "<span class='token text-muted'>*</span>\n";

    var final_count = Object.keys(challenges).length - 1;
    Object.keys(challenges).forEach(function (category, i) {
        var token = "<span class='token text-muted'>├── </span>";
        if (i == final_count) {
            token = "<span class='token text-muted'>└── </span>";
        }
        tree += token + category + "\n";

        var chal_count = challenges[category].length - 1;
        for (var c = 0; c < challenges[category].length; c++) {
            var chal = challenges[category][c];
            var token = "<span class='token text-muted'>│   ├── </span>";

            if (i == final_count) {
                token = "<span class='token text-muted'>    ├── </span>";
            }

            if (c == chal_count) {
                if (i == final_count) {
                    var start_char = "<span class='token text-muted'> ";
                } else {
                    var start_char = "<span class='token text-muted'>|";
                }
                token = start_char + "   └── </span>";
            }

            var seconds_before_release = '<span class="countdown" data-time="{0}">&nbsp;</span>'.format(chal.seconds_before_release)

            if (chal.seconds_before_release > 0) {
              tree += '{0}<span class="challenge-button future-challenge">{1}: {2}</span>\n'.format(
                  token,
                  chal.name,
                  seconds_before_release
              );
            } else {
              tree += '{1}<a class="challenge-button cursor-pointer" chal-id="{0}" value="{0}">{2}</a>\n'.format(
                  chal.id,
                  token,
                  chal.name
              );
            }
        }
    });

    return tree;
}


function loadchals(cb) {
    $.get(script_root + "/api/v1/challenges", function (response) {
        var categories = {};
        challenges = response.data;

        // $('#challenges-board').empty();
        for (var i = 0; i < challenges.length; i++) {
            var chal = challenges[i];
            if (categories[chal.category] == undefined) {
                categories[chal.category] = [chal]
            } else {
                categories[chal.category].push(chal)
            }
        }

        for (var i = 0; i < categories.length; i++) {
            var category = categories[i];
            category.sort(function (a, b) {
                if (a.value < b.value)
                    return -1;
                if (a.value > b.value)
                    return 1;
                if (a.value == b.value) {
                    if (a.id < b.id) {
                        return -1;
                    } else {
                        return 1;
                    }
                }
                return 0;
            });
        }

        var tree = generate_tree(categories);
        $('#challenges-spinner').remove();

        $('#challenges-pre').html("<pre id='challenges-pre'>" + tree + "</pre>");

        marksolves();

        $('.challenge-button').click(function (e) {
            $('#challenges-pre').addClass('low-res-hide');
            loadchal($(this).attr('chal-id'));
            getsolves($(this).attr('chal-id'));
        });

        if (cb) {
            cb();
        }
    });
}



$('#submit-key').click(function (e) {
    submitkey($('#challenge-id').val(), $('#submission-input').val(), $('#nonce').val())
});

$('.challenge-solves').click(function (e) {
    getsolves($('#challenge-id').val())
});

$('#challenge-window').on('hide.bs.modal', function (event) {
    $("#submission-input").removeClass("wrong");
    $("#submission-input").removeClass("correct");
    $("#incorrect-key").slideUp();
    $("#correct-key").slideUp();
    $("#already-solved").slideUp();
    $("#too-fast").slideUp();
});

var load_location_hash = function () {
    if (window.location.hash.length > 0) {
        loadchalbyname(decodeURIComponent(window.location.hash.substring(1)));
    }
};

function update(cb) {
    load_user_solves(function () { // Load the user's solved challenge ids
        loadchals(function () { //  Load the full list of challenges
            if (cb) {
                cb();
            }
        });
    });
}

$(function () {
    update(function () {
        load_location_hash();
    });
});

$('.nav-tabs a').click(function (e) {
    e.preventDefault();
    $(this).tab('show')
});

$('#challenge-window').on('hidden.bs.modal', function () {
    $('.nav-tabs a:first').tab('show');
    history.replaceState('', document.title, window.location.pathname);
});

setInterval(update, 300000);
