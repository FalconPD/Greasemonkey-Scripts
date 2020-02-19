// ==UserScript==
// @name        Open All Units
// @namespace   Ryan.Tolboom@monroe.k12.nj.us
// @description Adds a link at the top of the page that will open all units in a curriculum
// @include     https://*.rubiconatlas.org/Atlas/Browse/View/UnitCalendar*
// @version     1
// @grant       none
// @require     https://code.jquery.com/jquery-3.2.1.min.js
// ==/UserScript==

var units;
var done;

function incrementStatus() {
  done++;
  $("#openAllUnits").text(done + "/" + units + " loaded");
}

$("<a/>", {
  "id": "openAllUnits",
  "text": "Open All Units",
  "href": '#',
  "click": function() {
    $("div[id^='unit']").remove();
    $("#openAllUnits").text("Loading...");
    $links = $(".unit > a");
    units = $links.length;
    done = 0;
    $("#Atlas_Browse_View_UnitCalendar").css("page-break-after", "always");
    $links.each(function(index) {
      var url = $(this).attr("href");
      var id = "unit" + index;
      var $div = $("<div/>", { "id": id });
      $("#content").append($div);
      $.get(url, function(data) {
        $("#Atlas_Develop_UnitMap_View_Default", $(data))
          .css("page-break-after", "always")
          .appendTo($div);
        incrementStatus();
      });
    });
  }
}).appendTo('#ButtonGroup');
