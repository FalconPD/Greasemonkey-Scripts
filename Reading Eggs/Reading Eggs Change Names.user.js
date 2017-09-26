// ==UserScript==
// @name        Reading Eggs Change Names
// @namespace   Ryan.Tolboom@monroe.k12.nj.us
// @description From the Manage Students view adds an option to replace students whose last name have an underscore in it with a first name that is everything before the underscore and a last name that is everything after.
// @include     https://app.readingeggs.com/re/school/students
// @version     1
// @grant       none
// ==/UserScript==

//How long to wait in between requests in ms
const TIMEOUT_INTERVAL = 100;

var fixable_names = 0;
var data_retrieved = 0;
var successful_changes = 0;

function updateStatus() {
  $('#fixnames').text('Fixable Names: ' + fixable_names +
                      ' Data Retrieved: ' + data_retrieved +
                      ' Successful Changes: ' + successful_changes +
                      ' (refresh page to see changes when done)');
}

//Callback for when we get more info
function parseAndPost(data, postData, id) {
      data_retrieved++;
      updateStatus();

      var $data = $(data); //jquerify the html we got back
      postData.student['grade_position'] = $data.find('#student_grade_position option:selected').val();
      postData.student['school_class_id'] = $data.find('#student_school_class_id option:selected').val();
      postData.student['password'] = $data.find('#student_password').val();
      postData.student['password_confirmation'] = $data.find('#student_password_confirmation').val();
      postData.student['student_id'] = $data.find('#student_student_id').val();

      console.log('Information for POST loaded:');
      console.log(postData);
      var url = 'https://app.readingeggs.com/re/school/students/' + id;
      $.post(url, $.param(postData), function(data) {
        successful_changes++;
        updateStatus();
      });
}

//Add our status / starting DIV
$('div.btn-toolbar').after("<div style='cursor:pointer' id='fixnames'>Click to Fix Names</div>");

//When it's clicked on, start the process
$('#fixnames').click(function () {

  //Only let people click this once, it takes a while
  $('#fixnames').off().css('cursor', 'default');

  //this token seems to be set once when you log in and then
  //you can use it over and over. Without it I imagine requests fail
  var authenticity_token = $("input[name='authenticity_token']:first").val();

  var timeout = 0;
  //Go through each student listed in the manage students table
  $('#manage-entities tbody tr.student').each(function (index) {

    var student_last_name = $(this).children('td.last_name').text();
    if (student_last_name.includes('_')) {

      fixable_names++;
      updateStatus();

      //Object for the data we will eventually urlencode and post
      //I tried to follow the same format the web interface uses
      var postData = {
        utf8: '',
        _method: 'patch',
        authenticity_token: '',
        student: {
          first_name: '',
          last_name: '',
          grade_position: '',
          school_class_id: '',
          login: '',
          password: '',
          password_confirmation: '',
          student_id: ''
        },
        commit: 'Update+Student'
      };
      postData.authenticity_token = authenticity_token;
      split_string = student_last_name.split('_');
      postData.student['first_name'] = split_string[0];
      postData.student['last_name'] = split_string[1];

      console.log('Changing names ' + student_last_name + ' -> ' + 
                  postData.student['first_name'] + ' ' +
                  postData.student['last_name']);

      var id = $(this).attr('id').slice(8); //take off the student_ prefix
                                            //only used for URLs, not postData
      console.log('Reading Eggs ID: ' + id);

      //This stuff we can pull from the table on the main page
      postData.student['login'] = $(this).children('td.login').text();

      //Everything else has to come from the "Edit" page which we pull
      //with a GET request
      console.log("Loading additional info...");
      var url = 'https://app.readingeggs.com/re/school/students/' + id + '/edit';
      //set a timeout so we don't bombard the server with requests
      console.log('Delaying get request by ' + timeout + 'ms');
      setTimeout(function() {
        $.get(url, function (data) {
          parseAndPost(data, postData, id);
        });
        }, timeout);
      timeout += TIMEOUT_INTERVAL;
    }
  });
});
