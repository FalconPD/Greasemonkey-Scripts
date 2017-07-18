// ==UserScript==
// @name        CKEditor Replacement
// @namespace   Ryan.Tolboom@monroe.k12.nj.us
// @description Forces loading custom CKEditor
// @include     https://*.rubiconatlas.org/Atlas/Develop/UnitMap/View/Default*
// @version     1
// @grant       none
// @run-at      document-start
// @noframes
// ==/UserScript==

CKUpdate = {};

/*** Variables ***/
CKUpdate.MathJax = "//cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.1/MathJax.js?config=TeX-AMS_HTML";
CKUpdate.CKEditor = "//cdn.ckeditor.com/4.7.1/standard-all/ckeditor.js";
CKUpdate.blockScripts = ["ckeditor.js", "CKEditorPackage.js"];
CKUpdate.headHTML = 
'  <style>\n' +  
'    .toggleeditor_preview {\n' +
'      cursor: text;\n' +
'      background-color: #FFFFFF;\n' +
'      padding: 10px 5px;\n' +
'      border: 1px solid #000000;\n' +
'      min-height: 72px;\n' +
'      overflow-wrap: break-word;\n' +
'    }\n' +
'    .toggleeditor_preview p {\n' + 
'      margin-bottom: 0;\n' +
'    }\n' +
'  </style>\n' +
'  <script src="' + CKUpdate.MathJax + '">\n' +
'    MathJax.Hub.Config({\n' +
'      tex2jax:{\n' +
'        ignoreClass: "UnitMap",\n' +
'        processClass: "toggleeditor_preview"\n' +
'      },\n' +
'    });\n' +
'  </script>\n' +
'  <script src="' + CKUpdate.CKEditor + '"></script>\n';

/*** Utility functions ***/
CKUpdate.log = function(txt) {
  console.log("CKUpdate: " + txt);
};
CKUpdate.addSpanToMathJax = function(innerHTML) {
  innerHTML = innerHTML.replace("\\(", "<span class=\"math-tex\">\\(");
  innerHTML = innerHTML.replace("\\)", "\\)</span>");
  return innerHTML;
};
//When the user clicks on our preview div, swap the divs and send a click
//event to the original
CKUpdate.previewClick = function(event) {
  var preview = this;
  var original = document.getElementById(preview.dataset.originalId);
  original.style.display = "block";
  preview.style.display = "none"; 
  original.click();
};

/*** Simplified CKEDitorManager class ***/
window.CKEditorManagerInstance = {};

//Destroy the current editor(s) and swap back to the preview div
window.CKEditorManagerInstance.DestroyAll = function() {
  CKUpdate.log("DestroyAll Called");
  var instances = CKEDITOR.instances;
  Object.keys(instances).forEach(function(key) {
    instances[key].destroy();
    var original = document.getElementById(key);
    var preview = document.getElementById(original.dataset.previewId);
    preview.innerHTML = original.innerHTML;
    original.style.display = "none";
    preview.style.display = "block";
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, preview]); 
  });
};
window.CKEditorManagerInstance.GetActiveInstance = function() {
  CKUpdate.log("GetActiveInstance Called");
  var instances = CKEDITOR.instances;
  var last_instance = null;
  Object.keys(instances).forEach(function(key) {
    last_instance = instances[key];
  });
  return last_instance;
};
window.CKEditorManagerInstance.UpdateEditors = function(arg) {
  CKUpdate.log("UpdateEditors Called");
  var instances = CKEDITOR.instances;
  Object.keys(instances).forEach(function(key) {
    instances[key].updateElement();
  });
  return;
};
window.CKEditorManagerInstance.ICPToggleEditor = function(eEditor, iHeight, bScrollTo) {
  CKUpdate.log("ICPToggleEditor Called - eEditor: " + eEditor +
              " iHeight: " + iHeight + " bScrollTo: " + bScrollTo);
  //The Controller strips out our MathJax spans. Add them in again so the editor
  //correctly displays our equations
  eEditor.innerHTML = CKUpdate.addSpanToMathJax(eEditor.innerHTML);
  editor = CKEDITOR.replace(eEditor, {
    startupFocus: true,
    extraPlugins: "mathjax,colorbutton,justify,bidi",
    mathJaxLib: CKUpdate.MathJax,
    removeButtons: "",
    toolbar: [{name: "basicstyles", items: ["Bold", "Italic", "Underline",
                                            "Subscript", "Superscript", "-",
                                            "RemoveFormat"]},
              {name: "paragraph",   items: ["Indent", "Outdent", "BulletedList",
                                            "NumberedList"]},
              {name: "colors",      items: ["TextColor"]},
              {name: "justify",     items: ["JustifyLeft", "JustifyCenter",
                                            "JustifyRight"]},
              {name: "insert",      items: ["SpecialChar", "Mathjax"]},
              {name: "clipboard",   items: ["Undo", "Redo"]},
              {name: "bidi",        items: ["BidiLtr", "BidiRtl"]},
              {name: "document",    items: ["Source"]}]
  });
  editor.on('change', function() {
    var event = new Event('dataavailable');
    event.eventName = "CKEditor:FieldChanged";
    event.memo = {};
    document.dispatchEvent(event);
  });
};
window.CKEditorManagerInstance.GetInstances = function() {
  return CKEDITOR.instances;
};

window.addEventListener('beforescriptexecute',
  function CKEditorReplacementListener(event)
  {
    var originalScript = event.target;
    for (var i = 0; i < CKUpdate.blockScripts.length; i++) {
     if (originalScript.src.indexOf(CKUpdate.blockScripts[i]) >= 0) {
       event.stopPropagation();
       event.preventDefault();
       CKUpdate.log("Blocking script " + originalScript.src);
       CKUpdate.blockScripts.splice(i, 1);
       CKUpdate.blockScripts = newBlockScripts;
       //Not entirely necessary, but if you're looking at the DOM
       //it makes it easier to see what's going on
       originalScript.parentNode.removeChild(originalScript); 
       break;
     }
    }
    if (CKUpdate.blockScripts.length == 0) {
     CKUpdate.log("Removing 'beforescriptexecute' event listener");
     window.removeEventListener('beforescriptexecute', CKEditorReplacementListener);
    }
  }
);      

window.addEventListener("DOMContentLoaded", function(event) {
  CKUpdate.log("DOM content loaded. Adding head html and creating preview divs"); 
  range = document.createRange();
  fragment = range.createContextualFragment(CKUpdate.headHTML);
  document.head.appendChild(fragment);

  //Create preview divs for all the text-entry areas. This keeps
  //us from polluting the data with MathJax HTML, but still allows
  //us to see what the equations look like
  var editors  = document.querySelectorAll(".toggleeditor:not(.View)");
  for (var i = 0; i < editors.length; i++) {
    var original = editors[i];
    var preview = original.cloneNode(true);
    preview.id = original.id + "_preview";
    preview.setAttribute("class", "toggleeditor_preview");
    preview.dataset.originalId = original.id;
    original.dataset.previewId = preview.id;
    original.parentNode.insertBefore(preview, original);
    original.style.display = "none";
    if (window.EditUnitDelegateInstance.IsEditMode()) {
      preview.addEventListener("click", CKUpdate.previewClick);
    } else {
      preview.style.borderColor = "transparent";
    }
  }
});

window.addEventListener("dataavailable", function(event) {
  if (event.eventName == "Switch:changed") {
    CKUpdate.log("Switch changed");
    var previews  = document.querySelectorAll(".toggleeditor_preview");
    for (var i = 0; i < previews.length; i++) {
      if (window.EditUnitDelegateInstance.IsEditMode()) {
        previews[i].addEventListener("click", CKUpdate.previewClick);
        previews[i].style.borderColor = "black";
      } else {
        previews[i].removeEventListener("click", CKUpdate.previewClick);
        previews[i].style.borderColor = "transparent";
      }
    }
  }
});
