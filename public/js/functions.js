//--GLOBAL VARIABLES--
var FIELDS = ["title", "text"];
var MAX_PER_DOCUMENT = 5;
var CHARACTERS = 850;
var MAX_ANSWERS_PER_PASSAGE = 1;
var RETURN = [
  "document_id",
  "extracted_metadata.filename",
  "extracted_metadata.title",
  "metadata.source.url",
];
var PER_DOCUMENT = true;
var SERVER_PARAMS = {};
var DOC_REF = "results";

//--FUNCTIONS--
//--(No jquery/DOM reference)--
function get_context_before(text_before, max) {
  var context_before = "";
  var words = text_before.split(" ");
  for (var i = words.length - 1; i > -1; i--) {
    var pos = words[i].lastIndexOf(/[^ -~]+/g);
    // if ( pos > -1 ) {
    // 	context_before = words[i].slice(pos) + ' ' + context_before;
    // 	break;
    // }
    context_before = words[i] + " " + context_before;
    if (context_before.length > max) {
      break;
    }
  }
  return context_before.trim();
}

function get_context_after(text_after, max) {
  var context_after = "";
  var words = text_after.split(" ");
  for (var i = 0; i < words.length; i++) {
    var pos = words[i].search(/[^ -~]+/g);
    // if ( pos > -1 ) {
    // 	context_after = context_after + ' ' + words[i].slice(0, pos);
    // 	break;
    // }
    context_after = context_after + " " + words[i];
    if (context_after.length > max) {
      break;
    }
  }
  return context_after.trim();
}

function getTextFragmentUrl(
  passage_text,
  passage_start,
  answer_start,
  answer_end
) {
  var text_fragment_urls = [];
  var pos_start = answer_start - passage_start;
  var pos_end = answer_end - passage_start;
  var answer_text = passage_text.slice(pos_start, pos_end);
  //full answer text, no context
  text_fragment_urls.push("#:~:text=" + encodeURIComponent(answer_text));
  //full answer text, with context
  var text_before = passage_text.slice(0, pos_start);
  var text_after = passage_text.slice(pos_end);
  var context_after = get_context_after(text_after, 15);
  var context_before = get_context_before(text_before, 15);
  //text_fragment_urls.push('#:~:text=' + encodeURIComponent(answer_text) + ',-' + encodeURIComponent(context_after));
  text_fragment_urls.push(
    "#:~:text=" +
      encodeURIComponent(context_before) +
      "-," +
      encodeURIComponent(answer_text) +
      ",-" +
      encodeURIComponent(context_after)
  );
  return text_fragment_urls[1];
}

function getTextFragmentUrl_safe(
  passage_text,
  passage_start,
  answer_start,
  answer_end
) {
  getTextFragmentUrls(passage_text, passage_start, answer_start, answer_end);
  /*--wrap tags around answer in passage text--*/
  var pos_start = answer_start - passage_start;
  var pos_end = answer_end - passage_start;
  var answer_text = passage_text.slice(pos_start, pos_end);
  var text_fragment_url = "#:~:text=" + encodeURIComponent(answer_text);
  return text_fragment_url;
}

function highlightAnswer(
  passage_text,
  passage_start,
  answer_start,
  answer_end,
  open,
  closed
) {
  /*--wrap tags around answer in passage text--*/
  var position = answer_end - passage_start;
  var passage_with_highlight = [
    passage_text.slice(0, position),
    closed,
    passage_text.slice(position),
  ].join("");

  position = answer_start - passage_start;
  passage_with_highlight = [
    passage_with_highlight.slice(0, position),
    open,
    passage_with_highlight.slice(position),
  ].join("");

  return passage_with_highlight;
}

function extractAnswer(passage_text, passage_start, answer_start, answer_end) {
  /*--extract answer text from passage text--*/
  return passage_text.slice(
    answer_start - passage_start,
    answer_end - passage_start
  );
}

function normalizePassages(payload) {
  /*--extract and normalize passage values from Discovery REST payload--*/
  function compare(a, b) {
    /*--for sorting--*/
    return b.confidence - a.confidence;
  }

  function stripEmphasis(passage_text) {
    /*--Strip <em> & </em> tags from string--*/
    var splitOpen = passage_text.split("<em>");
    var highlight = splitOpen.join("");
    var splitClosed = highlight.split("</em>");
    var highlight = splitClosed.join("");
    return highlight;
  }
  var passages = [];
  for (i in payload.results) {
    var result = payload.results[i];
    var displayname = "";
    if ("extracted_metadata" in result) {
      var title = result.extracted_metadata.title;
      var filename = result.extracted_metadata.filename;

      /* if (title != "" && title != undefined) {
              displayname = result.extracted_metadata.title;
            } else if (filename != undefined) {
              displayname = result.extracted_metadata.filename;
            } */

      if (filename != "" && filename != undefined) {
        displayname = result.extracted_metadata.filename;
      } else if (title != undefined) {
        displayname = result.extracted_metadata.title;
      }
    }
    var url = "";
    if ("metadata" in result) {
      if ("source" in result.metadata) {
        if ("url" in result.metadata.source) {
          url = result.metadata.source.url;
        }
      }
    }
    console.log(result);
    for (j in result.document_passages) {
      var document_passage = result.document_passages[j];
      var passage_text = document_passage.passage_text;
      var passage_start = document_passage.start_offset;
      var passage_end = document_passage.end_offset;
      var answers = document_passage.answers;
      for (k in answers) {
        var answer = answers[k];
        var answer_text = answer.answer_text;
        var answer_start = answer.start_offset;
        var answer_end = answer.end_offset;
        var confidence = answer.confidence;
        if (answer_text.trim().length > 0) {
          passages.push({
            displayname: displayname,
            url: url + "./media/test.pdf",
            // getTextFragmentUrl(
            //   stripEmphasis(passage_text),
            //   passage_start,
            //   answer_start,
            //   answer_end
            // ),

            passage_text: highlightAnswer(
              stripEmphasis(passage_text),
              passage_start,
              answer_start,
              answer_end,
              '<span class="has-text-link has-background-link-light">',
              "</span>"
            ),
            passage_start: passage_start,
            passage_end: passage_end,
            answer_text: answer_text,
            answer_start: answer_start,
            answer_end: answer_end,
            confidence: confidence,
          });
        }
      }
    }
  }
  passages.sort(compare);
  return passages;
}

function formatContentSources(indexes, collection_ids) {
  /*--dynamically build html for content sources specified in config json--*/
  var content_sources = [];
  var content_source_format =
    '<label class="checkbox">\
	<input type="checkbox" id="[[COLLECTION_ID]]" checked>\
	[[INDEX]]\
</label>\
';
  for (i in indexes) {
    var index = indexes[i];
    var collection_id = collection_ids[i];
    var content_source = content_source_format;
    var content_source = content_source.replace("[[INDEX]]", index);
    var content_source = content_source.replace(
      "[[COLLECTION_ID]]",
      collection_id
    );
    content_sources.push(content_source);
  }
  return content_sources.join("<br>");
}

// TODO
function formatPassages(passages) {
  /*--dynamically build html for answer cards--*/
  var answers = "";
  var answer_format =
    '<div class="box">\
	<article class="media">\
		<div class="media-content">\
			<div class="content">\
				<p class="answer_display is-size-4">\
					[[ANSWER_TEXT]]\
				</p>\
				<p class="passage_display is-size-6 is-hidden">\
					[[PASSAGE_TEXT]]\
				</p>\
			</div>\
			<nav class="level is-mobile">\
				<div class="level-left">\
					<a class="level-item" aria-label="expand">\
						<span class="icon is-small toggle-display">\
							<i class="fas fa-expand" aria-hidden="true"></i>\
						</span>\
					</a>\
					<p class="level-item">\
						<small>\
              <a href="pdf/[[DISPLAY_NAME0]]" target="__blank">[[DISPLAY_NAME]]</a>\
						</small>\
					</p>\
				</div>\
				<div class="level-right">\
					<div class="level-item has-text-centered">\
						<div>\
							<p class="heading">Score</p>\
							<p class="title">[[CONFIDENCE]]</p>\
						</div>\
					</div>\
				</div>\
			</nav>\
		</div>\
	</article>\
</div>\
';
  for (i in passages) {
    var passage = passages[i];
    var answer = answer_format;
    answer = answer.replace("[[TESTA]]", i);
    answer = answer.replace("[[ANSWER_TEXT]]", passage.answer_text);
    answer = answer.replace("[[PASSAGE_TEXT]]", passage.passage_text);
    answer = answer.replace("[[URL]]", passage.url);
    answer = answer.replace("[[DISPLAY_NAME0]]", passage.displayname);
    answer = answer.replace("[[DISPLAY_NAME]]", passage.displayname);
    answer = answer.replace(
      "[[CONFIDENCE]]",
      (passage.confidence * 100).toFixed(1)
    );
    answers = answers + answer;
  }
  return answers;
}

function formatLineItems(values) {
  var line_items = "";
  var line_item_format = '<p class="mb-3">\
	[[TEXT]]\
</p>\
';
  for (i in values) {
    var value = values[i];
    var line_item = line_item_format;
    line_item = line_item.replace("[[TEXT]]", value);
    line_items = line_items + line_item;
  }

  var line_items_format = "<div>\
		[[LINE_ITEMS]]\
	</div>\
";
  return line_items_format.replace("[[LINE_ITEMS]]", line_items);
}

function formatPanelBlocks(table, lists) {
  var panel_blocks = "";
  var panel_block_format =
    '<div class="panel-block [[CLASS]][[IS_HIDDEN]]">\
				[[BLOCK_CONTENT]]\
			</div>\
';
  for (i in lists) {
    var list = lists[i];
    var values = table[list];
    var panel_block = panel_block_format;
    var is_hidden = " is-hidden";
    if (i == 0) {
      is_hidden = "";
    }
    panel_block = panel_block.replace("[[IS_HIDDEN]]", is_hidden);
    panel_block = panel_block.replace("[[CLASS]]", list);
    if (values.length == 0) {
      panel_block = panel_block.replace(
        "[[BLOCK_CONTENT]]",
        "[no values extracted]"
      );
    } else {
      panel_block = panel_block.replace(
        "[[BLOCK_CONTENT]]",
        formatLineItems(values)
      );
    }
    panel_blocks = panel_blocks + panel_block;
  }
  return panel_blocks;
}
