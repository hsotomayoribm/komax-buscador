// Array that contains the collections id.
var COLLECTION_IDS = [
  "e38c0f22-5dfa-006e-0000-0185dc56eadf"
];

//--JQUERY EVENT HANDLER--
//--page ready--
$(document).ready(function () {
  //--FUNCTIONS--
  //--(jquery/DOM reference)--
  function assignClass($this, css_class) {
    if (!$this.hasClass(css_class)) {
      $this.addClass(css_class);
    }
    return $this;
  }

  function removeClass($this, css_class) {
    if ($this.hasClass(css_class)) {
      $this.removeClass(css_class);
    }
    return $this;
  }

  function reveal(id) {
    removeClass($(id), "is-hidden");
  }

  function hide(id) {
    assignClass($(id), "is-hidden");
  }

  function displayError() {
    reveal("#error_message");
    hide("#warning_message");
    hide("#success_message");
    hide("#answers");
  }

  function displayWarning() {
    hide("#error_message");
    reveal("#warning_message");
    hide("#success_message");
    hide("#answers");
  }

  function displaySuccess() {
    hide("#error_message");
    hide("#warning_message");
    reveal("#success_message");
    reveal("#answers");
  }

  function displayNothing() {
    hide("#error_message");
    hide("#warning_message");
    hide("#success_message");
    hide("#answers");
  }

  function reconfig(config) {
    /*--Reset global variable values and redraw page based on config json--*/
    $("div#content_sources").html(
      formatContentSources(config.indexes, config.collection_ids)
    );
    if (config.collection_ids !== undefined) {
      COLLECTION_IDS = config.collection_ids;
    }
    if (config.fields !== undefined) {
      FIELDS = config.fields;
    }
    if (config.max_per_document !== undefined) {
      MAX_PER_DOCUMENT = config.max_per_document;
    }
    if (config.characters !== undefined) {
      CHARACTERS = config.characters;
    }
    if (config.max_answers_per_passage !== undefined) {
      MAX_ANSWERS_PER_PASSAGE = config.max_answers_per_passage;
    }
    if (config.return !== undefined) {
      RETURN = config.return;
    }
    if (config.per_document !== undefined) {
      PER_DOCUMENT = config.per_document;
    }
    if (config.apikey !== undefined) {
      SERVER_PARAMS.apikey = config.apikey;
    }
    if (config.endpoint !== undefined) {
      SERVER_PARAMS.endpoint = config.endpoint;
    }
    if (config.project_id !== undefined) {
      SERVER_PARAMS.project_id = config.project_id;
    }
  }

  function queryDiscovery(question) {
    /*--Invoke Discovery query to get answers--*/
    var client_params = {
      collection_ids: COLLECTION_IDS, //string[]
      filter: undefined, //string
      query: undefined, //string
      natural_language_query: question, //string
      aggregation: undefined, //string
      count: undefined, //integer
      return: RETURN, //string[]
      offset: undefined, //integer
      sort: undefined, //string
      highlight: undefined, //boolean
      spelling_suggestions: undefined, //boolean
      table_results: {
        //object
        enabled: undefined, //boolean
        count: undefined, //integer
      },
      suggested_refinements: {
        //object
        enabled: undefined, //boolean
        count: undefined, //integer
      },
      passages: {
        //object
        enabled: true, //boolean
        per_document: PER_DOCUMENT, //boolean
        max_per_document: MAX_PER_DOCUMENT, //integer
        fields: FIELDS, //string[]
        count: undefined, //integer
        characters: CHARACTERS, //integer
        find_answers: true, //boolean
        max_answers_per_passage: MAX_ANSWERS_PER_PASSAGE, //integer
      },
    };
    var body = {
      client_params: client_params,
      server_params: SERVER_PARAMS,
    };
    var input = $("input#gaama");

    //Visual cue that service call is being made
    assignClass(input, "is-warning");
    console.log("ajax call...");
    $.ajax({
      url: "/query",
      method: "POST",
      data: JSON.stringify(body),
      dataType: "json",
      contentType: "application/json",
      success: function (result, status, jqXHR) {
        //SUCCESSFUL REST CALL PATH
        console.log("success ajax...");
        var payload = JSON.parse(result);
        if (payload.hasOwnProperty("errors")) {
          console.log("'errors' found in payload...");
          console.log(payload.errors);
          displayError();
        } else if (
          (DOC_REF == "results" && !payload.hasOwnProperty("results")) ||
          (DOC_REF == "table_results" &&
            !payload.hasOwnProperty("table_results"))
        ) {
          console.log("incoplete results in payload...");
          console.log(payload);
          displayError();
        } else if (DOC_REF == "results") {
          console.log("Results returned...");
          //console.log(payload);
          var passages = normalizePassages(payload);
          //console.log(passages);
          if (passages.length > 0) {
            var answers = formatPassages(passages);
            displaySuccess();
            $("div#answers").html(answers);
          } else {
            displayWarning();
          }
        } else {
          console.log("Tables returned...");
          console.log(payload);
          var tables = normalizeTables(payload);
          //console.log(tables);
          if (tables.length > 0) {
            var answers = formatTables(tables);
            displaySuccess();
            $("div#answers").html(answers);
          } else {
            displayWarning();
          }
        }
        //Remove visual cue: successful rest call path
        removeClass(input, "is-warning");
      },
      error(jqXHR, textStatus, errorThrown) {
        //FAILED REST CALL PATH
        console.log("error ajax...");
        displayError();
        //Remove visual cue: failed rest call path
        removeClass(input, "is-warning");
      },
    });
  }

  //--QUERY EVENT HANDLERS--
  $(document).on("click", "span.toggle-display", function () {
    /*--Toggle between passage highlight and answer card views--*/
    var icon = $(this).find("svg");
    icon.toggleClass("fa-expand").toggleClass("fa-compress");

    var ancestor = $(this).parent().parent().parent().parent();
    ancestor.find("p.answer_display").toggleClass("is-hidden");
    ancestor.find("p.passage_display").toggleClass("is-hidden");
  });

  $(document).on("click", "span.table-link", function () {
    /*--Display modal window with table html--*/
    var ancestor = $(this).parent().parent().parent().parent();
    var table_html = ancestor.find("div.table_html").html();
    $("div#modal_table_display").html(table_html);
    $("div.modal").addClass("is-active");
  });

  $("button.modal-close").click(function () {
    $("div.modal").removeClass("is-active");
  });

  $("button.delete").click(function () {
    /*--Clear left display or reconfig--*/
    if ($(this).attr("id") == "content_index_button") {
      $("div#content_sources").toggleClass("is-hidden");
      $("div#content_config").toggleClass("is-hidden");
      var config_json = $("textarea#config_json").val().trim();
      if (config_json.length > 0) {
        try {
          var config = JSON.parse(config_json);
          reconfig(config);
        } catch (e) {
          alert(e.message);
        } finally {
          $("textarea#config_json").val("");
        }
      }
    } else {
      displayNothing();
    }
  });

  $(document).on("click", "input[type='checkbox']", function () {
    var id = $(this).attr("id");
    if ($(this).is("[checked]")) {
      $(this).removeAttr("checked");
      var i = COLLECTION_IDS.indexOf(id);
      if (i > -1) {
        COLLECTION_IDS.splice(i, 1);
      }
    } else {
      $(this).attr("checked", "");
      COLLECTION_IDS.push(id);
    }
    if (COLLECTION_IDS.length > 0) {
      $("input#gaama").removeAttr("disabled");
    } else {
      $("input#gaama").attr("disabled", "");
    }
  });

  $("input[type='radio']").click(function () {
    DOC_REF = $(this).attr("id");
  });

  $("#getdiscovery").click(function (e){
    var question = $("input#gaama").val().trim();
    if (question != "") {
      queryDiscovery(question);
      $("#pgbar").css("visibility", "hidden");
    }
  });

  /*function getDiscovery(){
    var question = $("input#gaama").val().trim();
    if (question != "") {
      queryDiscovery(question);
    }
  }*/

  /*$("input#gaama").keypress(function (event) {
    //User presses enter key
    if (event.originalEvent.key == "Enter") {
      //At least one content source is checked
      if ($("div#content_sources").find("input[checked]").length > 0) {
        //Question input is not blank
        var question = $("input#gaama").val().trim();
        if (question != "") {
          queryDiscovery(question);
        }
      }
    }
  });*/

  $(document).on("click", "a.table_facets", function () {
    var panel_tabs = $(this).parent();
    var panel = $(this).parent().parent();
    //set tab focus
    panel_tabs.children().removeClass("is-active");
    $(this).addClass("is-active");
    //display focus panel
    panel.children("div.panel-block").addClass("is-hidden");
    panel.children("div." + $(this).attr("id")).removeClass("is-hidden");
  });
});


